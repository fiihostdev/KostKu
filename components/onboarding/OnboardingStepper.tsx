import Link from "next/link";

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

const steps = [
  { step: 1, title: "Registrasi", href: "/onboarding/step-1" },
  { step: 2, title: "Pilih Paket", href: "/onboarding/step-2" },
  { step: 3, title: "Subdomain", href: "/onboarding/step-3" },
  { step: 4, title: "Pembayaran", href: "/onboarding/step-4" },
];

export default function OnboardingStepper({ currentStep }: StepperProps) {
  return (
    <div className="max-w-3xl mx-auto mb-10">
      {/* Header Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">apartment</span>
          <span className="text-2xl font-bold tracking-tight text-primary">KOSTKU</span>
        </Link>
        <p className="text-xs text-slate-500 mt-1">Multi-Tenant SaaS Onboarding Wizard</p>
      </div>

      {/* Progress Indicators */}
      <div className="skeu-card p-4 rounded-2xl flex items-center justify-between">
        {steps.map((s, idx) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div key={s.step} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isDone
                      ? "bg-emerald-600 text-white shadow-sm"
                      : isCurrent
                      ? "skeu-button text-white shadow-md"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    s.step
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Step 0{s.step}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent ? "text-primary" : "text-slate-700"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-4 h-0.5 bg-slate-300 rounded-full hidden sm:block">
                  <div
                    className={`h-full bg-emerald-500 rounded-full transition-all ${
                      isDone ? "w-full" : "w-0"
                    }`}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

