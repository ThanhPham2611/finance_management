import { useState } from "react";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { MAX_HOUSEHOLD_MEMBERS, memberLabel, type HouseholdMember, type HouseholdOverview, type FamilyJarView } from "@hu/data";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { FormError, PrimaryButton } from "@/components/auth-form";
import { Surface, TextButton } from "@/components/finance-ui";
import { JarIcon } from "@/components/jar-icon";
import { Screen } from "@/components/screen";
import { useCreateFamilyJar, useCreateInvite, useDeactivateJar, useJoinHousehold, useSetContribution, useSetNickname } from "@/features/finance/hooks";
import { amountFromText } from "@/features/finance/model";
import { contributionRows, formatDateTimeVN } from "./model";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

export function HouseholdView({ overview, myUserId }: { overview: HouseholdOverview; myUserId: string }) {
  const { household, familyJars, lastSpendByUser } = overview;
  const members = household?.members ?? [{ userId: myUserId, name: "Bạn", nickname: null, isMe: true }];
  const isFull = members.length >= MAX_HOUSEHOLD_MEMBERS;

  return (
    <Screen>
      <Text style={styles.muted}>Quản lý thành viên và các hũ quỹ chung.</Text>
      <Surface style={styles.card}>
        <Text style={styles.eyebrow}>Thành viên</Text>
        {members.map((member) => <MemberRow key={member.userId} member={member} lastSpendAt={lastSpendByUser[member.userId]} editable={!!household} />)}
        {!isFull ? <Text style={styles.muted}>{household ? `Còn ${MAX_HOUSEHOLD_MEMBERS - members.length} chỗ trống (tối đa ${MAX_HOUSEHOLD_MEMBERS} người).` : `Bạn chưa có gia đình nào, tạo mã mời để bắt đầu (tối đa ${MAX_HOUSEHOLD_MEMBERS} người).`}</Text> : null}
      </Surface>
      {isFull ? <Text accessibilityRole="alert" style={styles.ok}>{`Gia đình đã đủ ${MAX_HOUSEHOLD_MEMBERS} thành viên.`}</Text> : <InviteJoin />}
      {household ? <FamilyJars familyJars={familyJars} myUserId={myUserId} /> : null}
    </Screen>
  );
}

function MemberRow({ member, lastSpendAt, editable }: { member: HouseholdMember; lastSpendAt?: string; editable: boolean }) {
  const save = useSetNickname();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(member.nickname ?? "");

  return (
    <View style={styles.member}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.flex}>
        {editing ? (
          <>
            <TextInput accessibilityLabel="Biệt danh" autoFocus maxLength={30} value={nickname} onChangeText={setNickname} placeholder="VD: vợ, chồng, bố…" placeholderTextColor={lightColors.textMuted} style={styles.input} />
            {save.error ? <Text style={styles.error}>{save.error.message}</Text> : null}
            <View style={styles.row}>
              <PrimaryButton disabled={save.isPending} onPress={() => save.mutate({ memberId: member.userId, nickname }, { onSuccess: () => setEditing(false) })}>{save.isPending ? "Đang lưu…" : "Lưu"}</PrimaryButton>
              <TextButton label="Hủy" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            <Text numberOfLines={1} style={styles.memberName}>{memberLabel(member)}</Text>
            {editable ? <Pressable accessibilityRole="button" onPress={() => setEditing(true)}><Text style={styles.link}>{member.nickname ? "Sửa biệt danh" : "Đặt biệt danh"}</Text></Pressable> : null}
          </>
        )}
        {lastSpendAt ? <Text style={styles.muted}>{`Chi gần nhất: ${formatDateTimeVN(lastSpendAt)}`}</Text> : null}
      </View>
    </View>
  );
}

