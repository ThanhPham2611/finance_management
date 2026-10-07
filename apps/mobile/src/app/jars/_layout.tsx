import { Stack } from "expo-router";
import { lightColors } from "@hu/design-tokens";

export default function JarStackLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: lightColors.background }, headerTintColor: lightColors.text, headerShadowVisible: false, contentStyle: { backgroundColor: lightColors.background } }} />;
}
