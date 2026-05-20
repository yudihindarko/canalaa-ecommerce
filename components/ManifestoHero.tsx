"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

const words = ["Less hype.", "More walk."];

export function ManifestoHero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
      <div className="flex flex-col justify-center">
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          {words.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.18, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-6 max-w-md"
        >
          <div className="h-px w-12 bg-foreground" />
          {/* <p className="mt-4 text-base text-muted md:text-lg">
            Less hype. More walk.
          </p> */}

          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          >
            LIHAT KOLEKSI
            <span aria-hidden>→</span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-cream md:aspect-auto md:min-h-[480px]"
      >
        <Image
          src="https://placehold.co/900x1100/f2ebdd/0a0a0a.png?text=MODEL+%E2%80%A2+RUNNER+BLACK&font=montserrat"
          alt="Model wearing CANALAA Runner Black"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover"
        />
      </motion.div>
    </section>
  );
}
