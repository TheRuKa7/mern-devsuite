/**
 * Projects list — scoped to the workspace passed via `?workspace=<id>`.
 * When no workspace is selected we pick the first one the user belongs
 * to so the page is useful on a direct visit.
 *
 * Creation goes through a server action that forwards to the API
 * `POST /api/workspaces/:id/projects` with the minted JWT.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@mern-devsuite/ui";
import { CreateProjectInput } from "@mern-devsuite/shared";
import { apiFetch } from "@/lib/api";

interface MeResponse {
  workspaces: { id: string; name: string; slug: string; plan: string }[];
}
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; error?: string }>;
}) {
  const me = await apiFetch<MeResponse>("/api/me");
  const params = await searchParams;
  if (me.workspaces.length === 0) {
    return (
      <Alert>
        You don't belong to any workspace yet. Create one from the
        landing page (your sign-up should have seeded one — this branch
        means something went wrong).
      </Alert>
    );
  }
  const activeId = params.workspace ?? me.workspaces[0]!.id;
  const active = me.workspaces.find((w) => w.id === activeId);
  if (!active) redirect(`/dashboard/projects?workspace=${me.workspaces[0]!.id}`);

  const projects = await apiFetch<Project[]>(
    `/api/workspaces/${activeId}/projects`,
  );

  async function createProjectAction(formData: FormData): Promise<void> {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const parsed = CreateProjectInput.safeParse({
      name,
      description: description || undefined,
    });
    if (!parsed.success) {
      redirect(
        `/dashboard/projects?workspace=${activeId}&error=${encodeURIComponent(
          parsed.error.issues[0]?.message ?? "invalid",
        )}`,
      );
    }
    try {
      await apiFetch(`/api/workspaces/${activeId}/projects`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "create failed";
      redirect(
        `/dashboard/projects?workspace=${activeId}&error=${encodeURIComponent(msg)}`,
      );
    }
    revalidatePath("/dashboard/projects");
    redirect(`/dashboard/projects?workspace=${activeId}`);
  }

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Workspace: <code>{active!.slug}</code>
        </p>
      </div>

      {params.error ? (
        <Alert variant="destructive">
          {decodeURIComponent(params.error)}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
          <CardDescription>
            Projects are scoped to this workspace. Writes are audited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createProjectAction}
            className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={80} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" maxLength={280} />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">
            No projects yet — create your first one above.
          </p>
        ) : (
          projects.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription>
                  {new Date(p.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              {p.description ? (
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {p.description}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
