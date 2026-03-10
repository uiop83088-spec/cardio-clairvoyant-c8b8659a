# DeepHealthX — Project Review README

## 1) Project Summary
DeepHealthX is a web application for **early heart disease risk stratification** using two de-identified clinical input modes:
- **Report Text** (clinical narratives, ECG interpretation, physician summaries)
- **Scan Image** (PNG, JPG, JPEG, DICOM)

The app returns a normalized risk output with:
- `riskScore` (0.0–1.0)
- `riskLevel` (`low | moderate | high | unknown`)
- concise clinical-style summary text

---

## 2) Purpose and Review Context
This project is designed as a demonstrator for a medical AI workflow:
- collect de-identified cardiology input
- run backend inference safely
- return explainable risk-oriented output for clinician support

> Important: this is a **decision-support prototype**, not a diagnostic tool.

---

## 3) Current Product Scope
### Included
- Single-page landing + inference experience (`/`)
- Multi-modal input selector (report vs scan)
- Client-side and backend validation
- Real backend inference via Lovable AI
- Human-readable risk result card

### Not Included (yet)
- User authentication screens
- Persistent patient/report history in database
- Fine-grained role permissions
- Audit log dashboard
- Clinical performance benchmarking UI

---

## 4) Frontend Stack and Tools
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router
- **UI System:** shadcn-ui components + Radix primitives
- **Styling:** Tailwind CSS with semantic HSL design tokens
- **Validation:** Zod
- **State/Data utilities:** React hooks + TanStack Query (available)
- **Icons:** lucide-react
- **Testing:** Vitest + Testing Library

### Key frontend files
- `src/pages/Index.tsx` — main UI, form handling, prediction flow
- `src/lib/reportRiskApi.ts` — API wrapper to backend function
- `src/components/ui/*` — reusable UI components

---

## 5) Backend Stack and Tools
The backend runs on **Lovable Cloud** with a serverless function:
- `supabase/functions/report-risk/index.ts`

### Backend responsibilities
- validate request payloads
- enforce size/type limits for report and scan inputs
- call Lovable AI Gateway
- normalize model output to stable response format
- return structured JSON for frontend rendering

### Backend AI integration
- **Gateway URL:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Model:** `google/gemini-3-flash-preview`
- **Auth secret used server-side:** `LOVABLE_API_KEY`

---

## 6) Dataset / Data Inputs (What the app expects)
This repository does **not** ship with a static training dataset.
Instead, it processes **runtime user-provided de-identified clinical data**:

1. **Text modality**
   - Type: report text
   - Length: min 120, max 12000 chars
   - Example content: ECG interpretation, physician report, summary notes

2. **Scan modality**
   - Type: base64-encoded file payload
   - Extensions allowed: `.png`, `.jpg`, `.jpeg`, `.dcm`, `.dicom`
   - MIME allowed: `image/png`, `image/jpeg`, `application/dicom`
   - Max payload guardrail enforced in backend

> Data handling expectation: never upload personally identifiable patient information.

---

## 7) How the Model Flow Works (End-to-End)
1. User selects **Report Text** or **Scan Image** in UI.
2. Frontend validates basic constraints (length/file limits).
3. Frontend calls `predictRisk()` (`src/lib/reportRiskApi.ts`).
4. Request is sent to backend function `report-risk`.
5. Backend re-validates input (defense-in-depth).
6. Backend sends structured prompt + tool schema to Lovable AI.
7. AI returns structured arguments:
   - `risk_score` (0–1)
   - `summary`
8. Backend clamps/normalizes output and maps to:
   - `< 0.34` => `low`
   - `< 0.67` => `moderate`
   - `>= 0.67` => `high`
   - invalid/missing => `unknown`
9. Frontend renders risk level, percent, and summary.

---

## 8) API Contract
### Request shapes
```ts
// Report mode
{
  inputType: "report",
  reportText: string
}

// Scan mode
{
  inputType: "scan",
  scanBase64: string,
  scanFileName: string,
  scanMimeType: string
}
```

### Response shape
```ts
{
  riskScore: number | null,
  riskLevel: "low" | "moderate" | "high" | "unknown",
  summary: string,
  source: string,
  acceptedInput: "report" | "scan",
  raw?: unknown
}
```

---

## 9) Security, Validation, and Safety Notes
- Input validation exists in both frontend and backend.
- File type and extension checks are enforced.
- Risk score is clamped into `[0,1]`.
- Summary text is sanitized/truncated to safe length.
- CORS handling is implemented for function requests.
- Medical positioning is cautious: outputs are probabilistic and non-diagnostic.

---

## 10) Local Development
```bash
npm install
npm run dev
```

### Required environment variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Backend runtime secret
- `LOVABLE_API_KEY`

If you run this project outside the managed environment, ensure the backend function and secret configuration are available in your target environment.

---

## 11) Deployment
- Frontend is built with Vite.
- Backend inference uses the `report-risk` serverless function.
- The app should be tested end-to-end in both modes (report + scan) after deployment.

---

## 12) Suggested Review Checklist (for application designer)
- [ ] Verify visual hierarchy and UX clarity on desktop/mobile
- [ ] Verify report mode validation and error messaging
- [ ] Verify scan mode upload constraints and UX
- [ ] Verify successful and failing inference states
- [ ] Verify risk result readability (score + explanation)
- [ ] Verify compliance wording and disclaimer placement

---

## 13) Future Enhancements
- Add authentication and role-based access
- Add persistent case history and filtering
- Add explainability panel with confidence cues
- Add clinician review workflow and exportable reports
- Add analytics dashboard for usage and model feedback loops
