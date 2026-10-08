import { totalBudget, totalSpent } from "./jars";
import type { Jar } from "./types";

/** Dưới ngưỡng này (số ngày đã qua trong tháng) chưa đủ dữ liệu để chấm tốc độ chi — cùng ngưỡng với dự báo vượt hũ. */
const MIN_DAYS = 3;
/** Chi TB/ngày từ 90% mức cho phép trở lên thì báo "sát ngưỡng". */
const WATCH_RATIO = 0.9;

export type SpendingPaceStatus = "none" | "early" | "good" | "watch" | "over";

export type SpendingPace = {
  status: SpendingPaceStatus;
  /** Ngân sách các hũ chi tiêu chia đều cho cả tháng. */
  dailyBudget: number;
  /** Đã chi chia cho số ngày đã qua (tính cả hôm nay). */
  dailyAverage: number;
  /** Từ hôm nay đến cuối tháng, mỗi ngày được chi tối đa bao nhiêu để không vượt (0 nếu đã hết). */
  dailyAllowed: number;
  /** Cuối tháng sẽ vượt bao nhiêu nếu giữ tốc độ hiện tại. */
  projectedOver: number;
};

/** Hũ tiết kiệm không tính: đó không phải tiền để chi. */
export function calculateSpendingPace(jars: Jar[], now: Date): SpendingPace {
  const spendable = jars.filter((jar) => !jar.isSavings);
  const budget = totalBudget(spendable);
  const spent = totalSpent(spendable);
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyBudget = budget / daysInMonth;
  const dailyAverage = spent / day;
  const projectedOver = Math.max(0, dailyAverage * daysInMonth - budget);
  const dailyAllowed = Math.max(0, budget - spent) / (daysInMonth - day + 1);

  const status: SpendingPaceStatus =
    budget <= 0 ? "none" : day < MIN_DAYS ? "early" : dailyAverage > dailyBudget ? "over" : dailyAverage >= dailyBudget * WATCH_RATIO ? "watch" : "good";
  return { status, dailyBudget, dailyAverage, dailyAllowed, projectedOver };
}

export type PaceMessage = { tone: "neutral" | "good" | "warn" | "danger"; title: string; detail: string };

/** Lời giải thích hiển thị cho Tổng quan; dùng chung web/mobile để hai bên không lệch câu chữ. `money` đã gồm đơn vị. */
export function paceMessage(pace: SpendingPace, money: (value: number) => string): PaceMessage | null {
  const { dailyBudget, dailyAverage, dailyAllowed, projectedOver } = pace;
  const limit = `${money(dailyBudget)}/ngày`;
  const average = `${money(dailyAverage)}/ngày`;
  const advice = dailyAllowed > 0 ? `Từ giờ chỉ nên chi tối đa ${money(dailyAllowed)}/ngày.` : "Ngân sách tháng này đã hết.";
  switch (pace.status) {
    case "none":
      return null;
    case "early":
      return { tone: "neutral", title: `Mỗi ngày được chi ~${limit}`, detail: "Cần thêm vài ngày dữ liệu để đánh giá tốc độ chi tiêu." };
    case "good":
      return { tone: "good", title: "Tốc độ chi tiêu ổn", detail: `Các hũ cho phép ${limit}, bạn đang chi trung bình ${average}. Từ giờ có thể chi tối đa ${money(dailyAllowed)}/ngày.` };
    case "watch":
      return { tone: "warn", title: "Sắp chạm ngưỡng", detail: `Các hũ cho phép ${limit}, bạn đang chi trung bình ${average} — sát mức cho phép. ${advice}` };
    case "over":
      return { tone: "danger", title: "Đang chi nhanh hơn ngân sách", detail: `Các hũ chỉ cho phép ${limit} nhưng bạn chi trung bình ${average}. Giữ tốc độ này, cuối tháng sẽ vượt ~${money(projectedOver)}. ${advice}` };
  }
}

/** Tỉ trọng (%) của một hũ trong tổng ngân sách mọi hũ; làm tròn số nguyên như chú giải biểu đồ. */
export function budgetShare(jar: Pick<Jar, "monthlyBudget">, total: number): number {
  return total > 0 ? Math.round((jar.monthlyBudget / total) * 100) : 0;
}
