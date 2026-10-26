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
  meter = false,
}: {
  password: string;
  className?: string;
  /** Sign-up's look (Login.dc.html): a three-part strength meter above, met rules in green. */
  meter?: boolean;
}) {
  const list = (
    <ul className={`${css.list} ${className}`} aria-label="Password requirements" data-look={meter ? "meter" : undefined}>
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
  if (!meter) return list;
  return (
    <>
      <div className={css.meter} data-met={PASSWORD_RULES.filter((r) => r.test(password)).length} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {list}
    </>
  );
}
