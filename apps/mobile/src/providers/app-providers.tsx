import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./auth-provider";
import { FinanceQueryProvider } from "./query-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <FinanceQueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </FinanceQueryProvider>
    </SafeAreaProvider>
  );
}
