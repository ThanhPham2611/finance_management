import { Stack, useLocalSearchParams } from "expo-router";
import { EmptyState, ErrorState } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useSharedOwner } from "@/features/finance/hooks";
import { SharedOwnerView } from "@/features/shared/owner-view";

export default function SharedOwnerScreen() {
  const params = useLocalSearchParams<{ ownerId: string }>();
  const ownerId = Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId;
  const query = useSharedOwner(ownerId);
  if (query.isLoading) return <LoadingScreen />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  if (!query.data) return <Screen><EmptyState icon="visibility-off" title="Không xem được" message="Người này chưa chia sẻ chi tiêu với bạn, hoặc đã hủy chia sẻ." /></Screen>;
  return (
    <>
      <Stack.Screen options={{ title: query.data.ownerName }} />
      <SharedOwnerView data={query.data} />
    </>
  );
}
