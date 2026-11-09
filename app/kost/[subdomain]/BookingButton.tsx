"use client";

interface BookingButtonProps {
  waPhone: string;
  message: string;
}

export default function BookingButton({ waPhone, message }: BookingButtonProps) {
  return (
    <button
      onClick={() => window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank")}
      className="skeu-button text-white text-xs font-bold py-2.5 w-full rounded-xl flex items-center justify-center gap-1.5 shadow-md"
    >
      <span className="material-symbols-outlined text-[16px]">chat</span>
      Booking via WhatsApp
    </button>
  );
}