function InviteJoin() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const invite = useCreateInvite();
  const join = useJoinHousehold();

  return (
    <Surface style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={styles.toggle}>
        <Text style={styles.sectionTitle}>Mời hoặc tham gia gia đình</Text>
        <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={open ? "expand-less" : "expand-more"} size={24} color={lightColors.textMuted} />
      </Pressable>
      {open ? (
        <>
          <Text style={styles.label}>Mời người thân</Text>
          <Text style={styles.muted}>Tạo mã mời rồi gửi cho người thân (qua Zalo, tin nhắn…). Mã dùng được trong 7 ngày.</Text>
          {invite.data ? (
            <>
              <Text accessibilityLabel={`Mã mời ${invite.data.code}`} style={styles.code}>{invite.data.code}</Text>
              <TextButton label="Chia sẻ mã" icon="share" onPress={() => void Share.share({ message: `Mã mời tham gia gia đình trên Hũ: ${invite.data!.code} (dùng được trong 7 ngày).` })} />
            </>
          ) : <PrimaryButton disabled={invite.isPending} onPress={() => invite.mutate()}>{invite.isPending ? "Đang tạo…" : "Tạo mã mời"}</PrimaryButton>}
          {invite.error ? <Text style={styles.error}>{invite.error.message}</Text> : null}

          <View style={styles.divider} />
          <Text style={styles.label}>Có mã mời từ người thân?</Text>
          <Text style={styles.muted}>Nhập mã họ gửi cho bạn để tham gia gia đình của họ.</Text>
          <TextInput accessibilityLabel="Mã mời" autoCapitalize="characters" autoCorrect={false} maxLength={8} value={code} onChangeText={setCode} placeholder="VD: A1B2C3D4" placeholderTextColor={lightColors.textMuted} style={[styles.input, styles.codeInput]} />
          <PrimaryButton disabled={join.isPending || !code.trim()} onPress={() => join.mutate(code, { onSuccess: () => setCode("") })}>{join.isPending ? "Đang tham gia…" : "Tham gia"}</PrimaryButton>
          {join.error ? <Text style={styles.error}>{join.error.message}</Text> : null}
        </>
      ) : null}
    </Surface>
  );
}

function FamilyJars({ familyJars, myUserId }: { familyJars: FamilyJarView[]; myUserId: string }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateFamilyJar();

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Hũ gia đình</Text>
        {!creating ? <TextButton label="Tạo hũ gia đình" icon="add" onPress={() => setCreating(true)} /> : null}
      </View>
      {creating ? (
        <Surface style={styles.card}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Tên hũ</Text>
          <TextInput accessibilityLabel="Tên hũ gia đình" value={name} onChangeText={setName} placeholder="VD: Ăn uống chung, Hóa đơn nhà" placeholderTextColor={lightColors.textMuted} style={styles.input} />
          {create.error ? <FormError>{create.error.message}</FormError> : null}
          <View style={styles.row}>
            <TextButton label="Hủy" onPress={() => { setCreating(false); create.reset(); }} />
            <View style={styles.flex}><PrimaryButton disabled={create.isPending || !name.trim()} onPress={() => create.mutate(name, { onSuccess: () => { setName(""); setCreating(false); } })}>{create.isPending ? "Đang tạo…" : "Tạo hũ"}</PrimaryButton></View>
          </View>
        </Surface>
      ) : null}
      {familyJars.length === 0 && !creating ? <Text style={styles.muted}>Chưa có hũ gia đình nào. Tạo một hũ (vd “Ăn uống chung”), rồi mỗi người tự nhập phần đóng góp của mình bên dưới.</Text> : null}
      {familyJars.map((item) => <FamilyJarCard key={item.jar.id} item={item} myUserId={myUserId} />)}
    </View>
  );
}

