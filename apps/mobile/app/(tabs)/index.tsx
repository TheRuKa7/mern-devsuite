import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { listWorkspaces } from "../../lib/api";
import { useAuth } from "../../lib/store";

export default function Workspaces() {
  const q = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });
  const { currentWorkspaceId, setCurrentWorkspace } = useAuth();

  if (q.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  }
  if (q.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-danger">Failed to load workspaces.</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-background"
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={q.data}
      keyExtractor={(w) => w.id}
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
      renderItem={({ item }) => {
        const active = item.id === currentWorkspaceId;
        return (
          <Pressable
            onPress={() => setCurrentWorkspace(item.id)}
            className={`rounded-xl border p-4 active:opacity-70 ${active ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-white font-semibold">{item.name}</Text>
              <Text className="text-muted text-xs uppercase">{item.plan}</Text>
            </View>
            <Text className="text-muted text-xs mt-1">
              {item.memberCount} member{item.memberCount === 1 ? "" : "s"} · you are {item.role}
            </Text>
            {active ? (
              <Text className="text-primary text-xs mt-2 font-medium">Active workspace</Text>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}
