"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import { AccountShell, IdentityCard, oauthLabel, accountStyles as s } from "@/components/account/AccountUI";
import { LinkIcon } from "@/components/account-ui/parts";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { passwordMeetsPolicy } from "@/lib/password";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import DeleteAccountSection from "@/components/account/DeleteAccountSection";
import type { UsernameCheckResponse } from "@/lib/api-types";

const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Tone = "good" | "bad" | "soft";
type Msg = { tone: Tone; text: string } | null;
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown";

function FieldMsg({ msg, className = "" }: { msg: Msg; className?: string }) {
  if (!msg) return null;
  return (
    <p className={`${s.msg} ${className}`} data-tone={msg.tone} role="status">
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
    <PageShell>
      <AccountShell active="profile">
        {!ready ? (
          <div className={s.loading} aria-busy="true" aria-label="Loading your settings">
            <div className={s.skeleton} />
            <div className={`${s.skeleton} ${s.skeletonTall}`} />
          </div>
        ) : (
          <>
            <header className={s.intro}>
              <p className={s.introEyebrow}>Profile &amp; sign-in</p>
              <h2 className={s.introTitle}>
                <b>Make it</b>
                <i>yours.</i>
              </h2>
              <p className={s.introLede}>
                The details behind your designs. Keep your profile and sign-in information up to date.
              </p>
            </header>

            <IdentityCard name={profile?.full_name} username={profile?.username} email={user?.email} />

            {/* Profile */}
            <section id="profile-details" className={`${s.card} ${s.section}`} aria-labelledby="profile-details-title">
              <p className={s.sectionEyebrow}>01 / Your identity</p>
              <h2 id="profile-details-title" className={s.cardTitle}>Profile details</h2>
              <p className={s.cardLede}>A name and handle that make every shared design yours.</p>
              <form onSubmit={saveProfile} className={s.form} noValidate>
                <div className={s.fields}>
                  <div>
                    <label htmlFor="set-name" className="ds-label">
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
                      className="ds-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="set-phone" className="ds-label">
                      Phone number <span className={s.optional}>(optional)</span>
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
                      className="ds-input"
                    />
                  </div>

                  <div className={s.full}>
                    <label htmlFor="set-username" className="ds-label">
                      Username
                    </label>
                    <div className={s.at}>
                      <span aria-hidden="true">@</span>
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
                      />
                    </div>
                    <FieldMsg msg={uHint} className={s.fieldMsg} />
                  </div>
                </div>

                <div className={s.formActions}>
                  <button
                    type="submit"
                    disabled={savingProfile || uStatus === "taken" || uStatus === "invalid"}
                    className="ds-btn ds-btn--ink-yellow"
                  >
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                  <FieldMsg msg={profileMsg} />
                </div>
              </form>
            </section>

            {/* Email */}
            <section id="email-details" className={`${s.card} ${s.section}`} aria-labelledby="email-details-title">
              <p className={s.sectionEyebrow}>02 / Stay connected</p>
              <h2 id="email-details-title" className={s.cardTitle}>Email address</h2>
              <p className={s.cardLede}>
                We&apos;ll send a confirmation link to the new address. Your email only changes once you click it.
              </p>
              <form onSubmit={saveEmail} className={s.form} noValidate>
                <div>
                  <label htmlFor="set-email" className="ds-label">
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
                    className="ds-input"
                  />
                </div>
                <div className={s.formActions}>
                  <button type="submit" disabled={savingEmail || !emailChanged} className="ds-btn ds-btn--ink-yellow">
                    {savingEmail ? "Sending…" : "Update email"}
                  </button>
                  <FieldMsg msg={emailMsg} />
                </div>
              </form>
            </section>

            {/* Password / provider */}
            <section id="security-details" className={`${s.card} ${s.section}`} aria-labelledby="security-details-title">
              <p className={s.sectionEyebrow}>03 / Just for you</p>
              <h2 id="security-details-title" className={s.cardTitle}>Sign-in &amp; security</h2>
              {isPasswordAccount ? (
                <form onSubmit={changePassword} className={s.form} noValidate>
                  <p className={s.cardLede} style={{ margin: 0 }}>
                    We verify your current password before changing it.
                  </p>
                  <div className={s.fields}>
                    <div className={s.full}>
                      <label htmlFor="set-curpw" className="ds-label">
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
                        className="ds-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="set-newpw" className="ds-label">
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
                        className="ds-input"
                      />
                      <PasswordChecklist password={newPw} />
                    </div>
                    <div>
                      <label htmlFor="set-confirmpw" className="ds-label">
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
                        className="ds-input"
                      />
                    </div>
                  </div>
                  <div className={s.formActions}>
                    <button type="submit" disabled={savingPw} className="ds-btn ds-btn--ink-yellow">
                      {savingPw ? "Updating…" : "Change password"}
                    </button>
                    <button type="button" onClick={sendReset} disabled={sendingReset} className={s.textBtn}>
                      {sendingReset ? "Sending…" : "Forgot your password?"}
                    </button>
                  </div>
                  <FieldMsg msg={pwMsg} />
                </form>
              ) : (
                <div className={s.oauth}>
                  <span aria-hidden="true">
                    <LinkIcon />
                  </span>
                  <p>
                    You&apos;re signed in with <strong>{oauthProvider}</strong>. There&apos;s no Dormscape password to
                    change. Manage your login from your {oauthProvider} account.
                  </p>
                </div>
              )}
            </section>

            <DeleteAccountSection onLeave={() => { guardedRef.current = true; }} />
          </>
        )}
      </AccountShell>
    </PageShell>
  );
}
