import { onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyAllocation,
  applyAutoRollovers,
  createFamilyJar,
  createHouseholdInvite,
  createJars,
  createShareRequest,
  createTransaction,
  deactivateJar,
  deleteTransaction,
  getHouseholdOverview,
  getMyFamilyContributionTotal,
  getMyHousehold,
  getProfile,
  getPendingLeftovers,
  getSharedOwnerOverview,
  getSharesOverview,
  joinHousehold,
  listJarsWithSpent,
  listRecentTransactions,
  listTransactions,
  listTransactionsForJar,
  markTourSeen,
  resolveLeftovers,
  respondToShare,
  revokeShare,
  setContribution,
  setMemberNickname,
  updateJar,
  updateTransaction,
  type ApplyAllocationInput,
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
import { useAuth } from "@/providers/auth-provider";
import { reportsFetchSince } from "../reports/model";
import { mutationBlockedMessage } from "./model";
import { financeInvalidationKeys, financeKeys } from "./query-keys";

export { financeKeys };

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

export function useTransactions(ym?: string) {
  const window = createMonthWindow(ym);
  return useQuery({
    queryKey: [...financeKeys.transactions, window.ym],
    queryFn: () => listTransactions(supabase, window.from, window.to),
  });
}

/** 30 giao dịch gần nhất của 1 hũ. Key nằm dưới financeKeys.transactions nên mọi thao tác ghi đều làm mới nó. */
export function useJarTransactions(jarId: string | undefined) {
  return useQuery({
    queryKey: [...financeKeys.transactions, "jar", jarId],
    queryFn: () => listTransactionsForJar(supabase, jarId!),
    enabled: !!jarId,
  });
}

/** Giao dịch gần nhất (mọi tháng) cho Tổng quan. */
export function useRecentTransactions(limit = 4) {
  return useQuery({ queryKey: [...financeKeys.transactions, "recent", limit], queryFn: () => listRecentTransactions(supabase, limit) });
}

/** Mọi giao dịch từ ngày `from` đến nay, dùng cho biểu đồ chi 7 ngày. */
export function useTransactionsSince(from: string) {
  return useQuery({ queryKey: [...financeKeys.transactions, "since", from], queryFn: () => listTransactions(supabase, from) });
}

/** Hũ không bật rollover còn dư tháng trước, chờ người dùng quyết định (banner Quỹ dư). Lỗi bị bỏ qua: đây là tính năng phụ. */
export function usePendingLeftovers() {
  const userId = useAuth().session?.user.id;
  return useQuery({
    queryKey: [...financeKeys.jars, "pending-leftovers", userId],
    queryFn: () => getPendingLeftovers(supabase, userId!),
    enabled: !!userId,
  });
}

/**
 * Mỗi tháng (mỗi phiên) tự cộng tiền dư tháng trước vào hũ có bật rollover, rồi tải lại hũ để thấy ngân sách mới.
 * Làm bằng query (không phải effect) để react-query chống chạy trùng; thao tác tự khóa nên chạy lại cũng an toàn.
 */
export function useAutoRollover() {
  const client = useQueryClient();
  const userId = useAuth().session?.user.id;
  return useQuery({
    queryKey: ["finance", "rollover", userId, monthStart()],
    enabled: !!userId,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const applied = await applyAutoRollovers(supabase, userId!);
      if (applied > 0) await client.invalidateQueries({ queryKey: financeKeys.jars });
      return applied;
    },
  });
}

export function useResolveLeftovers() {
  const invalidate = useFinanceInvalidation();
  const userId = useAuth().session?.user.id;
  return useMutation({
    mutationFn: async (action: "confirm" | "decline") => {
      requireOnline();
      if (!userId) throw new Error("Bạn cần đăng nhập lại.");
      unwrap(await resolveLeftovers(supabase, userId, action));
    },
    onSuccess: invalidate,
  });
}

/** Tổng mức user cam kết góp vào các hũ gia đình tháng này (trừ khỏi thu nhập khi chia lương). */
export function useFamilyContribution() {
  const userId = useAuth().session?.user.id;
  const month = monthStart();
  return useQuery({
    queryKey: [...financeKeys.jars, "family-contribution", userId, month],
    queryFn: () => getMyFamilyContributionTotal(supabase, userId!, month),
    enabled: !!userId,
  });
}

export function useApplyAllocation() {
  const invalidate = useFinanceInvalidation();
  const userId = useAuth().session?.user.id;
  return useMutation({
    mutationFn: async (input: ApplyAllocationInput) => {
      requireOnline();
      if (!userId) throw new Error("Bạn cần đăng nhập lại.");
      unwrap(await applyAllocation(supabase, userId, input));
    },
    onSuccess: invalidate,
  });
}

