"use client";

import { PASSWORD_RULES } from "@/lib/password";

/**
 * Live password-requirement checklist. Each rule flips to a green check the
 * moment the current value satisfies it; unmet rules stay muted and neutral
 * (an empty circle, never alarming red) so the field doesn't feel punitive
 * before the user has finished typing.
 */
export default function PasswordChecklist({
  password,
  className = "",
}: {
  password: string;
  className?: string;
}) {
  return (
    <ul className={`mt-2 space-y-1 ${className}`} aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              met ? "text-[#1e7a3c]" : "text-ink-soft/70"
            }`}
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors ${
                met ? "bg-[#e8f5ec]" : "border border-ink/20"
              }`}
              aria-hidden="true"
            >
              {met && (
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>{rule.label}</span>
            <span className="sr-only">{met ? " met" : " not met yet"}</span>
          </li>
        );
      })}
    </ul>
  );
}
