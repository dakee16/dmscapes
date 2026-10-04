"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "@/components/ds/Icons";
import css from "./Post.module.css";

/**
 * The post's contents: built from its headings on the server, sticky beside
 * the article on desktop and folded above it on phones. Highlights the section
 * in view, and carries the copy-link and send-to-roommate actions.
 */
export default function PostToc({
  headings,
  title,
}: {
  headings: { id: string; text: string }[];
  title: string;
}) {
  const [active, setActive] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      let id: string | undefined;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= line) id = el.id;
        else break;
      }
      setActive(id);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [headings]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (msg: string) => {
    setNote(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 2400);
  };

  const pageUrl = () => window.location.href.split("#")[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      flash("Link copied");
    } catch {
      flash("Couldn't copy the link");
    }
  };

  const send = async () => {
    const url = pageUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* closed the share sheet */
      }
      return;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  };

  return (
    <nav className={css.toc} aria-label="In this guide" data-open={open || undefined}>
      <p className={css.tocLabel}>In this guide</p>
      <button
        type="button"
        className={css.tocToggle}
        aria-expanded={open}
        aria-controls="post-contents"
        onClick={() => setOpen((o) => !o)}
      >
        In this guide
        <span className={css.tocCount}>{headings.length} sections</span>
        <ChevronDown size={16} />
      </button>
      <ol id="post-contents" className={css.tocList}>
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              onClick={() => setOpen(false)}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
      <div className={css.tocShare}>
        <button type="button" onClick={copy}>
          Copy link
        </button>
        <button type="button" onClick={send}>
          Send to roommate
        </button>
      </div>
      <p className={css.tocNote} aria-live="polite">
        {note}
      </p>
    </nav>
  );
}
