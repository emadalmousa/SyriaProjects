export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-line bg-surface">
      <div className="mx-auto max-w-screen-2xl px-5 py-4 sm:px-8 flex items-center justify-between">
        <span className="text-xs text-[var(--clr-text-3)]">
          © {new Date().getFullYear()} SyriaProjects
        </span>
        <span className="text-xs text-[var(--clr-text-3)]">
          Aufbau. Wachstum. Hoffnung.
        </span>
      </div>
    </footer>
  );
}
