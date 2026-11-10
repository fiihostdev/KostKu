"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger:  { icon: "delete_forever", iconBg: "bg-red-100 text-red-600", btn: "bg-red-600 hover:bg-red-500 text-white" },
    warning: { icon: "warning",        iconBg: "bg-amber-100 text-amber-600", btn: "bg-amber-500 hover:bg-amber-400 text-white" },
    primary: { icon: "help",           iconBg: "bg-primary/10 text-primary",  btn: "skeu-button text-white" },
  };

  const v = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="skeu-card p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fadeInUp">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl ${v.iconBg} flex items-center justify-center mx-auto mb-4`}>
          <span className="material-symbols-outlined text-[28px]">{v.icon}</span>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-base font-black text-slate-900 mb-1.5">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 skeu-button-secondary py-2.5 rounded-xl text-xs font-bold"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${v.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
