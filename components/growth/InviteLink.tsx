"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { bearer } from "@/lib/invites";
import g from "./Growth.module.css";

type Invite = { url: string; joined: number; designed: number };

/** The signed-in user's invite link with Copy (and the share sheet where the browser has one). */
export default function InviteLink({ from, showStats = false }: { from: string; showStats?: boolean }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    let live = true;
    setCanShare(typeof navigator.share === "function");
    void (async () => {
      const token = await bearer();
      if (!token) {
        if (live) setError("Sign in to get your invite link.");
        return;
      }
      const res = await fetch("/api/referrals", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      const data = (res ? await res.json().catch(() => null) : null) as (Invite & { error?: string }) | null;
      if (!live) return;
      if (res?.ok && data?.url) setInvite(data);
      else setError(data?.error ?? "Couldn't load your invite link. Try again in a minute.");
    })();
    return () => {
      live = false;
    };
  }, []);

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      track("referral_link_copied", { from });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the field selects on focus, so it can be copied by hand.
    }
  }

  async function share() {
    if (!invite) return;
    try {
      await navigator.share({
        title: "dormscape",
        text: "Plan your dorm room to the inch. When you make your first design, we both get a free one.",
        url: invite.url,
      });
      track("referral_link_shared", { from });
    } catch {
      // Cancelled.
    }
  }

  if (error) return <p className={g.error} role="alert">{error}</p>;
  return (
    <div className={g.invite}>
      <div className={g.row}>
        <input
          className={`ds-input ${g.link}`}
          readOnly
          value={invite ? invite.url.replace(/^https?:\/\//, "") : "Loading your link…"}
          aria-label="Your invite link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="ds-btn ds-btn--ink-yellow" onClick={copy} disabled={!invite}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      {canShare && (
        <button type="button" className={g.textBtn} onClick={share} disabled={!invite}>
          Share it another way
        </button>
      )}
      {showStats && invite && (
        <p className={g.stats}>
          {invite.joined} {invite.joined === 1 ? "friend" : "friends"} joined · {invite.designed} made their first design
        </p>
      )}
    </div>
  );
}
