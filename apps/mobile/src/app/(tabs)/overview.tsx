import { StyleSheet, Text } from "react-native";
import { Screen } from "@/components/screen";
import { lightColors, typography } from "@hu/design-tokens";

export default function OverviewScreen() {
  return <Screen><Text style={styles.title}>Tổng quan tháng này</Text></Screen>;
}

const styles = StyleSheet.create({ title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "700" } });