/** Thành viên gia đình (để hiện tên người chi ở hũ quỹ chung). Query nhẹ, dùng chung cache giữa các màn hình. */
export function useHouseholdMembers() {
  const userId = useAuth().session?.user.id;
  return useQuery({ queryKey: [...financeKeys.jars, "household-members", userId], queryFn: () => getMyHousehold(supabase, userId!), enabled: !!userId });
}

/** Mọi thứ trang Gia đình cần: thành viên, hũ gia đình kèm phần góp, lần chi gần nhất. */
export function useHouseholdOverview() {
  const userId = useAuth().session?.user.id;
  const month = monthStart();
  return useQuery({ queryKey: [...financeKeys.jars, "household", userId, month], queryFn: () => getHouseholdOverview(supabase, userId!), enabled: !!userId });
}

/** Tạo mã mời: chỉ sinh mã, không đổi dữ liệu nào đang hiển thị nên không cần làm mới query. */
export function useCreateInvite() {
  return useMutation({
    mutationFn: async () => {
      requireOnline();
      const result = await createHouseholdInvite(supabase);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useJoinHousehold() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (code: string) => {
      requireOnline();
      unwrap(await joinHousehold(supabase, code));
    },
    onSuccess: invalidate,
  });
}

export function useSetNickname() {
  const invalidate = useFinanceInvalidation();
  return useMutation({
    mutationFn: async (input: { memberId: string; nickname: string }) => {
      requireOnline();
      unwrap(await setMemberNickname(supabase, input.memberId, input.nickname));
    },
    onSuccess: invalidate,
  });
}

export function useCreateFamilyJar() {
  const invalidate = useFinanceInvalidation();
  const userId = useAuth().session?.user.id;
  return useMutation({
    mutationFn: async (name: string) => {
      requireOnline();
      if (!userId) throw new Error("Bạn cần đăng nhập lại.");
      unwrap(await createFamilyJar(supabase, userId, { name }));
    },
    onSuccess: invalidate,
  });
}

export function useSetContribution() {
  const invalidate = useFinanceInvalidation();
  const userId = useAuth().session?.user.id;
  return useMutation({
    mutationFn: async (input: { jarId: string; amount: number }) => {
      requireOnline();
      if (!userId) throw new Error("Bạn cần đăng nhập lại.");
      unwrap(await setContribution(supabase, userId, input.jarId, input.amount));
    },
    onSuccess: invalidate,
  });
}

export function useSharesOverview() {
  const userId = useAuth().session?.user.id;
  return useQuery({ queryKey: [...financeKeys.shares, userId], queryFn: () => getSharesOverview(supabase, userId!), enabled: !!userId });
}

/** Hũ + giao dịch tháng này của người đã chia sẻ cho mình; null nếu chưa/không còn được chia sẻ. */
export function useSharedOwner(ownerId: string | undefined) {
  const userId = useAuth().session?.user.id;
  return useQuery({ queryKey: [...financeKeys.shares, "owner", ownerId], queryFn: () => getSharedOwnerOverview(supabase, ownerId!, userId!), enabled: !!userId && !!ownerId });
}

function useSharesMutation<TInput>(run: (input: TInput) => ReturnType<typeof createShareRequest>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => {
      requireOnline();
      unwrap(await run(input));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: financeKeys.shares }),
  });
}

export function useCreateShareRequest() {
  return useSharesMutation((email: string) => createShareRequest(supabase, email));
}

export function useRespondToShare() {
  return useSharesMutation((input: { shareId: string; accept: boolean }) => respondToShare(supabase, input.shareId, input.accept));
}

export function useRevokeShare() {
  return useSharesMutation((shareId: string) => revokeShare(supabase, shareId));
}

/** Hồ sơ (tên, đã xem hướng dẫn chưa). Không nằm dưới khóa jars/transactions: không đổi khi ghi giao dịch. */
export function useProfile() {
  const userId = useAuth().session?.user.id;
  return useQuery({ queryKey: ["finance", "profile", userId], queryFn: () => getProfile(supabase, userId!), enabled: !!userId });
}

export function useMarkTourSeen() {
  const client = useQueryClient();
  const userId = useAuth().session?.user.id;
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Bạn cần đăng nhập lại.");
      unwrap(await markTourSeen(supabase, userId));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["finance", "profile"] }),
  });
}

export function useReportTransactions() {
  const since = reportsFetchSince();
  return useQuery({
    queryKey: [...financeKeys.reports, since],
    queryFn: () => listTransactions(supabase, since),
  });
}

function useFinanceInvalidation() {
  const client = useQueryClient();
  return () => Promise.all(financeInvalidationKeys.map((queryKey) => client.invalidateQueries({ queryKey })));
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
