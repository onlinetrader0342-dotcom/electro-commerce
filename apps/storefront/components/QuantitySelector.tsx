"use client";

/** Quantity stepper used on product pages and the cart. */
export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  small = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
}) {
  const btn = small ? "h-7 w-7 text-sm" : "h-10 w-10 text-lg";
  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-300">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className={`${btn} flex items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40`}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={`${small ? "w-8 text-sm" : "w-12 text-base"} text-center font-semibold`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className={`${btn} flex items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40`}
      >
        +
      </button>
    </div>
  );
}
