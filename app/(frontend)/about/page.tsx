import Link from "next/link";

export const metadata = {
  title: "About — CANALAA",
  description: "CANALAA — sepatu untuk yang tahu pilihan terbaik bukan paling mahal.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Tentang
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
        Less hype.<br />
        More walk.
      </h1>

      <div className="mt-10 space-y-5 text-base leading-relaxed text-foreground md:text-lg">
        <p>
          CANALAA bukan sepatu paling mahal di feed kamu. Tapi yang paling sering
          kepakai. Murah karena harus, nyaman karena wajib, dan{" "}
          <em>second option</em> karena kami tahu posisi kami — di kaki kamu
          setiap hari.
        </p>
        <p>
          Kami bikin sepatu buat mahasiswa yang mikir dua kali sebelum bayar
          mahal. Pilihan kedua kamu — yang akhirnya jadi yang paling kepakai.
        </p>
      </div>

      <div className="mt-10 border-t border-hairline pt-10">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Manifesto
        </p>
        <ul className="mt-4 space-y-2 text-xl font-bold tracking-tight md:text-3xl">
          <li>SECOND OPTION.</li>
          <li>AFFORDABLE.</li>
          <li>COMFORTABLE.</li>
        </ul>
      </div>

      <div className="mt-12">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
        >
          LIHAT KOLEKSI →
        </Link>
      </div>
    </article>
  );
}
