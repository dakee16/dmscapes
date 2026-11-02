"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "@/components/ds/Icons";
import { LinkIcon } from "@/components/studio-ui/icons";

/**
 * Copy a link, and say so: the icon flips from a link to a tick and the label to
 * "Copied" (the copy feedback from Vengeance UI Share Sheet), then back.
 */
export default function CopyButton({
  text,
  label = "Copy link",
  className = "ds-btn ds-btn--ink-yellow",
  disabled,
  onCopied,
}: {
  text: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the link is on screen to copy by hand.
    }
  }
  return (
    <button type="button" className={className} onClick={copy} disabled={disabled} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? "done" : "copy"}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
        >
          {copied ? <Check size={16} /> : <LinkIcon size={16} />}
          {copied ? "Copied" : label}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
