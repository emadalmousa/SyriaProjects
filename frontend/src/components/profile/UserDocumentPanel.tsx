"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { UserDocument } from "@/types";

export function UserDocumentPanel() {
  const t = useTranslations("profile.documents");
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.users.documents.list()
      .then(setDocs)
      .catch(() => {});
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target) return;
    (e.target as HTMLInputElement).value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError(t("pdfOnly"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("fileTooLarge"));
      return;
    }

    setUploadError("");
    setUploading(true);
    try {
      const doc = await api.users.documents.upload(file);
      setDocs(prev => [doc, ...prev]);
    } catch {
      setUploadError(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: number) {
    try {
      await api.users.documents.delete(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--clr-line)] bg-[var(--clr-surface)] p-5" style={{ boxShadow: "var(--sh-sm)" }}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--clr-text)]">{t("title")}</h3>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-[var(--clr-brand)]/40 bg-[var(--clr-brand)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--clr-brand)] transition hover:border-[var(--clr-brand)] hover:bg-[var(--clr-brand)]/10 disabled:opacity-50"
        >
          {uploading ? t("uploading") : t("upload")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {uploadError}
        </p>
      )}

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--clr-line)] py-10">
          <svg className="mb-2 h-8 w-8 text-[var(--clr-text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-xs text-[var(--clr-text-3)]">{t("noDocuments")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-surface-2)] px-3 py-2.5"
            >
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--clr-text)]">
                {doc.original_name}
              </span>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-semibold text-[var(--clr-brand)] hover:underline"
              >
                {t("open")}
              </a>
              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                className="shrink-0 rounded p-0.5 text-[var(--clr-text-3)] transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                title={t("delete")}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
