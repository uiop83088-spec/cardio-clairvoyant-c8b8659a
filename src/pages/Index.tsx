import {
  Activity,
  ArrowRight,
  BrainCircuit,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/deephealthx-hero.jpg";

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

const Index = () => {
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
            A clinical intelligence layer that reads complex heart signals from multiple modalities and flags high-risk
            patients earlier, with explainable outputs designed for real hospital workflows.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="group">
              Request Clinical Demo
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline">
              View Model Pipeline
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="dx-kpi">
              <p className="dx-kpi-value">4</p>
              <p className="dx-kpi-label">Data modalities fused</p>
            </article>
            <article className="dx-kpi">
              <p className="dx-kpi-value">Early</p>
              <p className="dx-kpi-label">Signal-stage detection</p>
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

      <section className="dx-shell mt-16 md:mt-20">
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
