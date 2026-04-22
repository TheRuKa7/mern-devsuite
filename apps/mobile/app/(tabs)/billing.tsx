import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { listInvoices } from "../../lib/api";
import { Invoice } from "../../lib/types";

function statusClass(s: Invoice["status"]): string {
  if (s === "paid") return "bg-primary/20 text-primary";
  if (s === "open") return "bg-warning/20 text-warning";
  return "bg-danger/20 text-danger";
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export default function Billing() {
  const q = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });

  if (q.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22c55e" />
      </View>
    );
  }

  return (
    <FlatList
      className="bg-background"
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={q.data}
      keyExtractor={(i) => i.id}
      ListEmptyComponent={
        <Text className="text-muted text-center mt-16">No invoices yet.</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          className="rounded-xl border border-border bg-surface p-3 active:opacity-70"
          onPress={() =>
            item.hostedInvoiceUrl && WebBrowser.openBrowserAsync(item.hostedInvoiceUrl)
          }
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-medium tabular-nums">
              {money(item.amount, item.currency)}
            </Text>
            <Text className={`px-2 py-0.5 rounded-full text-xs ${statusClass(item.status)}`}>
              {item.status}
            </Text>
          </View>
          <Text className="text-muted text-xs mt-1">
            {new Date(item.periodStart).toLocaleDateString()} →{" "}
            {new Date(item.periodEnd).toLocaleDateString()}
          </Text>
        </Pressable>
      )}
    />
  );
}
