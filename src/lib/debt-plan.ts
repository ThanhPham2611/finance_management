/**
 * Tinh lich tra no (avalanche/snowball) — PURE FUNCTION, khong dung ca o
 * client (xem truoc khi go so) lan server action (neu can). Khong luu
 * ket qua vao DB: lich trinh phu thuoc "so tien tra them moi thang" nguoi
 * dung tu nhap moi lan xem, khong phai 1 con so co dinh nen tinh lai la
 * du, khong can persist.
 */
export type DebtInput = {
  id: string;
  name: string;
  principal: number;
  /** Lai suat NAM, don vi %, vd 18 nghia la 18%/nam. */
  interestRate: number;
  minPayment: number;
};

export type DebtPayoffStrategy = "avalanche" | "snowball";

export type DebtScheduleEntry = {
  id: string;
  name: string;
  /** Thang thu bao nhieu (1-indexed) thi tra het no nay; null neu khong
   * tra het trong gioi han mo phong (khong du tien tra). */
  payoffMonth: number | null;
  totalInterestPaid: number;
};

export type DebtPlanResult = {
  strategy: DebtPayoffStrategy;
  /** Thu tu uu tien don tien tra them vao (id khoan no). */
  order: string[];
  /** Tong so thang de het TAT CA no; null neu khong du tien tra (no khong bao gio het). */
  months: number | null;
  totalInterestPaid: number;
  totalPaid: number;
  schedule: DebtScheduleEntry[];
  insufficientPayment: boolean;
};

// Gioi han vong lap mo phong — 50 nam la qua du cho moi khoan no ca nhan
// thuc te, tranh treo vong lap neu tien tra khong bao gio bu noi lai.
const MAX_MONTHS = 600;
const EPSILON = 0.01;

export function computeDebtPlan(debts: DebtInput[], extraMonthly: number, strategy: DebtPayoffStrategy): DebtPlanResult {
  const active = debts.filter((d) => d.principal > EPSILON);
  if (active.length === 0) {
    return { strategy, order: [], months: 0, totalInterestPaid: 0, totalPaid: 0, schedule: [], insufficientPayment: false };
  }

  const extra = Math.max(0, extraMonthly);

  // avalanche: lai suat cao nhat truoc (tiet kiem tien lai nhat ve tong the).
  // snowball: du no nho nhat truoc (tra het tung khoan nhanh hon, tao dong
  // luc tam ly du co the ton nhieu lai hon avalanche).
  const order = [...active].sort((a, b) => (strategy === "avalanche" ? b.interestRate - a.interestRate : a.principal - b.principal));

  const balances = new Map(active.map((d) => [d.id, d.principal]));
  const interestPaid = new Map(active.map((d) => [d.id, 0]));
  const payoffMonth = new Map<string, number>();

  let month = 0;
  while ([...balances.values()].some((b) => b > EPSILON) && month < MAX_MONTHS) {
    month++;
    let pool = extra;

    // 1. Cong lai thang nay, tra toi thieu cho tung khoan con no.
    for (const d of active) {
      const bal = balances.get(d.id)!;
      if (bal <= EPSILON) continue;
      const interest = (bal * d.interestRate) / 100 / 12;
      interestPaid.set(d.id, interestPaid.get(d.id)! + interest);
      const balAfterInterest = bal + interest;
      const minPay = Math.min(d.minPayment, balAfterInterest);
      balances.set(d.id, balAfterInterest - minPay);
    }

    // 2. Don tien tra them vao khoan uu tien cao nhat con no (waterfall) —
    // het khoan nay moi qua khoan tiep theo trong "order".
    for (const d of order) {
      if (pool <= EPSILON) break;
      const bal = balances.get(d.id)!;
      if (bal <= EPSILON) continue;
      const pay = Math.min(pool, bal);
      balances.set(d.id, bal - pay);
      pool -= pay;
    }

    for (const d of active) {
      if (!payoffMonth.has(d.id) && balances.get(d.id)! <= EPSILON) {
        payoffMonth.set(d.id, month);
      }
    }
  }

  const stillOwing = [...balances.values()].some((b) => b > EPSILON);

  const schedule: DebtScheduleEntry[] = active.map((d) => ({
    id: d.id,
    name: d.name,
    payoffMonth: payoffMonth.get(d.id) ?? null,
    totalInterestPaid: Math.round(interestPaid.get(d.id) ?? 0),
  }));

  const totalInterestPaid = schedule.reduce((s, e) => s + e.totalInterestPaid, 0);
  const totalPrincipal = active.reduce((s, d) => s + d.principal, 0);

  return {
    strategy,
    order: order.map((d) => d.id),
    months: stillOwing ? null : month,
    totalInterestPaid,
    totalPaid: totalPrincipal + totalInterestPaid,
    schedule,
    insufficientPayment: stillOwing,
  };
}
