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

function parseModelApiUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new Error("MEDICAL_MODEL_API_URL is invalid. It must be a full URL like https://api.example.com/predict");
  }

  if (!parsed.protocol || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
    throw new Error("MEDICAL_MODEL_API_URL must start with http:// or https://");
  }

  return parsed.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorization = req.headers.get("authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? "";
    if (!authorization.startsWith("Bearer ") && apikey.length === 0) {
      return new Response(JSON.stringify({ error: "Missing authorization or apikey header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const inputType: InputType | null = body?.inputType === "report" || body?.inputType === "scan" ? body.inputType : null;
    if (!inputType) {
      return new Response(JSON.stringify({ error: "inputType must be 'report' or 'scan'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MEDICAL_MODEL_API_URL = Deno.env.get("MEDICAL_MODEL_API_URL");
    if (!MEDICAL_MODEL_API_URL) {
      throw new Error("MEDICAL_MODEL_API_URL is not configured");
    }

    const MEDICAL_MODEL_API_KEY = Deno.env.get("MEDICAL_MODEL_API_KEY");
    if (!MEDICAL_MODEL_API_KEY) {
      throw new Error("MEDICAL_MODEL_API_KEY is not configured");
    }

    let upstreamPayload: Record<string, unknown>;

    if (inputType === "report") {
      const reportText = typeof body?.reportText === "string" ? body.reportText.trim() : "";

      if (reportText.length < MIN_REPORT_LENGTH || reportText.length > MAX_REPORT_LENGTH) {
        return new Response(
          JSON.stringify({
            error: `Report text must be between ${MIN_REPORT_LENGTH} and ${MAX_REPORT_LENGTH} characters`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      upstreamPayload = {
        modality: "medical_report",
        task: "heart_disease_early_risk",
        report_text: reportText,
      };
    } else {
      const scanBase64 = typeof body?.scanBase64 === "string" ? body.scanBase64.trim() : "";
      const scanFileName = typeof body?.scanFileName === "string" ? body.scanFileName.trim() : "";
      const scanMimeType = typeof body?.scanMimeType === "string" ? body.scanMimeType.trim().toLowerCase() : "";

      if (!scanBase64 || scanBase64.length > MAX_SCAN_BASE64_LENGTH) {
        return new Response(JSON.stringify({ error: "Invalid scan file payload size" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!scanFileName || !hasAllowedExtension(scanFileName)) {
        return new Response(JSON.stringify({ error: "Only .png, .jpg, .jpeg, .dcm, .dicom scan files are allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!ALLOWED_SCAN_MIME_TYPES.includes(scanMimeType)) {
        return new Response(JSON.stringify({ error: "Unsupported scan mime type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      upstreamPayload = {
        modality: "cardiac_scan",
        task: "heart_disease_early_risk_scan",
        scan_image_base64: scanBase64,
        scan_file_name: scanFileName,
        scan_mime_type: scanMimeType,
      };
    }

    const upstreamResponse = await fetch(MEDICAL_MODEL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEDICAL_MODEL_API_KEY}`,
      },
      body: JSON.stringify(upstreamPayload),
    });

    const upstreamBody = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      throw new Error(`Model API request failed [${upstreamResponse.status}]`);
    }

    const parsedRiskScore = Number(upstreamBody?.risk_score);
    const riskScore = Number.isFinite(parsedRiskScore)
      ? Math.max(0, Math.min(1, parsedRiskScore))
      : null;

    const summary =
      typeof upstreamBody?.summary === "string" && upstreamBody.summary.trim().length > 0
        ? upstreamBody.summary.trim().slice(0, 500)
        : "Model response received successfully.";

    return new Response(
      JSON.stringify({
        riskScore,
        riskLevel: normalizeRiskLevel(riskScore),
        summary,
        source: "external-medical-model",
        acceptedInput: inputType,
        raw: upstreamBody,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
