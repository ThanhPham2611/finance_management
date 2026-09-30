import { router, Stack } from "expo-router";
import { JarForm } from "@/features/finance/jar-form";
import { useCreateJars } from "@/features/finance/hooks";

export default function NewJarScreen() {
  const mutation = useCreateJars();
  return (
    <>
      <Stack.Screen options={{ title: "Tạo hũ mới" }} />
      <JarForm submitLabel="Tạo hũ" busy={mutation.isPending} serverError={mutation.error?.message} onSubmit={(value) => mutation.mutate([value], { onSuccess: () => router.back() })} />
    </>
  );
}
