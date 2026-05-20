"use client";

import { buildGenericWhatsAppUrl } from "@/lib/whatsapp";
import { motion } from "motion/react";

export function StickyWAButton() {
  return (
    <motion.a
      href={buildGenericWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.97 }}
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-sm font-semibold text-background shadow-lg md:hidden"
    >
      <span aria-hidden>💬</span>
      ORDER VIA WHATSAPP
    </motion.a>
  );
}
