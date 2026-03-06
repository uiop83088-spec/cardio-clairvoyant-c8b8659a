import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_REPORT_LENGTH = 120;
const MAX_REPORT_LENGTH = 12000;
const MAX_SCAN_BASE64_LENGTH = 14 * 1024 * 1024;
const ALLOWED_SCAN_MIME_TYPES = ["image/png", "image/jpeg", "application/dicom"];
const ALLOWED_SCAN_EXTENSIONS = [".png", ".jpg", ".jpeg", ".dcm", ".dicom"];
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

type InputType = "report" | "scan";

function normalizeRiskLevel(score: number | null): "low" | "moderate" | "high" | "unknown" {
  if (score === null || Number.isNaN(score)) return "unknown";
  if (score < 0.34) return "low";
  if (score < 0.67) return "moderate";
  return "high";
}

function hasAllowedExtension(fileName: string): boolean {
  const normalized = fileName.toLowerCase();
  return ALLOWED_SCAN_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

function clampRiskScore(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : null;
}

function safeSummary(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 500)
    : "Model response received successfully.";
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseToolArguments(gatewayBody: any): { risk_score?: number; summary?: string } {
  const toolArgsRaw = gatewayBody?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolArgsRaw === "string") {
    try {
      return JSON.parse(toolArgsRaw);
    } catch {
      // Continue to fallback
    }
  }

  const contentRaw = gatewayBody?.choices?.[0]?.message?.content;
  if (typeof contentRaw === "string") {
    try {
      return JSON.parse(contentRaw);
    } catch {
      // Ignore fallback parse errors
    }
  }

  return {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authorization = req.headers.get("authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? "";
    if (!authorization.startsWith("Bearer ") && apikey.length === 0) {
      return jsonResponse({ error: "Missing authorization or apikey header" }, 401);
    }

    const body = await req.json();
    const inputType: InputType | null = body?.inputType === "report" || body?.inputType === "scan" ? body.inputType : null;

    if (!inputType) {
      return jsonResponse({ error: "inputType must be 'report' or 'scan'" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userContent: string | Array<Record<string, unknown>>;

    if (inputType === "report") {
      const reportText = typeof body?.reportText === "string" ? body.reportText.trim() : "";

      if (reportText.length < MIN_REPORT_LENGTH || reportText.length > MAX_REPORT_LENGTH) {
        return jsonResponse(
          { error: `Report text must be between ${MIN_REPORT_LENGTH} and ${MAX_REPORT_LENGTH} characters` },
          400,
        );
      }

      userContent = `Input modality: de-identified clinical report text.\n\nReport:\n${reportText}`;
    } else {
      const scanBase64Raw = typeof body?.scanBase64 === "string" ? body.scanBase64.trim() : "";
      const scanFileName = typeof body?.scanFileName === "string" ? body.scanFileName.trim() : "";
      const scanMimeType = typeof body?.scanMimeType === "string" ? body.scanMimeType.trim().toLowerCase() : "";

      if (!scanBase64Raw || scanBase64Raw.length > MAX_SCAN_BASE64_LENGTH) {
        return jsonResponse({ error: "Invalid scan file payload size" }, 400);
      }

      if (!scanFileName || !hasAllowedExtension(scanFileName)) {
        return jsonResponse({ error: "Only .png, .jpg, .jpeg, .dcm, .dicom scan files are allowed" }, 400);
      }

      if (!ALLOWED_SCAN_MIME_TYPES.includes(scanMimeType)) {
        return jsonResponse({ error: "Unsupported scan mime type" }, 400);
      }

      const scanBase64 = scanBase64Raw.includes(",") ? scanBase64Raw.split(",").pop() ?? "" : scanBase64Raw;

      userContent = [
        {
          type: "text",
          text:
            "Input modality: cardiac scan image. Review the image and estimate early heart disease risk using conservative, safety-first reasoning.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${scanMimeType};base64,${scanBase64}`,
          },
        },
      ];
    }

    const gatewayResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are a cautious clinical risk stratification assistant. Produce only a probabilistic early-risk estimate from provided input. Do not diagnose. Return concise, factual medical reasoning.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_risk_assessment",
              description: "Return normalized risk score and concise summary.",
              parameters: {
                type: "object",
                properties: {
                  risk_score: {
                    type: "number",
                    description: "Probability from 0.0 to 1.0.",
                  },
                  summary: {
                    type: "string",
                    description: "Up to 500 characters; concise and clinically neutral.",
                  },
                },
                required: ["risk_score", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: {
            name: "return_risk_assessment",
          },
        },
      }),
    });

    if (!gatewayResponse.ok) {
      if (gatewayResponse.status === 429) {
        return jsonResponse({ error: "Rate limits exceeded, please try again later." }, 429);
      }
      if (gatewayResponse.status === 402) {
        return jsonResponse({ error: "Payment required, please add funds to your Lovable AI workspace." }, 402);
      }

      const errText = await gatewayResponse.text().catch(() => "");
      console.error("AI gateway error:", gatewayResponse.status, errText);
      return jsonResponse({ error: `AI gateway error [${gatewayResponse.status}]` }, 500);
    }

    const gatewayBody = await gatewayResponse.json().catch(() => ({}));
    const structured = parseToolArguments(gatewayBody);

    const riskScore = clampRiskScore(structured?.risk_score);
    const summary = safeSummary(structured?.summary);

    return jsonResponse({
      riskScore,
      riskLevel: normalizeRiskLevel(riskScore),
      summary,
      source: "lovable-ai-gateway",
      acceptedInput: inputType,
      raw: gatewayBody,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
