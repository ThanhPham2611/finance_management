import { Platform, Pressable, StyleSheet, Text } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { parseYMD, toYMD } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

/** Chọn ngày bằng picker native. `value`/`onChange` dùng chuỗi YYYY-MM-DD; parseYMD/toYMD cùng dùng giờ địa phương nên không lệch múi giờ. */
export function DateField({ value, onChange, label = "Ngày" }: { value: string; onChange(value: string): void; label?: string }) {
  const date = parseYMD(value);
  const pick = (_event: DateTimePickerEvent, next?: Date) => {
    if (next) onChange(toYMD(next));
  };

  if (Platform.OS === "ios") {
    return <DateTimePicker accessibilityLabel={label} value={date} mode="date" display="compact" locale="vi-VN" onChange={pick} style={styles.ios} />;
  }
  const [year, month, day] = value.split("-");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => DateTimePickerAndroid.open({ value: date, mode: "date", onChange: pick })} style={styles.android}>
      <Text style={styles.text}>{`${day}/${month}/${year}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ios: { alignSelf: "flex-start" },
  android: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing[3], borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface },
  text: { color: lightColors.text, fontSize: typography.size.body },
});
