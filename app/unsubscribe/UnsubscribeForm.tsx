"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import css from "@/components/account/reset.module.css";

/** The confirm button. Without JavaScript the form still POSTs natively. */
export default function UnsubscribeForm({ u, t }: { u: string; t: string }) {
  const [state, setState] = useState<"ready" | "busy" | "done" | "error">("ready");
  const action = `/api/unsubscribe?${new URLSearchParams({ u, t })}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch(action, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div aria-live="polite">
      {state === "done" ? (
        <>
          <h1 className={css.title}>
            <b>You&apos;re</b>{" "}
            <i>unsubscribed.</i>
          </h1>
          <p className={css.lede}>
            No more tips and updates from dormscape. Receipts, room invites and password resets still arrive,
            since your account needs them.
          </p>
          <div className={css.actions}>
            <Link href="/plan" className="ds-btn ds-btn--ink-yellow">
              Plan a room <ArrowRight />
            </Link>
            <Link href="/account/settings#marketing-emails" className="ds-btn ds-btn--ghost-ink">
              Account settings
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className={css.title}>
            <b>Unsubscribe</b>{" "}
            <i>from updates?</i>
          </h1>
          <p className={css.lede}>
            You&apos;ll stop getting dorm planning tips and dormscape updates, sale emails included. Receipts,
            room invites and password resets still arrive.
          </p>
          <form action={action} method="post" onSubmit={submit} className={css.form}>
            {state === "error" && (
              <p className={css.error} role="alert">
                Couldn&apos;t save that. Try again in a minute.
              </p>
            )}
            <button type="submit" disabled={state === "busy"} className="ds-btn ds-btn--ink-yellow">
              {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
            </button>
          </form>
          <p className={`${css.status} ${css.note}`}>
            Changed your mind later? Turn them back on in{" "}
            <Link href="/account/settings#marketing-emails">Account settings</Link>.
          </p>
        </>
      )}
    </div>
  );
}
