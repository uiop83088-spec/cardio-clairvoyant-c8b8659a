import {
  Activity,
  ArrowRight,
  BrainCircuit,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import heroImage from "@/assets/deephealthx-hero.jpg";
import { predictRisk, type ReportRiskResponse } from "@/lib/reportRiskApi";

const reportSchema = z.object({
  reportText: z
    .string()
    .trim()
    .min(120, "Medical report must be at least 120 characters")
    .max(12000, "Medical report is too long"),
});

const ALLOWED_SCAN_MIME_TYPES = ["image/png", "image/jpeg", "application/dicom"];
const ALLOWED_SCAN_EXTENSIONS = [".png", ".jpg", ".jpeg", ".dcm", ".dicom"];
const MAX_SCAN_SIZE = 10 * 1024 * 1024;

const pillars = [
  {
    icon: BrainCircuit,
    title: "Multi-modal Intelligence",
    text: "Fuses ECG, echocardiography, labs, and patient history into one clinically useful risk signal.",
  },
  {
    icon: HeartPulse,
    title: "Early Risk Detection",
    text: "Detects subtle cardiac patterns before severe symptoms, enabling earlier intervention windows.",
  },
  {
    icon: ShieldCheck,
    title: "Clinician-First Explainability",
    text: "Shows confidence traces and contributing factors to support transparent, auditable care decisions.",
  },
];

const pipeline = [
  "Ingest ECG, imaging, biomarkers, and notes",
  "Normalize and align signals across modalities",
  "Run ensemble deep-learning inference",
  "Output explainable risk score and care priority",
];

const riskTone: Record<NonNullable<ReportRiskResponse["riskLevel"]>, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  unknown: "Unknown",
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) {
        reject(new Error("Unable to read scan image"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read scan image"));
    reader.readAsDataURL(file);
  });

const hasAllowedScanExtension = (fileName: string) =>
  ALLOWED_SCAN_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));

