/**
 * Root layout — wraps every page. We keep it bare-bones: a fresh HTML
 * document, the Tailwind CSS reset, and a `SessionProvider` boundary
 * so client components can call `useSession()`.
 *
 * Notice the lack of <Head> — Next 15 inlines metadata from the
 * exported `metadata` object instead.
 */
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "mern-devsuite",
    template: "%s · mern-devsuite",
  },
  description:
    "Production-ready MERN SaaS starter — auth, multi-tenancy, GDPR + SOC-2 primitives.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
