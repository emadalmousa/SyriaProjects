import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">SyriaProjects</h1>
      <p className="text-gray-500">Projektmanagement-Plattform</p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
          Login
        </Link>
        <Link href="/register" className="rounded border border-blue-600 px-6 py-2 text-blue-600 hover:bg-blue-50">
          Registrieren
        </Link>
      </div>
    </main>
  );
}
