"use client";

import { PASSWORD_RULES } from "@/lib/password";
import { Check } from "@/components/ds/Icons";
import css from "./PasswordChecklist.module.css";

/**
 * Live password-requirement checklist. Each rule flips to a checked mark the
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
    <ul className={`${css.list} ${className}`} aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className={css.rule} data-met={met}>
            <span className={css.mark} aria-hidden="true">
              {met && <Check size={11} strokeWidth={3.4} />}
            </span>
            <span>{rule.label}</span>
            <span className="ds-sr">{met ? " met" : " not met yet"}</span>
          </li>
        );
      })}
    </ul>
  );
}