function FamilyJarCard({ item: { jar, contributions }, myUserId }: { item: FamilyJarView; myUserId: string }) {
  const [amount, setAmount] = useState(contributions.find((c) => c.userId === myUserId)?.amount ?? 0);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useSetContribution();
  const remove = useDeactivateJar();
  const { rows } = contributionRows(contributions, myUserId, amount);

  function confirmDelete() {
    Alert.alert(`Xóa hũ gia đình “${jar.name}”?`, "Giao dịch cũ vẫn được giữ lại.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => remove.mutate(jar.id) },
    ]);
  }

  return (
    <Surface style={styles.card}>
      <View style={styles.headerRow}>
        <JarIcon icon={jar.icon} color={jar.color} size={20} />
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/jars/[id]", params: { id: jar.id } })} style={styles.flex}><Text numberOfLines={1} style={styles.memberName}>{jar.name}</Text></Pressable>
        <Text style={styles.muted}>{`${vnd(jar.monthlyBudget)}/tháng`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Xóa hũ ${jar.name}`} disabled={remove.isPending} onPress={confirmDelete} style={styles.icon}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="delete-outline" size={22} color={lightColors.textMuted} /></Pressable>
      </View>
      {rows.map((row) => (
        <View key={row.userId} style={styles.contribution}>
          <Text numberOfLines={1} style={styles.contributionName}>{row.name}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${row.pct}%`, backgroundColor: jar.color }]} /></View>
          <Text style={styles.contributionValue}>{`${vnd(row.amount)} · ${row.pct}%`}</Text>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: editing }} onPress={() => setEditing((value) => !value)}><Text style={styles.link}>Sửa phần góp của bạn</Text></Pressable>
      {editing ? (
        <>
          <TextInput accessibilityLabel="Số tiền bạn góp mỗi tháng (VNĐ)" keyboardType="number-pad" value={amount ? formatMoney(amount) : ""} onChangeText={(text) => { setAmount(amountFromText(text)); setSaved(false); }} placeholder="0" placeholderTextColor={lightColors.textMuted} style={styles.input} />
          <Text style={styles.muted}>Nhập số tiền cụ thể (không phải %). Hệ thống tự cộng với phần của người kia để ra ngân sách tháng ở trên.</Text>
          <PrimaryButton disabled={save.isPending} onPress={() => { setSaved(false); save.mutate({ jarId: jar.id, amount }, { onSuccess: () => setSaved(true) }); }}>{save.isPending ? "Đang lưu…" : "Lưu"}</PrimaryButton>
        </>
      ) : null}
      {save.error || remove.error ? <Text accessibilityRole="alert" style={styles.error}>{(save.error ?? remove.error)?.message}</Text> : null}
      {saved && !save.error ? <Text accessibilityRole="alert" style={styles.ok}>Đã lưu phần đóng góp của bạn.</Text> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  card: { gap: spacing[3] },
  section: { gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 2, borderTopColor: lightColors.border },
  eyebrow: { color: lightColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 20 },
  ok: { color: lightColors.success, fontSize: typography.size.body },
  error: { color: lightColors.destructive, fontSize: typography.size.caption },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  sectionTitle: { flex: 1, color: lightColors.text, fontSize: typography.size.title, fontWeight: "800" },
  link: { color: lightColors.accent, fontSize: typography.size.caption, fontWeight: "700", textDecorationLine: "underline", paddingVertical: spacing[1] },
  member: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  avatar: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: lightColors.text },
  avatarText: { color: lightColors.background, fontWeight: "700" },
  memberName: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  toggle: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { height: 1, backgroundColor: lightColors.border },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.body, paddingHorizontal: spacing[3] },
  code: { textAlign: "center", paddingVertical: spacing[3], borderWidth: 1, borderStyle: "dashed", borderColor: lightColors.border, borderRadius: radii.control, color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800", letterSpacing: 3 },
  codeInput: { textAlign: "center", letterSpacing: 3 },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  contribution: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  contributionName: { width: 64, color: lightColors.textMuted, fontSize: typography.size.caption },
  track: { flex: 1, height: 6, overflow: "hidden", backgroundColor: lightColors.surfaceSubtle, borderRadius: radii.pill },
  fill: { height: "100%" },
  contributionValue: { color: lightColors.text, fontSize: 12, fontVariant: ["tabular-nums"] },
});
