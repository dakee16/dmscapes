"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import AccountFrame, { Card, FieldMsg, RingAvatar, Row, Switch, type Msg } from "@/components/account/AccountFrame";
import { fmtDate, oauthLabel } from "@/components/account/AccountUI";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { passwordMeetsPolicy } from "@/lib/password";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import DeleteAccountSection from "@/components/account/DeleteAccountSection";
import ProfilePhoto, { PHOTO_HINT } from "@/components/account/ProfilePhoto";
import CreatorSection from "@/components/account/CreatorSection";
import type { UsernameCheckResponse } from "@/lib/api-types";
import c from "@/components/account/AccountPage.module.css";

const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown";
type Field = "full_name" | "username" | "phone" | "email" | "password";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal, refreshProfile, signOut } = useAuth();
  const { paused, toggle: toggleMotion } = useExperienceMotion();
  const guardedRef = useRef(false);

  // Access control: logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  // One field edits in place at a time; the last one saved shows SAVED.
  const [editing, setEditing] = useState<Field | null>(null);
  const [saved, setSaved] = useState<Field | null>(null);

  // ----- Profile fields (name, username, phone): the same profiles update as before -----
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [uStatus, setUStatus] = useState<UsernameStatus>("idle");

  const currentUsername = profile?.username ?? "";
  const usernameChanged = editing === "username" && username.trim() !== currentUsername;

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

  async function saveProfileField(e: React.FormEvent, field: "full_name" | "username" | "phone") {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || !user || savingProfile) return;
    const updates: Record<string, string | null> = {};
    if (field === "username") {
      const uname = username.trim();
      if (!usernameChanged) {
        setEditing(null);
        return;
      }
      if (!uname) {
        setProfileMsg({ tone: "bad", text: "Username can't be empty." });
        return;
      }
      if (!USERNAME_RE.test(uname)) {
        setProfileMsg({ tone: "bad", text: "Username must be 3-20 characters: letters, numbers, underscore, period." });
        return;
      }
      updates.username = uname;
    } else if (field === "full_name") {
      updates.full_name = fullName.trim() || null;
    } else {
      updates.phone = phone.trim() || null;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (error) {
        if (error.code === "23505") {
          setProfileMsg({ tone: "bad", text: "That username is taken. Try another." });
        } else if (/column .* does not exist/i.test(error.message)) {
          setProfileMsg({ tone: "bad", text: "Name and phone need database migration 0007 applied first." });
        } else {
          setProfileMsg({ tone: "bad", text: "Couldn't save. Try again in a minute." });
        }
        return;
      }
      await refreshProfile();
      setEditing(null);
      setSaved(field);
    } finally {
      setSavingProfile(false);
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
        return { tone: "bad", text: "3-20 characters; letters, numbers, underscore, period." };
      case "unknown":
        return { tone: "soft", text: "We'll double-check when you save." };
      default:
        return null;
    }
  })();

  // ----- Marketing email opt-in (profiles.marketing_opt_in_at) -----
  const [savingOptIn, setSavingOptIn] = useState(false);
  const [optInMsg, setOptInMsg] = useState<Msg>(null);
  const optedIn = Boolean(profile?.marketing_opt_in_at);

  async function toggleMarketing() {
    const supabase = getBrowserClient();
    if (!supabase || !user || savingOptIn) return;
    setSavingOptIn(true);
    setOptInMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ marketing_opt_in_at: optedIn ? null : new Date().toISOString() })
        .eq("id", user.id);
      if (error) {
        setOptInMsg({ tone: "bad", text: "Couldn't save. Try again in a minute." });
        return;
      }
      await refreshProfile();
      setOptInMsg({ tone: "good", text: optedIn ? "Unsubscribed." : "Subscribed." });
    } finally {
      setSavingOptIn(false);
    }
  }

  // ----- Email (verification-based change) -----
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();

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
      const { error } = await supabase.auth.updateUser({ email: mail }, { emailRedirectTo: `${window.location.origin}/account/settings` });
      if (error) {
        setEmailMsg({ tone: "bad", text: error.message });
        return;
      }
      setEditing(null);
      setEmailMsg({ tone: "good", text: `Check ${mail} for a confirmation link. Your email changes once you confirm it.` });
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
      setPwMsg({ tone: "bad", text: "New password needs 8 to 12 characters, an uppercase letter, and a special character." });
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
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: curPw });
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
      setEditing(null);
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
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) {
        setPwMsg({ tone: "bad", text: error.message });
        return;
      }
      setPwMsg({ tone: "good", text: `Sent a reset link to ${user.email}. Follow it to set a new password.` });
    } finally {
      setSendingReset(false);
    }
  }

  // ----- This device -----
  const [loggingOut, setLoggingOut] = useState(false);
  async function logOut() {
    setLoggingOut(true);
    guardedRef.current = true;
    await signOut();
    router.replace("/");
  }

  const ready = !loading && Boolean(user);
  const creator = Boolean(profile?.creator_at);
  const memberSince = profile?.created_at ? fmtDate(profile.created_at, { year: "numeric", month: "long" }) : null;
  const savedTag = (f: Field) => saved === f && <span className={c.saved}>SAVED</span>;
  const cancel = () => {
    setEditing(null);
    setProfileMsg(null);
    setEmailMsg(null);
    setPwMsg(null);
  };
  const editBtn = (f: Field, seed: () => void, label = "Change") => (
    <button
      type="button"
      className={`${c.btn} ${c.line}`}
      onClick={() => {
        seed();
        setEditing(f);
        setSaved(null);
        setProfileMsg(null);
      }}
    >
      {label}
    </button>
  );
  const formButtons = (busy: boolean, busyLabel: string, label: string, disabled = false) => (
    <>
      <button type="submit" className={`${c.btn} ${c.ink}`} disabled={busy || disabled}>
        {busy ? busyLabel : label}
      </button>
      <button type="button" className={`${c.btn} ${c.ghost}`} onClick={cancel} disabled={busy}>
        Cancel
      </button>
    </>
  );

  return (
    <PageShell navOverlay>
      <AccountFrame page="settings" title={["Account", "settings."]} sub="Your profile, sign-in, emails and preferences." ready={ready}>
        {!ready ? (
          <>
            <div className={c.skel} aria-busy="true" aria-label="Loading your settings" />
            <div className={`${c.skel} ${c.skelShort}`} />
          </>
        ) : (
          <>
            <Card id="profile" title="Profile" purpose="How you appear to roommates in My Room and on room invites.">
              <Row
                label="Picture"
                value={
                  <span className={c.photo}>
                    <RingAvatar size={64} />
                    <span>
                      {profile?.avatar_url ? "Your photo" : "Your initials, in your plan's colours."}
                      <span className={c.helper} style={{ display: "block" }}>
                        {PHOTO_HINT}
                      </span>
                    </span>
                  </span>
                }
                action={<ProfilePhoto />}
              />

              {editing === "full_name" ? (
                <Row label={<label htmlFor="set-name">Full name</label>} wide>
                  <form className={c.edit} onSubmit={(e) => saveProfileField(e, "full_name")} noValidate>
                    <input id="set-name" className={c.input} type="text" autoComplete="name" value={fullName} autoFocus placeholder="Alex Rivera" onChange={(e) => setFullName(e.target.value)} />
                    {formButtons(savingProfile, "Saving…", "Save")}
                  </form>
                  <FieldMsg msg={profileMsg} />
                </Row>
              ) : (
                <Row
                  label="Full name"
                  value={
                    <>
                      {profile?.full_name?.trim() || <span className={c.muted}>Not added</span>}
                      {savedTag("full_name")}
                    </>
                  }
                  action={editBtn("full_name", () => setFullName(profile?.full_name ?? ""), profile?.full_name ? "Change" : "Add")}
                />
              )}

              {editing === "username" ? (
                <Row label={<label htmlFor="set-username">Username</label>} wide>
                  <form className={c.edit} onSubmit={(e) => saveProfileField(e, "username")} noValidate>
                    <span className={c.at}>
                      <span aria-hidden="true">@</span>
                      <input
                        id="set-username"
                        type="text"
                        autoComplete="username"
                        maxLength={20}
                        value={username}
                        autoFocus
                        placeholder="dormdesigner"
                        aria-describedby="set-username-hint"
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setProfileMsg(null);
                        }}
                      />
                    </span>
                    {formButtons(savingProfile, "Saving…", "Save", uStatus === "taken" || uStatus === "invalid")}
                  </form>
                  <div id="set-username-hint">
                    <FieldMsg msg={profileMsg ?? uHint} />
                  </div>
                </Row>
              ) : (
                <Row
                  label="Username"
                  value={
                    <>
                      {currentUsername ? `@${currentUsername}` : <span className={c.muted}>Not set</span>}
                      {savedTag("username")}
                    </>
                  }
                  helper={creator ? "Creators keep their username: it’s your creator code and your name on gallery layouts." : undefined}
                  action={!creator && editBtn("username", () => setUsername(currentUsername), currentUsername ? "Change" : "Add")}
                />
              )}

              {editing === "phone" ? (
                <Row label={<label htmlFor="set-phone">Phone number</label>} wide>
                  <form className={c.edit} onSubmit={(e) => saveProfileField(e, "phone")} noValidate>
                    <input id="set-phone" className={c.input} type="tel" autoComplete="tel" value={phone} autoFocus placeholder="(555) 123-4567" onChange={(e) => setPhone(e.target.value)} />
                    {formButtons(savingProfile, "Saving…", "Save")}
                  </form>
                  <FieldMsg msg={profileMsg} />
                </Row>
              ) : (
                <Row
                  label="Phone number"
                  value={
                    <>
                      {profile?.phone?.trim() || <span className={c.muted}>Optional</span>}
                      {savedTag("phone")}
                    </>
                  }
                  action={editBtn("phone", () => setPhone(profile?.phone ?? ""), profile?.phone ? "Change" : "Add")}
                />
              )}

              {editing === "email" ? (
                <Row label={<label htmlFor="set-email">Email</label>} wide>
                  <form className={c.edit} onSubmit={saveEmail} noValidate>
                    <input id="set-email" className={c.input} type="email" autoComplete="email" value={email} autoFocus placeholder="you@school.edu" onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailMsg(null);
                    }} />
                    {formButtons(savingEmail, "Sending…", "Update email", !emailChanged)}
                  </form>
                  <p className={c.helper}>We&apos;ll send a confirmation link to the new address. Your email only changes once you click it.</p>
                  <FieldMsg msg={emailMsg} />
                </Row>
              ) : (
                <Row label="Email" value={user?.email} helper="Used to sign in and for receipts and invites." action={editBtn("email", () => setEmail(user?.email ?? ""))}>
                  <FieldMsg msg={emailMsg} />
                </Row>
              )}

              {memberSince && <Row label="Member since" value={memberSince} />}
            </Card>

            <CreatorSection eyebrow="Creators" />

            <Card id="security" title="Sign-in and security" purpose="Keep your account safe.">
              {!isPasswordAccount ? (
                <Row
                  label="Password"
                  value={`Signed in with ${oauthProvider}`}
                  helper={`There’s no dormscape password to change. Manage your login from your ${oauthProvider} account.`}
                />
              ) : editing === "password" ? (
                <Row label="Password" wide>
                  <form onSubmit={changePassword} className={c.pwForm} noValidate>
                    <p className={c.helper}>We verify your current password before changing it.</p>
                    <div className={c.pwGrid}>
                      <div className={c.full}>
                        <label htmlFor="set-curpw">Current password</label>
                        <input id="set-curpw" className={c.input} type="password" autoComplete="current-password" value={curPw} autoFocus placeholder="Your current password" onChange={(e) => {
                          setCurPw(e.target.value);
                          setPwMsg(null);
                        }} />
                      </div>
                      <div>
                        <label htmlFor="set-newpw">New password</label>
                        <input id="set-newpw" className={c.input} type="password" autoComplete="new-password" value={newPw} placeholder="8 to 12 characters" onChange={(e) => {
                          setNewPw(e.target.value);
                          setPwMsg(null);
                        }} />
                        <PasswordChecklist password={newPw} />
                      </div>
                      <div>
                        <label htmlFor="set-confirmpw">Confirm new password</label>
                        <input id="set-confirmpw" className={c.input} type="password" autoComplete="new-password" value={confirmPw} placeholder="Re-enter the new password" onChange={(e) => {
                          setConfirmPw(e.target.value);
                          setPwMsg(null);
                        }} />
                      </div>
                    </div>
                    <div className={c.edit}>
                      {formButtons(savingPw, "Updating…", "Change password")}
                      <button type="button" onClick={sendReset} disabled={sendingReset} className={c.textBtn}>
                        {sendingReset ? "Sending…" : "Forgot your password?"}
                      </button>
                    </div>
                    <FieldMsg msg={pwMsg} />
                  </form>
                </Row>
              ) : (
                <Row
                  label="Password"
                  value={<span className={c.dots}>••••••••</span>}
                  helper="We'll email you a link to set a new one."
                  action={
                    <>
                      <button type="button" className={`${c.btn} ${c.line}`} onClick={sendReset} disabled={sendingReset}>
                        {sendingReset ? "Sending…" : "Send reset link"}
                      </button>
                      {editBtn("password", () => setPwMsg(null))}
                    </>
                  }
                >
                  <FieldMsg msg={pwMsg} />
                </Row>
              )}
              <Row
                label="This device"
                value="Signed in"
                helper="Log out here when you're on a shared computer."
                action={
                  <button type="button" className={`${c.btn} ${c.line}`} onClick={logOut} disabled={loggingOut}>
                    {loggingOut ? "Logging out…" : "Log out"}
                  </button>
                }
              />
            </Card>

            <Card id="emails" title="Emails" purpose="Choose what lands in your inbox.">
              <Row
                id="marketing-emails"
                label="Tips and updates"
                labelId="emails-tips-label"
                value="Dorm planning tips and dormscape updates"
                helper="Unsubscribe anytime."
                action={<Switch on={optedIn} labelledBy="emails-tips-label" onToggle={toggleMarketing} disabled={savingOptIn} />}
              >
                <FieldMsg msg={optInMsg} />
              </Row>
              <Row
                label="Account emails"
                value="Receipts, room invites and password resets"
                helper="Needed to run your account."
                action={<span className={`${c.chip} ${c.green}`}>Always on</span>}
              />
            </Card>

            <Card id="prefs" title="Preferences" purpose="How the site looks and moves for you.">
              <Row
                label="Motion"
                labelId="prefs-motion-label"
                value="Animations across the site"
                helper="Turn off for a still page. Your device's reduce-motion setting is respected either way."
                action={<Switch on={!paused} labelledBy="prefs-motion-label" onToggle={toggleMotion} />}
              />
            </Card>

            <DeleteAccountSection onLeave={() => { guardedRef.current = true; }} />
          </>
        )}
      </AccountFrame>
    </PageShell>
  );
}
