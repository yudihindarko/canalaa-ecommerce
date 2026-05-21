const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps?q=-6.395747,106.7793649&z=17&output=embed";

const INSTAGRAM_URL = "https://www.instagram.com/canalaa.official";
const INSTAGRAM_HANDLE = "@canalaa.official";

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

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`CANALAA on Instagram ${INSTAGRAM_HANDLE}`}
              className="mt-1 inline-flex w-fit items-center gap-2 text-sm font-medium hover:opacity-60 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              {INSTAGRAM_HANDLE}
            </a>
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
