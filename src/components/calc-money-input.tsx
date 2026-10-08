"use client";

import { useState } from "react";
import { amountFromExpression, evaluateExpression, formatExpression, isCalculation, sanitizeExpression } from "@hu/domain";
import { formatVND } from "@/lib/format";

const KEYS = [
  { symbol: "+", shown: "+", label: "Dấu +" },
  { symbol: "-", shown: "−", label: "Dấu −" },
  { symbol: "*", shown: "×", label: "Dấu ×" },
  { symbol: "/", shown: "÷", label: "Dấu ÷" },
  { symbol: "k", shown: "k", label: "Nghìn (k)" },
  { symbol: "tr", shown: "tr", label: "Triệu (tr)" },
] as const;

/**
 * Ô số tiền kiểu máy tính: gõ `50000*2+1000`, `50k`, `2tr5` rồi xem kết quả ngay bên dưới; Enter hoặc nút `=` chốt thành một con số.
 * Với số thường vẫn hiện dấu chấm nghìn như MoneyInput. `onChange` luôn nhận số tiền hợp lệ (> 0), còn lại là 0.
 * Hàng nút phép tính chỉ hiện trên điện thoại (bàn phím số của điện thoại không có + − × ÷ k tr).
 */
export function CalcMoneyInput({
  value,
  onChange,
  className = "",
  ...props
}: {
  value: number;
  onChange: (amount: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(value ? String(value) : "");
  const [seen, setSeen] = useState(value);

  // Cha đặt lại số tiền (Xoá, Nhập tiếp...) thì bỏ luôn biểu thức đang gõ.
  if (value !== seen) {
    setSeen(value);
    if (value !== amountFromExpression(text)) setText(value ? String(value) : "");
  }

  function edit(next: string) {
    const raw = sanitizeExpression(next);
    setText(raw);
    onChange(amountFromExpression(raw));
  }

  const result = evaluateExpression(text);
  const settle = () => {
    if (result !== null && result > 0) edit(String(result));
  };

  return (
    <div className="min-w-0 flex-1">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatExpression(text)}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && isCalculation(text)) {
            e.preventDefault();
            settle();
          }
        }}
        className={className}
        {...props}
      />
      {isCalculation(text) && (
        <div data-testid="calc-result" aria-live="polite" className="mt-1.5 text-sm tabular-nums" style={{ color: result !== null && result > 0 ? "var(--color-green-ink)" : "var(--color-accent-700)" }}>
          {result === null ? "Phép tính chưa hoàn chỉnh" : result > 0 ? `= ${formatVND(result)}` : "Kết quả phải lớn hơn 0"}
        </div>
      )}
      <div className="mt-2 flex gap-2 md:hidden">
        {KEYS.map((key) => (
          <button key={key.symbol} type="button" aria-label={key.label} onPointerDown={(e) => e.preventDefault()} onClick={() => edit(text + key.symbol)} className="btn btn-secondary h-10 flex-1 justify-center p-0 text-lg">
            {key.shown}
          </button>
        ))}
        <button type="button" aria-label="Dấu =" onPointerDown={(e) => e.preventDefault()} onClick={settle} className="btn btn-secondary h-10 flex-1 justify-center p-0 text-lg">
          =
        </button>
      </div>
    </div>
  );
}
