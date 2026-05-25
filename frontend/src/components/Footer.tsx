export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-50 border-t bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} SyriaProjects
      </div>
    </footer>
  );
}
