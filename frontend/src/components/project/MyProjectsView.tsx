"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project } from "@/types";
import { PageSpinner, Button } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { StatusBadge } from "@/components/project";

export function MyProjectsView() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.projects.my()
      .then((p) => setProjects(p as Project[]))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      <div className="mx-auto max-w-screen-lg px-5 py-8 sm:px-8">

        <PageHeader
          title="Meine Projekte"
          actions={
            <Link href="/projects/create">
              <Button size="md">+ Neues Projekt</Button>
            </Link>
          }
        />

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface py-20" style={{ boxShadow: "var(--sh-sm)" }}>
            <span className="mb-3 text-4xl">📋</span>
            <p className="font-medium text-[var(--clr-text-2)]">Noch keine Projekte vorhanden.</p>
            <Link href="/projects/create" className="mt-4 text-sm font-semibold text-brand hover:underline">
              Erstes Projekt erstellen →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group rounded-card border border-line bg-surface p-5 transition-all hover:border-brand/40 hover:-translate-y-px"
                style={{ boxShadow: "var(--sh-sm)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[var(--clr-text)] group-hover:text-brand transition-colors truncate">{p.title}</h2>
                    {p.description && <p className="mt-1 text-sm text-[var(--clr-text-2)] line-clamp-2">{p.description}</p>}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
