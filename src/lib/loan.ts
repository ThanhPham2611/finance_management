/**
 * Tinh khoan tra gop hang thang cho 1 KHOAN VAY MOI (vd mua xe, mua nha) —
 * khac voi src/lib/debt-plan.ts (mo phong tra cac khoan NO DA CO, uu tien
 * theo avalanche/snowball). O day chi can cong thuc tra gop co dinh chuan
 * (annuity formula) ma ngan hang hay dung: so tien tra DEU nhau moi thang
 * trong suot ky han.
 *
 * Tinh bang CODE (khong nho AI tinh) vi lai kep qua nhieu ky (vd 120
 * thang cho vay 10 nam) la thu LLM de sai/lam tron sai — dung 1 cong thuc
 * xac dinh roi dua ket qua cho AI dien giai/danh gia thi dang tin cay hon
 * nhieu so voi de AI tu nham.
 */
export type LoanEvaluationInput = {
  /** So tien vay goc, VND. */
  principal: number;
  /** Lai suat NAM, don vi %, vd 8 nghia la 8%/nam. */
  annualRatePct: number;
  termMonths: number;
};

export type LoanEvaluationResult = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
};

export function computeLoanAmortization(input: LoanEvaluationInput): LoanEvaluationResult {
  const principal = Math.max(0, input.principal);
  const termMonths = Math.max(1, Math.round(input.termMonths));
  const monthlyRate = Math.max(0, input.annualRatePct) / 100 / 12;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);
  }

  const totalPaid = monthlyPayment * termMonths;
  const totalInterest = totalPaid - principal;

  return {
    monthlyPayment: Math.round(monthlyPayment),
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest),
  };
}
