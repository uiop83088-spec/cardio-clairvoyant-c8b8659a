const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-risk`;

export interface ReportRiskResponse {
  riskScore: number | null;
  riskLevel: "low" | "moderate" | "high" | "unknown";
  summary: string;
  source: string;
  raw?: unknown;
}

export async function predictReportRisk(reportText: string): Promise<ReportRiskResponse> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ reportText }),
  });

  const payload = await response.json().catch(() => ({ error: "Invalid server response" }));

  if (!response.ok) {
    throw new Error(payload?.error ?? "Prediction request failed");
  }

  return payload as ReportRiskResponse;
}
