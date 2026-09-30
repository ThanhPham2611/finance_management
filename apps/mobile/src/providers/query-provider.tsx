import { useEffect, useState, type PropsWithChildren } from "react";
import { AppState, Platform } from "react-native";
import * as Network from "expo-network";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function FinanceQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 2 },
          mutations: { retry: 0, networkMode: "online" },
        },
      }),
  );

  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      let initialized = false;
      const subscription = Network.addNetworkStateListener((state) => {
        initialized = true;
        setOnline(Boolean(state.isConnected));
      });
      void Network.getNetworkStateAsync().then((state) => {
        if (!initialized) setOnline(Boolean(state.isConnected));
      });
      return () => subscription.remove();
    });

    const onAppStateChange = (status: string) => {
      if (Platform.OS !== "web") focusManager.setFocused(status === "active");
      if (status === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    onAppStateChange(AppState.currentState);
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
