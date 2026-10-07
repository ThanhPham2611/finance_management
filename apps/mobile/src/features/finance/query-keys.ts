export const financeKeys = {
  jars: ["finance", "jars"] as const,
  transactions: ["finance", "transactions"] as const,
  reports: ["finance", "reports"] as const,
  // Chia sẻ chi tiêu tách riêng: không phụ thuộc hũ/giao dịch của mình nên không nằm trong financeInvalidationKeys.
  shares: ["finance", "shares"] as const,
};

export const financeInvalidationKeys = [financeKeys.jars, financeKeys.transactions, financeKeys.reports] as const;
