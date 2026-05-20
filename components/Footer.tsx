import Link from "next/link";

const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps?q=-6.395747,106.7793649&z=17&output=embed";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
        {/* Map + Address */}
        <div className="mt-10 grid gap-6 border-t border-hairline pt-8 md:grid-cols-3 md:gap-8">
          <div className="md:col-span-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Lokasi
            </h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-hairline bg-background">
              <iframe
                src={GOOGLE_MAPS_EMBED_URL}
                title="CANALAA on Google Maps"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Alamat
            </h3>
            <address className="not-italic text-sm leading-relaxed">
              <span className="font-semibold">CANALAA</span>
              <br />
              Jl. Raya Sawangan no. 28, Rangkapan Jaya Baru, Kec. Pancoran Mas
              <br />
              Kota Depok, Jawa Barat
              <br />
              Indonesia, 16434
            </address>
          </div>
        </div>

        {/* Bottom bar */}
        <div className=" flex flex-col items-center gap-2 border-t border-hairline pt-6 text-xs text-muted md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} CANALAA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
