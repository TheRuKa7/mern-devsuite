/**
 * Dashboard overview. Lists the workspaces the current user belongs
 * to. In a richer product this would show recent activity + metrics;
 * we keep it spartan so the reader can see exactly how the API/JWT
 * boundary works.
 */
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@mern-devsuite/ui";
import { apiFetch } from "@/lib/api";

interface MeResponse {
  user: { id: string; email: string; name: string | null };
  memberships: { workspaceId: string; role: string }[];
  workspaces: { id: string; name: string; slug: string; plan: string }[];
}

export default async function DashboardHome() {
  const me = await apiFetch<MeResponse>("/api/me");

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{me.user.name ? `, ${me.user.name}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          You have {me.workspaces.length}{" "}
          workspace{me.workspaces.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {me.workspaces.map((ws) => {
          const role = me.memberships.find(
            (m) => m.workspaceId === ws.id,
          )?.role;
          return (
            <Card key={ws.id}>
              <CardHeader>
                <CardTitle>{ws.name}</CardTitle>
                <CardDescription>
                  /{ws.slug} · {ws.plan} · {role}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/projects?workspace=${ws.id}`}
                  className="text-sm font-medium underline"
                >
                  Open projects →
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
