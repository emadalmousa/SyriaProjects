export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md rounded-card border border-line bg-surface p-8"
        style={{ boxShadow: "var(--sh-lg)" }}
      >
        {children}
      </div>
    </main>
  );
}

export function AuthCardWide({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-lg rounded-card border border-line bg-surface p-8"
        style={{ boxShadow: "var(--sh-lg)" }}
      >
        {children}
      </div>
    </main>
  );
}
