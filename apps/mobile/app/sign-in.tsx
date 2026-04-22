import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { signIn } from "../lib/api";
import { useAuth } from "../lib/store";

export default function SignIn() {
  const { apiBaseUrl, setApiBaseUrl, setAccessToken } = useAuth();
  const [url, setUrl] = useState(apiBaseUrl);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const login = useMutation({
    mutationFn: () => signIn(email, pw),
    onSuccess: (token) => setAccessToken(token),
    onError: (e: unknown) =>
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "check credentials"),
  });

  return (
    <View className="flex-1 bg-background p-6 gap-4 justify-center">
      <Text className="text-white text-2xl font-semibold">Welcome back</Text>
      <Text className="text-muted text-sm">Sign in to your workspace.</Text>

      <View>
        <Text className="text-muted text-xs mb-1">API base URL</Text>
        <TextInput
          className="rounded-xl border border-border bg-surface text-white px-3 py-3"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          onEndEditing={() => setApiBaseUrl(url.trim())}
        />
      </View>

      <View>
        <Text className="text-muted text-xs mb-1">Email</Text>
        <TextInput
          className="rounded-xl border border-border bg-surface text-white px-3 py-3"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </View>

      <View>
        <Text className="text-muted text-xs mb-1">Password</Text>
        <TextInput
          className="rounded-xl border border-border bg-surface text-white px-3 py-3"
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          autoComplete="current-password"
        />
      </View>

      <Pressable
        className="rounded-xl bg-primary py-3 items-center active:opacity-80"
        disabled={login.isPending || !email || !pw}
        onPress={() => login.mutate()}
      >
        <Text className="text-black font-semibold">
          {login.isPending ? "Signing in…" : "Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}
