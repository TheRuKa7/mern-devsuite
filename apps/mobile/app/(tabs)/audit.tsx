import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { listAuditEvents } from "../../lib/api";

export default function Audit() {
  const q = useQuery({ queryKey: ["audit"], queryFn: () => listAuditEvents(100) });

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
        <Text className="text-danger">Failed to load audit log.</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="bg-background"
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={q.data}
      keyExtractor={(e) => e.id}
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
      ListHeaderComponent={
        <Text className="text-muted text-xs mb-2">
          Tamper-evident hash chain · prev → row
        </Text>
      }
      renderItem={({ item }) => (
        <View className="rounded-xl border border-border bg-surface p-3">
          <View className="flex-row justify-between">
            <Text className="text-white font-medium">{item.action}</Text>
            <Text className="text-muted text-xs">{new Date(item.ts).toLocaleString()}</Text>
          </View>
          <Text className="text-muted text-xs mt-1">
            {item.actorName} → {item.resource}
          </Text>
          <Text className="text-muted text-[10px] mt-2 font-mono" numberOfLines={1}>
            {item.prevHash.slice(0, 12)} → {item.rowHash.slice(0, 12)}
          </Text>
        </View>
      )}
    />
  );
}
