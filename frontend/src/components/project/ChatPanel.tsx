"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import type { ChatMessage, User } from "@/types";

interface ChatPanelProps {
  projectId: number;
  currentUser: User;
}

export function ChatPanel({ projectId, currentUser }: ChatPanelProps) {
  const t = useTranslations("project");
  const locale = useLocale();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function fetchLatest() {
      try {
        const page = await api.projects.chat.list(projectId, { limit: 30 });
        if (!active) return;
        setMessages(page.messages);
        setNextCursor(page.next_cursor);
        setHasMore(page.has_more);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch {
        // silent on initial load
      }
    }

    fetchLatest();

    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const page = await api.projects.chat.list(projectId, { limit: 30 });
        if (!active) return;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const incoming = page.messages.filter((m) => !existingIds.has(m.id));
          if (incoming.length === 0) return prev;
          const el = listRef.current;
          const nearBottom = el
            ? el.scrollHeight - el.scrollTop - el.clientHeight < 120
            : true;
          if (nearBottom) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }
          return [...prev, ...incoming];
        });
      } catch {
        // silent poll failure
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [projectId]);

  async function loadOlder() {
    if (!hasMore || loadingOlder || nextCursor == null) return;
    setLoadingOlder(true);
    try {
      const el = listRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;
      const page = await api.projects.chat.list(projectId, { before_id: nextCursor, limit: 30 });
      setMessages((prev) => [...page.messages, ...prev]);
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch {
      setError(t("chat.loadError"));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    setError(null);
    try {
      const msg = await api.projects.chat.send(projectId, text);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setError(t("chat.sendError"));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[540px] flex-col rounded-2xl border border-[var(--clr-line)] bg-[var(--clr-surface)] shadow-sm">
      {/* Load older button */}
      <div className="flex min-h-[40px] items-center justify-center border-b border-[var(--clr-line)] px-4">
        {hasMore ? (
          <button
            onClick={loadOlder}
            disabled={loadingOlder}
            className="text-xs text-[var(--clr-brand)] hover:underline disabled:opacity-50"
          >
            {loadingOlder ? t("chat.loading") : t("chat.loadOlder")}
          </button>
        ) : (
          <span className="text-xs text-[var(--clr-text-3)]" />
        )}
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      >
        {messages.map((msg) => {
          const isOwn = msg.sender_user_id === currentUser.id;
          const senderName = msg.sender?.full_name ?? t("chat.deletedUser");
          const initials = senderName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--clr-brand-light,#e8f0fe)] text-[11px] font-bold text-[var(--clr-brand)]">
                {msg.sender?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.sender.avatar_url}
                    alt={senderName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div
                className={`flex max-w-[72%] flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}
              >
                <span className="px-1 text-[10px] font-semibold text-[var(--clr-text-3)]">
                  {isOwn ? t("chat.you") : senderName}
                </span>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? "rounded-br-sm bg-[var(--clr-brand)] text-white"
                      : "rounded-bl-sm bg-[var(--clr-surface-2,#f3f4f6)] text-[var(--clr-text)]"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="px-1 text-[10px] text-[var(--clr-text-3)]">
                  {new Date(msg.created_at).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 py-1 text-xs text-red-500">{error}</p>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-[var(--clr-line)] px-3 py-2"
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          maxLength={2000}
          placeholder={t("chat.placeholder")}
          className="flex-1 rounded-xl border border-[var(--clr-line)] bg-[var(--clr-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--clr-brand)]"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-xl bg-[var(--clr-brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {sending ? "…" : t("chat.send")}
        </button>
      </form>
    </div>
  );
}