const Index = () => {
  const [inputType, setInputType] = useState<"report" | "scan">("report");
  const [reportText, setReportText] = useState("");
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportRiskResponse | null>(null);

  const charCount = useMemo(() => reportText.trim().length, [reportText]);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleScanSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setResult(null);

    if (!file) {
      setScanFile(null);
      return;
    }

    if (file.size > MAX_SCAN_SIZE) {
      setScanFile(null);
      setError("Scan file is too large (max 10MB)");
      return;
    }

    if (!hasAllowedScanExtension(file.name)) {
      setScanFile(null);
      setError("Only .png, .jpg, .jpeg, .dcm, .dicom files are allowed");
      return;
    }

    if (!ALLOWED_SCAN_MIME_TYPES.includes(file.type) && file.type !== "") {
      setScanFile(null);
      setError("Unsupported scan file type");
      return;
    }

    setScanFile(file);
  };

  const handlePredict = async () => {
    setError("");
    setResult(null);

    setLoading(true);
    try {
      if (inputType === "report") {
        const parsed = reportSchema.safeParse({ reportText });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid report input");
          return;
        }

        const prediction = await predictRisk({
          inputType: "report",
          reportText: parsed.data.reportText,
        });
        setResult(prediction);
        return;
      }

      if (!scanFile) {
        setError("Please upload a medical scan image file first");
        return;
      }

      const scanBase64 = await fileToBase64(scanFile);
      const prediction = await predictRisk({
        inputType: "scan",
        scanBase64,
        scanFileName: scanFile.name,
        scanMimeType: scanFile.type || "image/jpeg",
      });
      setResult(prediction);
    } catch (predictionError) {
      setError(predictionError instanceof Error ? predictionError.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen pb-16">
      <div className="dx-signature" aria-hidden="true" />

      <section className="dx-shell pt-10 md:pt-16">
        <header className="dx-glass px-6 py-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="dx-signal-dot" aria-hidden="true" />
              <p className="font-display text-xl font-bold">DeepHealthX</p>
            </div>
            <p className="text-sm text-muted-foreground">AI for early heart disease detection</p>
          </div>
        </header>
      </section>

      <section className="dx-shell mt-8 grid items-center gap-10 md:mt-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-7">
          <span className="dx-badge">
            <Activity className="size-4" />
            Deep Learning + Cardiology
          </span>

          <h1 className="dx-title">DEEPHEALTHX Multi-Modal Deep Learning for Early Detection of Heart Disease</h1>

          <p className="dx-subtitle">
            Real model inference supports de-identified report text and medical scan files, with strict validation and
            secure backend processing.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="group" onClick={() => scrollToSection("report-inference")}>
              Request Clinical Demo
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollToSection("model-pipeline")}>
              View Model Pipeline
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="dx-kpi">
              <p className="dx-kpi-value">2</p>
              <p className="dx-kpi-label">Input modes (report + scan)</p>
            </article>
            <article className="dx-kpi">
              <p className="dx-kpi-value">API</p>
              <p className="dx-kpi-label">External medical model</p>
            </article>
            <article className="dx-kpi">
              <p className="dx-kpi-value">XAI</p>
              <p className="dx-kpi-label">Explainable risk outputs</p>
            </article>
          </div>
        </div>

        <figure className="dx-glass dx-grid-bg relative overflow-hidden p-3 md:p-4">
          <img
            src={heroImage}
            alt="Cardiologist using multimodal AI dashboard for early heart disease detection"
            className="h-full min-h-[320px] w-full rounded-xl object-cover animate-drift"
            loading="lazy"
          />
        </figure>
      </section>

      <section id="report-inference" className="dx-shell mt-16 md:mt-20">
        <div className="dx-glass p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <Stethoscope className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold">Clinical Inference</h2>
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <Button
              variant={inputType === "report" ? "default" : "outline"}
              onClick={() => {
                setInputType("report");
                setError("");
                setResult(null);
              }}
            >
              Report Text
            </Button>
            <Button
              variant={inputType === "scan" ? "default" : "outline"}
              onClick={() => {
                setInputType("scan");
                setError("");
                setResult(null);
              }}
            >
              Scan Image
            </Button>
          </div>

          {inputType === "report" ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Paste a de-identified medical report.</p>
              <Textarea
                value={reportText}
                onChange={(event) => setReportText(event.target.value)}
                placeholder="Paste cardiology report, ECG interpretation, or physician summary..."
                className="min-h-40"
              />
              <p className="text-sm text-muted-foreground">{charCount} / 12000 characters (min 120)</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Upload only de-identified cardiac scan files (.png, .jpg, .jpeg, .dcm, .dicom).
              </p>
              <label className="dx-card block cursor-pointer p-4">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
                  <Upload className="size-4" />
                  Select scan file
                </span>
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,.dcm,.dicom,image/png,image/jpeg,application/dicom"
                  onChange={handleScanSelection}
                />
                <span className="mt-2 block text-sm text-muted-foreground">
                  {scanFile ? `Selected: ${scanFile.name}` : "No file selected"}
                </span>
              </label>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={handlePredict} disabled={loading}>
              {loading ? "Analyzing..." : `Run ${inputType === "report" ? "Report" : "Scan"} Prediction`}
            </Button>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}

          {result ? (
            <article className="mt-4 rounded-xl border bg-background/70 p-5">
              <p className="text-sm font-semibold text-primary">Prediction result ({result.acceptedInput})</p>
              <h3 className="mt-2 text-xl font-semibold">
                Risk Level: {riskTone[result.riskLevel]} {typeof result.riskScore === "number" ? `(${Math.round(result.riskScore * 100)}%)` : ""}
              </h3>
              <p className="mt-2 text-muted-foreground">{result.summary}</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="dx-shell mt-16 grid gap-5 md:mt-20 md:grid-cols-3">
        {pillars.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="dx-card">
              <Icon className="mb-4 size-7 text-primary" />
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-muted-foreground">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section id="model-pipeline" className="dx-shell mt-16 md:mt-20">
        <div className="dx-glass p-8 md:p-10">
          <div className="mb-6 flex items-center gap-3">
            <Stethoscope className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold">Inference Pipeline</h2>
          </div>
          <ol className="grid gap-4 md:grid-cols-2">
            {pipeline.map((step, index) => (
              <li key={step} className="rounded-xl border bg-background/70 p-4">
                <p className="text-sm font-semibold text-primary">Step {index + 1}</p>
                <p className="mt-1 text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
};

export default Index;
