import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "../lib/store";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthGate() {
  const { accessToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(tabs)";
    if (!accessToken && inAuthGroup) router.replace("/sign-in");
    if (accessToken && segments[0] === "sign-in") router.replace("/(tabs)");
  }, [accessToken, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0a0a0a" },
            headerTintColor: "#fafafa",
            contentStyle: { backgroundColor: "#0a0a0a" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
