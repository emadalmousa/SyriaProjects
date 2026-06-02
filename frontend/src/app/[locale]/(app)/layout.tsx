import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--clr-bg)]">
      <Header />
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      <Footer />
    </div>
  );
}
