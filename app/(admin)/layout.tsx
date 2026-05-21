import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import "../globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dashboard — CANALAA",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const payload = await getPayload({ config });
  const headersList = await headers();
  const { user } = await payload.auth({ headers: headersList });
  if (!user) redirect("/admin");

  return (
    <html
      lang="id"
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <header className="border-b border-hairline">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight"
            >
              CANALAA · Dashboard
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/admin" className="hover:opacity-60 transition-opacity">
                CMS
              </Link>
              <Link
                href="/admin/collections/sales"
                className="hidden sm:inline-block hover:opacity-60 transition-opacity"
              >
                Sales table
              </Link>
              <Link
                href="/"
                className="hover:opacity-60 transition-opacity"
              >
                Store →
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
