import { z } from "zod";

const uuid = z.string().uuid();
const money = z.number().finite().positive().max(999_999_999_999.99);
const nonNegativeMoney = z.number().finite().min(0).max(999_999_999_999.99);
const transactionType = z.enum(["expense", "deposit"]);
const date = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }, "Ngày không hợp lệ");
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const transactionFields = {
  jarId: uuid,
  amount: money,
  note: z.string().trim().max(500).default(""),
  type: transactionType.default("expense"),
  transactionDate: date.optional(),
};

export const createTransactionInputSchema = z.object(transactionFields);

export const updateTransactionInputSchema = z.object({
  ...transactionFields,
  id: uuid,
  transactionDate: date,
});

const jarFields = {
  name: z.string().trim().min(1).max(80),
  monthlyBudget: nonNegativeMoney,
  icon: z.string().trim().min(1).max(64).default("wallet"),
  color: color.default("#A16207"),
  alertAt80: z.boolean().default(true),
  rollover: z.boolean().default(false),
  isSavings: z.boolean().default(false),
};

function requireSavingsRollover(value: { isSavings: boolean; rollover: boolean }, context: z.core.$RefinementCtx) {
  if (value.isSavings && !value.rollover) {
    context.addIssue({ code: "custom", path: ["rollover"], message: "Hũ tiết kiệm phải bật cộng dồn." });
  }
}

export const createJarInputSchema = z.object(jarFields).superRefine(requireSavingsRollover);

export const updateJarInputSchema = z
  .object({
    id: uuid,
    name: z.string().trim().min(1).max(80),
    monthlyBudget: nonNegativeMoney,
    icon: z.string().trim().min(1).max(64).optional(),
    color: color.optional(),
    alertAt80: z.boolean(),
    rollover: z.boolean(),
    isSavings: z.boolean(),
  })
  .superRefine(requireSavingsRollover);

export type CreateTransactionInput = z.input<typeof createTransactionInputSchema>;
export type UpdateTransactionInput = z.input<typeof updateTransactionInputSchema>;
export type CreateJarInput = z.input<typeof createJarInputSchema>;
export type UpdateJarInput = z.input<typeof updateJarInputSchema>;
