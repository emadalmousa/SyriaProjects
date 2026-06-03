export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-card border border-line bg-surface p-8" style={{ boxShadow: "var(--sh-lg)" }}>
      {children}
    </div>
  );
}

export function AuthCardWide({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-lg rounded-card border border-line bg-surface p-8" style={{ boxShadow: "var(--sh-lg)" }}>
      {children}
    </div>
  );
}
