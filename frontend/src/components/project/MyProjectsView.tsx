"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { Project } from "@/types";
import { PageSpinner, Button } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { StatusBadge } from "@/components/project";

function ProjectList({ projects, showIdeaMarker }: { projects: Project[]; showIdeaMarker?: boolean }) {
  const t = useTranslations("profile");
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface py-16" style={{ boxShadow: "var(--sh-sm)" }}>
        <p className="font-medium text-[var(--clr-text-2)]">{t("noProjects")}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {projects.map((p) => {
        const isIdea     = p.status === "IDEA";
        const isRejected = p.status === "REJECTED";
        return (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={`group rounded-card border p-5 transition-all hover:-translate-y-px bg-surface
              ${isRejected ? "border-[var(--clr-danger)] bg-[var(--clr-danger-dim)] hover:border-[var(--clr-danger)]"
              : isIdea && showIdeaMarker ? "border-amber-400 hover:border-amber-500"
              : "border-line hover:border-brand/40"}`}
            style={{ boxShadow: "var(--sh-sm)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex items-center gap-2">
                {isIdea && showIdeaMarker && (
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">!</span>
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-[var(--clr-text)] group-hover:text-brand transition-colors truncate">{p.title}</h2>
                  {p.description && <p className="mt-1 text-sm text-[var(--clr-text-2)] line-clamp-2">{p.description}</p>}
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function MyProjectsView() {
  const router = useRouter();
  const t = useTranslations("profile");
  const tDash = useTranslations("dashboard");
  const [tab, setTab] = useState<"own" | "joined">("own");
  const [ownProjects, setOwnProjects]       = useState<Project[]>([]);
  const [joinedProjects, setJoinedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.projects.my(), api.projects.myParticipations()])
      .then(([own, joined]) => {
        setOwnProjects(own as Project[]);
        setJoinedProjects(joined as Project[]);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <PageSpinner />;

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-semibold rounded-lg transition ${active ? "bg-brand text-white" : "text-[var(--clr-text-2)] hover:text-[var(--clr-text)]"}`;

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-screen-lg px-5 py-8 sm:px-8">

        <PageHeader
          title={t("myProjects")}
          actions={
            <Link href="/projects/create">
              <Button size="md">{tDash("newProject")}</Button>
            </Link>
          }
        />

        <div className="mb-5 flex gap-2 border-b border-line pb-3">
          <button className={tabCls(tab === "own")}    onClick={() => setTab("own")}>
            {t("tabOwn")} {ownProjects.length > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{ownProjects.length}</span>}
          </button>
          <button className={tabCls(tab === "joined")} onClick={() => setTab("joined")}>
            {t("tabJoined")} {joinedProjects.length > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{joinedProjects.length}</span>}
          </button>
        </div>

        {tab === "own"
          ? <ProjectList projects={ownProjects} showIdeaMarker />
          : <ProjectList projects={joinedProjects} />
        }

        {tab === "own" && ownProjects.length === 0 && (
          <div className="mt-4 text-center">
            <Link href="/projects/create" className="text-sm font-semibold text-brand hover:underline">
              {t("createFirst")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
