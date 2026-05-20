import Link from "next/link";
import { buildGenericWhatsAppUrl } from "@/lib/whatsapp";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          aria-label="CANALAA home"
        >
          CANALAA
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/products" className="hover:opacity-60 transition-opacity">
            Shop
          </Link>
          <Link href="/about" className="hidden sm:inline-block hover:opacity-60 transition-opacity">
            About
          </Link>
          <a
            href={buildGenericWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 hover:opacity-60 transition-opacity"
          >
            WA →
          </a>
        </nav>
      </div>
    </header>
  );
}
