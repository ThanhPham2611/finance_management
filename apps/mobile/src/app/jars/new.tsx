import { useState } from "react";
import { router, Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { JAR_PRESETS } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { FormError, PrimaryButton } from "@/components/auth-form";
import { BudgetField } from "@/components/budget-field";
import { Surface, TextButton, ToggleRow } from "@/components/finance-ui";
import { JarIcon } from "@/components/jar-icon";
import { Screen } from "@/components/screen";
import { useCreateJars } from "@/features/finance/hooks";
import { SAVINGS_EXPLANATION } from "@/features/finance/jar-form";
import { canSaveDrafts, draftCustom, togglePreset, toCreateInputs, type JarWizardDraft } from "@/features/finance/jar-wizard";

/** Tạo hũ hàng loạt, giống /jars/new của web: bước 1 chọn mẫu hoặc tự đặt tên, bước 2 đặt tên + ngân sách rồi lưu một lần. */
export default function NewJarScreen() {
  const mutation = useCreateJars();
  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<JarWizardDraft[]>([]);
  const [alertAt80, setAlertAt80] = useState(true);
  const [rollover, setRollover] = useState(false);
  const [savedNames, setSavedNames] = useState<string[] | null>(null);

  const update = (key: string, patch: Partial<JarWizardDraft>) => setDrafts((list) => list.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  const remove = (key: string) => setDrafts((list) => list.filter((draft) => draft.key !== key));

  if (savedNames) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Đã tạo hũ" }} />
        <View accessibilityRole="alert" style={styles.done}>
          <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="check-circle" size={40} color={lightColors.success} />
          <Text style={styles.doneTitle}>{`Đã tạo ${savedNames.length} hũ`}</Text>
          {savedNames.map((name, index) => <Text key={`${name}-${index}`} style={styles.muted}>{name}</Text>)}
        </View>
        <PrimaryButton onPress={() => router.replace("/jars")}>Về danh sách hũ</PrimaryButton>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Tạo hũ mới" }} />
        <Text style={styles.step}>Bước 1/2</Text>
        <Text style={styles.heading}>Chọn các hũ muốn tạo</Text>
        <Text style={styles.muted}>Chọn bao nhiêu mẫu cũng được, hoặc bấm “Tự đặt tên” để thêm hũ riêng. Tạo một lần cho tất cả.</Text>
        <View style={styles.grid}>
          {JAR_PRESETS.map((preset) => {
            const selected = drafts.some((draft) => draft.presetName === preset.name);
            return (
              <Pressable key={preset.name} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={preset.name} onPress={() => setDrafts((list) => togglePreset(list, preset))} style={[styles.preset, selected && styles.presetActive]}>
                <View style={styles.presetTop}><JarIcon icon={preset.icon} color={preset.color} size={20} /><Text style={styles.presetName}>{preset.name}</Text>{selected ? <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="check" size={18} color={lightColors.primary} /> : null}</View>
                <Text style={styles.suggest}>{`Gợi ý ${preset.suggest} thu nhập`}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setDrafts((list) => [...list, draftCustom()])} style={styles.custom}>
          <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="edit" size={18} color={lightColors.accent} />
          <View style={styles.flex}><Text style={styles.presetName}>Tự đặt tên</Text><Text style={styles.suggest}>Bấm nhiều lần để thêm nhiều hũ tự đặt tên</Text></View>
        </Pressable>
        <View style={styles.footer}>
          <Text style={styles.muted}>{`Đã chọn ${drafts.length} hũ`}</Text>
          <PrimaryButton disabled={drafts.length === 0} onPress={() => setStep(2)}>Tiếp tục</PrimaryButton>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Đặt tên và ngân sách" }} />
      <Text style={styles.step}>Bước 2/2</Text>
      <TextButton label="Quay lại chọn hũ" icon="arrow-back" onPress={() => setStep(1)} />
      {mutation.error ? <FormError>{mutation.error.message}</FormError> : null}
      {drafts.map((draft, index) => (
        <Surface key={draft.key} style={styles.card}>
          <View style={styles.nameRow}>
            <JarIcon icon={draft.icon} color={draft.color} size={22} isSavings={draft.isSavings} />
            <TextInput accessibilityLabel={`Tên hũ ${index + 1}`} value={draft.name} onChangeText={(name) => update(draft.key, { name })} placeholder={`Tên hũ ${index + 1}`} placeholderTextColor={lightColors.textMuted} style={styles.nameInput} />
            {drafts.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ hũ ${draft.name || index + 1}`} onPress={() => remove(draft.key)} style={styles.remove}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="close" size={18} color={lightColors.textMuted} /></Pressable> : null}
          </View>
          <Text style={styles.label}>Ngân sách mỗi tháng</Text>
          <BudgetField label={`Ngân sách hũ ${index + 1}`} value={draft.budget} onChange={(budget) => update(draft.key, { budget })} />
          <ToggleRow label="Đánh dấu là hũ tiết kiệm" hint="Tích lũy dần qua các tháng, không tính vào ngân sách còn lại." value={draft.isSavings} onChange={(isSavings) => update(draft.key, { isSavings })} />
          {draft.isSavings ? <Text style={styles.info}>{SAVINGS_EXPLANATION}</Text> : null}
        </Surface>
      ))}
      <Text style={styles.muted}>Áp dụng cho tất cả hũ ở trên, trừ hũ tiết kiệm (luôn cộng dồn, không cảnh báo 80%).</Text>
      <ToggleRow label="Cảnh báo khi dùng hết 80%" hint="Hiện cảnh báo trên Tổng quan." value={alertAt80} onChange={setAlertAt80} />
      <ToggleRow label="Chuyển phần còn lại sang tháng sau" hint="Không dùng hết thì được cộng dồn." value={rollover} onChange={setRollover} />
      <Text style={styles.muted}>Muốn hũ dùng chung với vợ/chồng? Tạo ở mục Gia đình để tránh trùng với hũ cá nhân.</Text>
      <PrimaryButton disabled={mutation.isPending || !canSaveDrafts(drafts)} onPress={() => mutation.mutate(toCreateInputs(drafts, { alertAt80, rollover }), { onSuccess: () => setSavedNames(drafts.map((draft) => draft.name.trim())) })}>{mutation.isPending ? "Đang lưu…" : `Lưu ${drafts.length} hũ`}</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  step: { color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "700" },
  heading: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" },
  muted: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 22 },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3] },
  preset: { width: "47.5%", minHeight: 88, gap: spacing[2], padding: spacing[3], borderRadius: radii.card, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface },
  presetActive: { borderWidth: 2, borderColor: lightColors.primary, backgroundColor: "#E5EEE9" },
  presetTop: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  presetName: { flex: 1, color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  suggest: { color: lightColors.textMuted, fontSize: 12 },
  custom: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3], borderRadius: radii.card, borderWidth: 1, borderStyle: "dashed", borderColor: lightColors.border, backgroundColor: lightColors.surface },
  footer: { gap: spacing[2], paddingTop: spacing[3], borderTopWidth: 2, borderTopColor: lightColors.border },
  card: { gap: spacing[3] },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  nameInput: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.bodyLarge, paddingHorizontal: spacing[3] },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border },
  info: { color: lightColors.success, backgroundColor: "#E4F0EA", borderRadius: radii.control, padding: spacing[3], fontSize: typography.size.caption, lineHeight: 20 },
  done: { alignItems: "center", gap: spacing[2], paddingVertical: spacing[8] },
  doneTitle: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" },
});
