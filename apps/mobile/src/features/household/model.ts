import { vietnamNow } from "@hu/domain";

/** "hh:mm dd/mm" theo giờ Việt Nam từ mốc thời gian ISO (created_at là timestamptz UTC). */
export function formatDateTimeVN(iso: string): string {
  const date = vietnamNow(new Date(iso));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export type ContributionRow = { userId: string; name: string; amount: number; pct: number; isMe: boolean };

/** Ai góp bao nhiêu và bao nhiêu %. Dòng của mình dùng số đang gõ nên thanh/tỷ lệ cập nhật ngay, chưa cần bấm lưu. */
export function contributionRows(contributions: { userId: string; name: string; amount: number }[], myUserId: string, myAmount: number) {
  const amounts = contributions.map((item) => (item.userId === myUserId ? myAmount : item.amount));
  const total = amounts.reduce((sum, value) => sum + value, 0);
  const rows: ContributionRow[] = contributions.map((item, i) => ({ userId: item.userId, name: item.name, amount: amounts[i], pct: total ? Math.round((amounts[i] / total) * 100) : 0, isMe: item.userId === myUserId }));
  return { total, rows };
}
