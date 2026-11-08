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
    <div className="max-w-3xl mx-auto mb-8 sm:mb-10 w-full px-2">
      {/* Header Logo */}
      <div className="text-center mb-6 sm:mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl skeu-card flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-[22px]">apartment</span>
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight text-primary">KOSTKU</span>
        </Link>
        <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Multi-Tenant SaaS Onboarding Wizard</p>
      </div>

      {/* Progress Indicators */}
      <div className="skeu-card p-3 sm:p-4 rounded-2xl flex items-center justify-between shadow-sm">
        {steps.map((s, idx) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div key={s.step} className="flex items-center flex-1 last:flex-none justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
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
                <div className="hidden md:block">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                    Step 0{s.step}
                  </span>
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-primary" : "text-slate-700"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4 h-0.5 bg-slate-300 rounded-full">
                  <div
                    className={`h-full bg-emerald-500 rounded-full transition-all duration-300 ${
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
