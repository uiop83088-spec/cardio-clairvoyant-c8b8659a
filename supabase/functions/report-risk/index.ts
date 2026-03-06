import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_REPORT_LENGTH = 120;
const MAX_REPORT_LENGTH = 12000;

function normalizeRiskLevel(score: number | null): "low" | "moderate" | "high" | "unknown" {
  if (score === null || Number.isNaN(score)) return "unknown";
  if (score < 0.34) return "low";
  if (score < 0.67) return "moderate";
  return "high";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const allowedKeys = ["reportText"];
    const receivedKeys = Object.keys(body ?? {});

    if (receivedKeys.some((key) => !allowedKeys.includes(key))) {
      return new Response(
        JSON.stringify({ error: "Only medical report text is accepted. Images/scans are blocked in this endpoint." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    const MEDICAL_MODEL_API_URL = Deno.env.get("MEDICAL_MODEL_API_URL");
    if (!MEDICAL_MODEL_API_URL) {
      throw new Error("MEDICAL_MODEL_API_URL is not configured");
    }

    const MEDICAL_MODEL_API_KEY = Deno.env.get("MEDICAL_MODEL_API_KEY");
    if (!MEDICAL_MODEL_API_KEY) {
      throw new Error("MEDICAL_MODEL_API_KEY is not configured");
    }

    const upstreamResponse = await fetch(MEDICAL_MODEL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEDICAL_MODEL_API_KEY}`,
      },
      body: JSON.stringify({
        report_text: reportText,
        modality: "medical_report",
        task: "heart_disease_early_risk",
      }),
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
