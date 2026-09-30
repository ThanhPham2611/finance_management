import { onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createJars,
  createTransaction,
  deactivateJar,
  deleteTransaction,
  listJarsWithSpent,
  listTransactions,
  updateJar,
  updateTransaction,
} from "@hu/data";
import {
  createMonthWindow,
  vietnamNow,
  type CreateJarInput,
  type CreateTransactionInput,
  type UpdateJarInput,
  type UpdateTransactionInput,
} from "@hu/domain";
import { supabase } from "@/lib/supabase";
import { mutationBlockedMessage } from "./model";

export const financeKeys = {
  jars: ["finance", "jars"] as const,
  transactions: ["finance", "transactions"] as const,
};

function monthStart() {
  const now = vietnamNow();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function requireOnline() {
  const message = mutationBlockedMessage(onlineManager.isOnline());
  if (message) throw new Error(message);
}

function unwrap(result: Awaited<ReturnType<typeof createTransaction>>) {
  if (result.error) throw new Error(result.error.message);
}

export function useJars() {
  return useQuery({ queryKey: financeKeys.jars, queryFn: () => listJarsWithSpent(supabase, monthStart()) });
}

export function useTransactions() {
  const window = createMonthWindow(undefined);
  return useQuery({
    queryKey: [...financeKeys.transactions, window.ym],
    queryFn: () => listTransactions(supabase, window.from, window.to),
  });
}

function useFinanceInvalidation() {
  const client = useQueryClient();
  return () => Promise.all([client.invalidateQueries({ queryKey: financeKeys.jars }), client.invalidateQueries({ queryKey: financeKeys.transactions })]);
}

export function useCreateJars() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (inputs: CreateJarInput[]) => {
      requireOnline();
      unwrap(await createJars(supabase, inputs));
    },
    onSuccess: invalidate,
  });
}

export function useUpdateJar() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (input: UpdateJarInput) => {
      requireOnline();
      unwrap(await updateJar(supabase, input));
    },
    onSuccess: invalidate,
  });
}

export function useDeactivateJar() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (jarId: string) => {
      requireOnline();
      unwrap(await deactivateJar(supabase, jarId));
    },
    onSuccess: invalidate,
  });
}

export function useCreateTransaction() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      requireOnline();
      unwrap(await createTransaction(supabase, input));
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (input: UpdateTransactionInput) => {
      requireOnline();
      unwrap(await updateTransaction(supabase, input));
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (transactionId: string) => {
      requireOnline();
      unwrap(await deleteTransaction(supabase, transactionId));
    },
    onSuccess: invalidate,
  });
}
