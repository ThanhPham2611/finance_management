import { StyleSheet, Text } from "react-native";
import { Screen } from "@/components/screen";
import { lightColors, typography } from "@hu/design-tokens";

export default function ReportsScreen() {
  return <Screen><Text style={styles.title}>Báo cáo sẽ có trong bản tiếp theo</Text></Screen>;
}

const styles = StyleSheet.create({ title: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "700" } });
