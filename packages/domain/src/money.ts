export function formatMoney(amount: number, locale = "vi-VN"): string {
  return Math.round(amount).toLocaleString(locale);
}

export function formatSignedMoney(amount: number, locale = "vi-VN"): string {
  return amount < 0 ? `−${formatMoney(-amount, locale)}` : formatMoney(amount, locale);
}
