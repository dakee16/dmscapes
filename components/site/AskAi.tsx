"use client";

import { track } from "@/lib/analytics";
import { SITE_URL } from "@/lib/seo";
import css from "./AskAi.module.css";

// The question each assistant opens with. It points at the site and /llms.txt
// (prices and counts straight from the code) and doesn't ask for reviews,
// which an assistant would have to make up.
const PROMPT = `I'm a student planning my dorm room. Read ${SITE_URL}/ and ${SITE_URL}/llms.txt, then explain what dormscape does, how the planner works, what's free and what it costs, and how it compares with other dorm room planners.`;
const Q = encodeURIComponent(PROMPT);

const ENGINES = [
  { id: "chatgpt", label: "ChatGPT", href: `https://chatgpt.com/?q=${Q}` },
  { id: "claude", label: "Claude", href: `https://claude.ai/new?q=${Q}` },
  { id: "perplexity", label: "Perplexity", href: `https://www.perplexity.ai/search/new?q=${Q}` },
  { id: "google", label: "Google AI Mode", href: `https://www.google.com/search?udm=50&q=${Q}` },
  { id: "grok", label: "Grok", href: `https://x.com/i/grok?text=${Q}` },
] as const;

/** "Ask an AI about dormscape": each link opens an assistant with the question above. */
export default function AskAi({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <div className={`${css.ask} ${className}`} data-tone={tone}>
      <p className={css.label}>Ask an AI about dormscape</p>
      <ul className={css.list}>
        {ENGINES.map((e) => (
          <li key={e.id}>
            <a href={e.href} target="_blank" rel="noopener noreferrer" onClick={() => track("ai_ask_clicked", { engine: e.id })}>
              {e.label}
              <span className="ds-sr"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
