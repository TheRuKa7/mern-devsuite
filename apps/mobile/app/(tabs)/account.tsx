import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { me } from "../../lib/api";
import { useAuth } from "../../lib/store";

export default function Account() {
  const { signOut } = useAuth();
  const q = useQuery({ queryKey: ["me"], queryFn: me });

  return (
    <View className="flex-1 bg-background p-6 gap-4">
      {q.data ? (
        <View className="rounded-xl border border-border bg-surface p-4">
          <Text className="text-white text-lg font-semibold">{q.data.name}</Text>
          <Text className="text-muted text-sm mt-1">{q.data.email}</Text>
        </View>
      ) : null}

      <Pressable
        className="rounded-xl border border-danger py-3 items-center active:opacity-70"
        onPress={signOut}
      >
        <Text className="text-danger font-medium">Sign out</Text>
      </Pressable>
    </View>
  );
}
