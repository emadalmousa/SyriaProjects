"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  IDEA: "Idee", UNDER_REVIEW: "In Prüfung", FINANCIAL_PLAN_REQUIRED: "Finanzplan erforderlich",
  FINANCIAL_PLAN_PAID: "Finanzplan bezahlt", FINANCIAL_PLAN_DONE: "Finanzplan fertig",
  APPROVED: "Genehmigt", INTEREST_RECEIVED: "Interesse erhalten", CONTRACT: "Vertrag",
  ACTIVE: "Aktiv", PAUSED: "Pausiert", SOLD: "Verkauft", REJECTED: "Abgelehnt",
};

export default function MyProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.projects.my().then((p) => setProjects(p as Project[])).catch(() => router.push("/login"));
  }, [router]);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Meine Projekte</h1>
          <Link href="/projects/create" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            + Neues Projekt
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-gray-500">Noch keine Projekte.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-semibold">{p.title}</h2>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                {p.description && <p className="mt-2 text-gray-500">{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
