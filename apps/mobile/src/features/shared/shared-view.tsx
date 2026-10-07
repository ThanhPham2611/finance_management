import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { IncomingShare, OutgoingShare, SharesOverview } from "@hu/data";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { PrimaryButton } from "@/components/auth-form";
import { Surface, TextButton } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { useCreateShareRequest, useRespondToShare, useRevokeShare } from "@/features/finance/hooks";

const STATUS_LABEL: Record<OutgoingShare["status"], string> = { pending: "Đang chờ", accepted: "Đã chấp nhận", declined: "Đã từ chối", revoked: "Đã hủy" };

export function SharedView({ overview }: { overview: SharesOverview }) {
  const { incoming, accepted, outgoing } = overview;
  return (
    <Screen>
      <Text style={styles.muted}>Chia sẻ toàn bộ chi tiêu cá nhân của bạn cho một người khác. Họ cần chấp nhận mới xem được, và chỉ được xem, không thể sửa hay xóa gì cả.</Text>
      <InviteForm />
      {incoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Lời mời đang chờ bạn</Text>
          {incoming.map((share) => <IncomingRow key={share.id} share={share} />)}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>Đang chia sẻ với tôi</Text>
        {accepted.length === 0 ? <Text style={styles.muted}>Chưa có ai chia sẻ chi tiêu với bạn.</Text> : accepted.map((share) => (
          <Surface key={share.id} style={styles.row}>
            <Avatar name={share.ownerName} />
            <Text numberOfLines={1} style={styles.name}>{share.ownerName}</Text>
            <TextButton label="Xem" icon="chevron-right" onPress={() => router.push({ pathname: "/shared/[ownerId]", params: { ownerId: share.ownerId } })} />
          </Surface>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.eyebrow}>Bạn đang chia sẻ với</Text>
        {outgoing.length === 0 ? <Text style={styles.muted}>Bạn chưa chia sẻ chi tiêu với ai.</Text> : outgoing.map((share) => <OutgoingRow key={share.id} share={share} />)}
      </View>
    </Screen>
  );
}

function Avatar({ name }: { name: string }) {
  return <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>;
}

function InviteForm() {
  const [email, setEmail] = useState("");
  const send = useCreateShareRequest();
  return (
    <Surface style={styles.card}>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Email người bạn muốn chia sẻ</Text>
      <TextInput accessibilityLabel="Email người bạn muốn chia sẻ" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="ban@email.com" placeholderTextColor={lightColors.textMuted} style={styles.input} />
      {send.error ? <Text accessibilityRole="alert" style={styles.error}>{send.error.message}</Text> : null}
      <PrimaryButton disabled={send.isPending || !email.trim()} onPress={() => send.mutate(email, { onSuccess: () => setEmail("") })}>{send.isPending ? "Đang gửi…" : "Gửi lời mời"}</PrimaryButton>
    </Surface>
  );
}

function IncomingRow({ share }: { share: IncomingShare }) {
  const respond = useRespondToShare();
  return (
    <Surface style={styles.card}>
      <View style={styles.rowInner}><Avatar name={share.ownerName} /><Text style={styles.name}>{`${share.ownerName} muốn chia sẻ chi tiêu với bạn`}</Text></View>
      {respond.error ? <Text accessibilityRole="alert" style={styles.error}>{respond.error.message}</Text> : null}
      <PrimaryButton disabled={respond.isPending} onPress={() => respond.mutate({ shareId: share.id, accept: true })}>Chấp nhận</PrimaryButton>
      <TextButton label="Từ chối" onPress={() => !respond.isPending && respond.mutate({ shareId: share.id, accept: false })} />
    </Surface>
  );
}

function OutgoingRow({ share }: { share: OutgoingShare }) {
  const revoke = useRevokeShare();
  return (
    <Surface style={styles.card}>
      <View style={styles.rowInner}>
        <Text numberOfLines={1} style={styles.name}>{share.viewerName}</Text>
        <Text style={styles.muted}>{STATUS_LABEL[share.status]}</Text>
      </View>
      {revoke.error ? <Text accessibilityRole="alert" style={styles.error}>{revoke.error.message}</Text> : null}
      {share.status !== "declined" ? <TextButton label={revoke.isPending ? "Đang hủy…" : "Hủy chia sẻ"} destructive onPress={() => !revoke.isPending && revoke.mutate(share.id)} /> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[2] },
  card: { gap: spacing[3] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] },
  rowInner: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  eyebrow: { color: lightColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  muted: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 22 },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  name: { flex: 1, color: lightColors.text, fontSize: typography.size.body },
  error: { color: lightColors.destructive, fontSize: typography.size.caption },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.body, paddingHorizontal: spacing[3] },
  avatar: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: lightColors.text },
  avatarText: { color: lightColors.background, fontWeight: "700" },
});
