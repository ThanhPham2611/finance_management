import { Stack } from "expo-router";
import { lightColors } from "@hu/design-tokens";

/** Stack có header, dùng chung cho các nhóm màn hình con (Chia lương, Gia đình, Chia sẻ). */
export default function StackLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: lightColors.background }, headerTintColor: lightColors.text, headerShadowVisible: false, contentStyle: { backgroundColor: lightColors.background } }} />;
}
