"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPlusTier, isPro } from "@/lib/plan";

/**
 * The Dormscape wordmark: "dormscape" in Archivo plus a round dot, blue on
 * light grounds and a lighter blue on dark. Never pink. The tier marker (Plus
 * "+" or a "PRO" tag) is rendered here, inside the logo itself, so it appears
 * in every header the member sees. Free users just see "dormscape".
 */
export default function Wordmark({
  textClassName = "",
  tone = "light",
  className = "",
}: {
  textClassName?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const { profile } = useAuth();
  const plus = isPlusTier(profile);
  const pro = isPro(profile);

  return (
    <Link
      href="/"
      className={`ds-wordmark ${className}`}
      data-tone={tone}
      aria-label={
        pro ? "Dormscape Pro home" : plus ? "Dormscape Plus home" : "Dormscape home"
      }
    >
      <span className={`ds-wordmark__type ${textClassName}`}>
        dormscape
        <span className="ds-wordmark__dot" aria-hidden="true" />
      </span>
      {plus && (
        <span className="ds-wordmark__plus" title="You're on Dormscape Plus" aria-label="Plus">
          +
        </span>
      )}
      {pro && (
        <span className="ds-wordmark__pro" title="You're on Dormscape Pro" aria-label="Pro">
          Pro
        </span>
      )}
    </Link>
  );
}
