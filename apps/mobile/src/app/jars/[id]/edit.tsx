import { router, Stack, useLocalSearchParams } from "expo-router";
import { EmptyState, ErrorState } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useJars, useUpdateJar } from "@/features/finance/hooks";
import { JarForm } from "@/features/finance/jar-form";

export default function EditJarScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const query = useJars();
  const mutation = useUpdateJar();
  if (query.isLoading) return <LoadingScreen />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  const jar = query.data?.find((item) => item.id === id);
  if (!jar) return <Screen><EmptyState icon="search-off" title="Không tìm thấy hũ" message="Hũ này không còn tồn tại." /></Screen>;
  return (
    <>
      <Stack.Screen options={{ title: "Chỉnh sửa hũ" }} />
      <JarForm shared={jar.isShared} initial={{ name: jar.name, monthlyBudget: jar.monthlyBudget, icon: jar.icon, color: jar.color, alertAt80: jar.alertAt80, rollover: jar.rollover, isSavings: jar.isSavings }} submitLabel="Lưu thay đổi" busy={mutation.isPending} serverError={mutation.error?.message} onSubmit={(value) => mutation.mutate({ id: jar.id, ...value }, { onSuccess: () => router.back() })} />
    </>
  );
}
