"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { ProjectDocument } from "@/types";

interface Props {
  projectId: number;
  interestId?: number;
  canUpload: boolean;
  title: string;
}

const MAX_SIZE = 10 * 1024 * 1024;

export function DocumentUploadPanel({ projectId, interestId, canUpload, title }: Props) {
  const t = useTranslations("project.documents");
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.projects.documents.list(projectId).then(setDocs).catch(() => {});
  }, [projectId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target) return;
    // reset so same file can be re-uploaded after error
    (e.target as HTMLInputElement).value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError(t("pdfOnly"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError(t("fileTooLarge"));
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      let newDoc: ProjectDocument;
      if (interestId !== undefined) {
        newDoc = await api.projects.documents.uploadParticipantDoc(projectId, interestId, file);
      } else {
        newDoc = await api.projects.documents.uploadProjectDoc(projectId, file);
      }
      setDocs((prev) => [newDoc, ...prev]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--clr-line)] bg-[var(--clr-surface)]" style={{ boxShadow: "var(--sh-sm)" }}>
      <div className="flex items-center justify-between border-b border-[var(--clr-line)] px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--clr-text-2)]">{title}</span>
        {canUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--clr-brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? t("uploading") : t("upload")}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <div className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {uploadError}
        </div>
      )}

      {docs.length === 0 ? (
        <p className="px-4 py-5 text-center text-xs text-[var(--clr-text-3)]">{t("noDocuments")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--clr-line)]">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--clr-brand)]/10 text-[var(--clr-brand)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--clr-text)]">{doc.original_name}</p>
                <p className="truncate text-[10px] text-[var(--clr-text-3)]">
                  {doc.uploader_name && `${doc.uploader_name} · `}{formatDate(doc.created_at)}
                </p>
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--clr-surface-2)] text-[var(--clr-text-2)]">
                {doc.document_type === "PROJECT_DOCUMENT" ? t("projectDocument") : t("participantDocument")}
              </span>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-[var(--clr-brand)] px-2.5 py-1 text-[10px] font-semibold text-[var(--clr-brand)] transition hover:bg-[var(--clr-brand)] hover:text-white"
              >
                {t("open")}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
