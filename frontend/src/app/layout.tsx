import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SyriaProjects",
  description: "Projektmanagement-Plattform",
};

// Root layout only provides the shell — locale layout provides html/body
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
