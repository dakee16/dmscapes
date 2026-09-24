"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountHeader, IdentityCard, accountStyles as s } from "@/components/account/AccountUI";
import SiteHeader from "@/components/site/SiteHeader";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { passwordMeetsPolicy } from "@/lib/password";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import type { UsernameCheckResponse } from "@/lib/api-types";

const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Tone = "good" | "bad" | "soft";
type Msg = { tone: Tone; text: string } | null;
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown";

/** Map the stored auth provider to a display name, or null for email/password. */
function oauthLabel(provider: string | null | undefined): string | null {
  switch ((provider ?? "").toLowerCase()) {
    case "google":
      return "Google";
    case "azure":
    case "microsoft":
      return "Microsoft";
    default:
      return null;
  }
}

const INPUT = s.input;
const LABEL = s.label;
const BTN_PRIMARY = s.primary;
const CARD = s.settingsSection;

function toneClass(tone: Tone): string {
  return tone === "bad"
    ? "text-[#c2321e]"
    : tone === "good"
      ? "text-cobalt"
      : "text-ink-soft";
}

function FieldMsg({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={`mt-2 font-mono text-xs ${toneClass(msg.tone)}`} role="status">
      {msg.text}
    </p>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal, refreshProfile } = useAuth();

  const guardedRef = useRef(false);

  // Access control: logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  // ----- Profile (name / username / phone) -----
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [profileInit, setProfileInit] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [uStatus, setUStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    if (profile && !profileInit) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setUsername(profile.username ?? "");
      setProfileInit(true);
    }
  }, [profile, profileInit]);

  const currentUsername = profile?.username ?? "";
  const usernameChanged = username.trim() !== currentUsername;

  // Debounced availability check, only when the handle actually changed.
  useEffect(() => {
    if (!usernameChanged) {
      setUStatus("idle");
      return;
    }
    const value = username.trim();
    if (!value) {
      setUStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(value)) {
      setUStatus("invalid");
      return;
    }
    setUStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?u=${encodeURIComponent(value)}`);
        const data = (await res.json()) as UsernameCheckResponse;
        if (data.available === null) setUStatus("unknown");
        else setUStatus(data.available ? "available" : "taken");
      } catch {
        setUStatus("unknown");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, usernameChanged]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || !user || savingProfile) return;
    const uname = username.trim();
    if (usernameChanged) {
      if (!uname) {
        setProfileMsg({ tone: "bad", text: "Username can't be empty." });
        return;
      }
      if (!USERNAME_RE.test(uname)) {
        setProfileMsg({
          tone: "bad",
          text: "Username must be 3-20 characters: letters, numbers, underscore, period.",
        });
        return;
      }
    }
    setSavingProfile(true);
    setProfileMsg(null);
    const updates: Record<string, string | null> = {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    };
    if (usernameChanged) updates.username = uname;
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") {
          setProfileMsg({ tone: "bad", text: "That username is taken. Try another." });
        } else if (/column .* does not exist/i.test(error.message)) {
          setProfileMsg({
            tone: "bad",
            text: "Name and phone need database migration 0007 applied first.",
          });
        } else {
          setProfileMsg({ tone: "bad", text: "Couldn't save. Try again in a minute." });
        }
        return;
      }
      await refreshProfile();
      setProfileMsg({ tone: "good", text: "Saved." });
    } finally {
      setSavingProfile(false);
    }
  }

  // ----- Email (verification-based change) -----
  const [email, setEmail] = useState("");
  const [emailInit, setEmailInit] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);

  useEffect(() => {
    if (user?.email && !emailInit) {
      setEmail(user.email);
      setEmailInit(true);
    }
  }, [user, emailInit]);

  const emailChanged =
    email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || savingEmail) return;
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setEmailMsg({ tone: "bad", text: "That email doesn't look right." });
      return;
    }
    if (!emailChanged) {
      setEmailMsg({ tone: "soft", text: "That's already your email." });
      return;
    }
    setSavingEmail(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: mail },
        { emailRedirectTo: `${window.location.origin}/account/settings` }
      );
      if (error) {
        setEmailMsg({ tone: "bad", text: error.message });
        return;
      }
      setEmailMsg({
        tone: "good",
        text: `Check ${mail} for a confirmation link. Your email changes once you confirm it.`,
      });
    } finally {
      setSavingEmail(false);
    }
  }

  // ----- Password (email/password accounts only) -----
  const oauthProvider = oauthLabel(profile?.auth_provider);
  const isPasswordAccount = oauthProvider === null;

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || !user?.email || savingPw) return;
    if (!passwordMeetsPolicy(newPw)) {
      setPwMsg({
        tone: "bad",
        text: "New password needs 8 to 12 characters, an uppercase letter, and a special character.",
      });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ tone: "bad", text: "New passwords don't match." });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    try {
      // Re-authenticate to confirm the current password before changing it.
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: curPw,
      });
      if (reauthErr) {
        setPwMsg({ tone: "bad", text: "Current password is incorrect." });
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) {
        setPwMsg({ tone: "bad", text: updErr.message });
        return;
      }
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg({ tone: "good", text: "Password updated." });
    } finally {
      setSavingPw(false);
    }
  }

  async function sendReset() {
    const supabase = getBrowserClient();
    if (!supabase || !user?.email || sendingReset) return;
    setSendingReset(true);
    setPwMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setPwMsg({ tone: "bad", text: error.message });
        return;
      }
      setPwMsg({
        tone: "good",
        text: `Sent a reset link to ${user.email}. Follow it to set a new password.`,
      });
    } finally {
      setSendingReset(false);
    }
  }

  const uHint: Msg = (() => {
    if (!usernameChanged || !username.trim()) return null;
    switch (uStatus) {
      case "checking":
        return { tone: "soft", text: "Checking…" };
      case "available":
        return { tone: "good", text: `@${username.trim()} is available` };
      case "taken":
        return { tone: "bad", text: "Taken. Try another." };
      case "invalid":
        return {
          tone: "bad",
          text: "3-20 characters; letters, numbers, underscore, period.",
        };
      case "unknown":
        return { tone: "soft", text: "We'll double-check when you save." };
      default:
        return null;
    }
  })();

  const ready = !loading && Boolean(user);

  return (
    <div>
      <SiteHeader />
      <main id="page-content" tabIndex={-1} className={`dm-page ${s.page}`}>
        <AccountHeader active="settings" title="Make it" accent="yours." />
        {!ready ? (
          <div aria-busy="true" aria-label="Loading your settings">
            <div className="h-9 w-48 animate-pulse rounded-lg bg-ink/8" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-ink/5" />
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-ink/8" />
              <div className="h-64 animate-pulse rounded-2xl bg-ink/8" />
            </div>
          </div>
        ) : (
          <>
            <div className={s.settingsLayout}>
              <aside className={s.settingsAside}>
                <IdentityCard name={profile?.full_name} username={profile?.username} email={user?.email} />
                <nav className={s.settingsLinks} aria-label="Settings sections">
                  <a href="#profile-details">Profile <span aria-hidden="true">↘︎</span></a>
                  <a href="#email-details">Email <span aria-hidden="true">↘︎</span></a>
                  <a href="#security-details">Security <span aria-hidden="true">↘︎</span></a>
                </nav>
              </aside>
              <div className={s.stack}>
              {/* Profile */}
              <section id="profile-details" className={CARD}>
              <p className={s.eyebrow}>01 / Your identity</p>
              <h2>Profile details</h2>
              <form onSubmit={saveProfile} className="mt-4 space-y-4" noValidate>
                <div>
                  <label htmlFor="set-name" className={LABEL}>
                    Full name
                  </label>
                  <input
                    id="set-name"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setProfileMsg(null);
                    }}
                    placeholder="Alex Rivera"
                    className={INPUT}
                  />
                </div>

                <div>
                  <label htmlFor="set-username" className={LABEL}>
                    Username
                  </label>
                  <div className={s.usernameField}>
                    <span className="font-mono text-sm text-ink-soft" aria-hidden="true">
                      @
                    </span>
                    <input
                      id="set-username"
                      type="text"
                      autoComplete="username"
                      maxLength={20}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setProfileMsg(null);
                      }}
                      placeholder="dormdesigner"
                      className="focus-quiet"
                    />
                  </div>
                  <FieldMsg msg={uHint} />
                </div>

                <div>
                  <label htmlFor="set-phone" className={LABEL}>
                    Phone number{" "}
                    <span className="font-normal text-ink-soft">(optional)</span>
                  </label>
                  <input
                    id="set-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setProfileMsg(null);
                    }}
                    placeholder="(555) 123-4567"
                    className={INPUT}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={savingProfile || uStatus === "taken" || uStatus === "invalid"}
                    className={BTN_PRIMARY}
                  >
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                  <FieldMsg msg={profileMsg} />
                </div>
              </form>
            </section>

              <div className={s.stack}>
                {/* Email */}
                <section id="email-details" className={CARD}>
              <p className={s.eyebrow}>02 / Stay connected</p>
              <h2>Email address</h2>
              <p className="mt-1 text-sm text-ink-soft">
                We&apos;ll send a confirmation link to the new address. Your email
                only changes once you click it.
              </p>
              <form onSubmit={saveEmail} className="mt-4 space-y-4" noValidate>
                <div>
                  <label htmlFor="set-email" className={LABEL}>
                    Email address
                  </label>
                  <input
                    id="set-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailMsg(null);
                    }}
                    placeholder="you@school.edu"
                    className={INPUT}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={savingEmail || !emailChanged}
                    className={BTN_PRIMARY}
                  >
                    {savingEmail ? "Sending…" : "Update email"}
                  </button>
                  <FieldMsg msg={emailMsg} />
                </div>
              </form>
            </section>

                {/* Password / provider */}
                <section id="security-details" className={CARD}>
              <p className={s.eyebrow}>03 / Just for you</p>
              <h2>Sign-in &amp; security</h2>
              {isPasswordAccount ? (
                <form onSubmit={changePassword} className="mt-4 space-y-4" noValidate>
                  <p className="text-sm text-ink-soft">
                    We verify your current password before changing it.
                  </p>
                  <div>
                    <label htmlFor="set-curpw" className={LABEL}>
                      Current password
                    </label>
                    <input
                      id="set-curpw"
                      type="password"
                      autoComplete="current-password"
                      value={curPw}
                      onChange={(e) => {
                        setCurPw(e.target.value);
                        setPwMsg(null);
                      }}
                      placeholder="Your current password"
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label htmlFor="set-newpw" className={LABEL}>
                      New password
                    </label>
                    <input
                      id="set-newpw"
                      type="password"
                      autoComplete="new-password"
                      value={newPw}
                      onChange={(e) => {
                        setNewPw(e.target.value);
                        setPwMsg(null);
                      }}
                      placeholder="8 to 12 characters"
                      className={INPUT}
                    />
                    <PasswordChecklist password={newPw} />
                  </div>
                  <div>
                    <label htmlFor="set-confirmpw" className={LABEL}>
                      Confirm new password
                    </label>
                    <input
                      id="set-confirmpw"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPw}
                      onChange={(e) => {
                        setConfirmPw(e.target.value);
                        setPwMsg(null);
                      }}
                      placeholder="Re-enter the new password"
                      className={INPUT}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <button type="submit" disabled={savingPw} className={BTN_PRIMARY}>
                      {savingPw ? "Updating…" : "Change password"}
                    </button>
                    <button
                      type="button"
                      onClick={sendReset}
                      disabled={sendingReset}
                      className="cursor-pointer text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-60"
                    >
                      {sendingReset ? "Sending…" : "Forgot your password?"}
                    </button>
                  </div>
                  <FieldMsg msg={pwMsg} />
                </form>
              ) : (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3.5">
                  <span
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white"
                    aria-hidden="true"
                  >
                    🔗
                  </span>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    You&apos;re signed in with{" "}
                    <strong className="font-semibold text-ink">{oauthProvider}</strong>.
                    There&apos;s no Dormscape password to change. Manage your login
                    from your {oauthProvider} account.
                  </p>
                </div>
              )}
                </section>
              </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
