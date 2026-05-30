import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
// @ts-ignore: side-effect import of global CSS
import "./globals.css";

const displayFont = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SyriaProjects",
  description: "Projektmanagement-Plattform für syrische Aufbauprojekte",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="bg-[var(--clr-bg)] text-[var(--clr-text)] font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
