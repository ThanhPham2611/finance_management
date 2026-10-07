import { Stack } from "expo-router";
import { lightColors } from "@hu/design-tokens";

export default function TransactionStackLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: lightColors.background }, headerTintColor: lightColors.text, headerShadowVisible: false, contentStyle: { backgroundColor: lightColors.background } }} />;
}
