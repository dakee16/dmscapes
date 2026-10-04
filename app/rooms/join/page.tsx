"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { workspaceRequest } from "@/lib/workspace-client";
import Wordmark from "@/components/site/Wordmark";
import { ArrowRight } from "@/components/ds/Icons";
import s from "@/components/workspace/Join.module.css";

/** The invite landing (designs/my-room/Invite). The token lives in the URL hash
 * and only works for the email it was sent to; joining is free. */
export default function JoinRoomPage() {
  const { user, loading, signOut } = useAuth(), router = useRouter();
  const [token,setToken]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{setToken(location.hash.slice(1));},[]);
  async function join(){setBusy(true);setError("");try{const result=await workspaceRequest<{id:string}>("/api/workspaces/join",{method:"POST",body:JSON.stringify({token})});history.replaceState(null,"","/rooms/join");router.replace(`/rooms/${result.id}`);}catch(e){setError((e as Error).message);setBusy(false);}}
  async function switchAccount(){setBusy(true);setError("");try{await signOut();router.push(`/login?next=${encodeURIComponent(`/rooms/join#${token}`)}`);}catch{setError("Couldn't sign out. Try again.");}finally{setBusy(false);}}
  const login=`/login?next=${encodeURIComponent(`/rooms/join#${token}`)}`;
  return <div className={`ds ${s.page}`}>
    <header className={s.top}><Wordmark /></header>
    <main id="page-content" tabIndex={-1} className={s.main}>
      <section className={s.copy} aria-labelledby="join-title">
        <p className={s.from}><span aria-hidden="true">+</span>An invitation to plan a room together</p>
        <h1 id="join-title" className={s.title}><span>Your roommate saved you</span> <em>half a room.</em></h1>
        <p className={s.lede}>Pick your side&apos;s look, say what you&apos;re bringing, and talk it over in the room. Joining a Pro room is free.</p>
        {error&&<p role="alert" className={s.error}>{error}</p>}
        {!token?<div className={s.missing}><strong>This invitation is missing its link.</strong><p>Open the button in your invitation email again, or ask the room owner for a new one.</p><Link href="/rooms" className="ds-btn ds-btn--ghost-ink ds-btn--sm">Go to My designs</Link></div>
          :loading?<p className={s.checking} role="status">Checking your account…</p>
          :user?<div className={s.actions}>
            <button type="button" className={s.joinBtn} disabled={busy} onClick={()=>void join()}>{busy?"Joining…":"Join the room"}<ArrowRight size={18}/></button>
            <p className={s.as}>Joining as <strong>{user.email}</strong>. Use the same verified email that received the invitation.</p>
            <button type="button" disabled={busy} onClick={()=>void switchAccount()} className={s.switch}>Use another account</button>
          </div>
          :<div className={s.actions}>
            <Link className={s.joinBtn} href={login}>Sign in to join<ArrowRight size={18}/></Link>
            <p className={s.as}>New to Dormscape? Create a free account with Google or email on the next screen, using the address the invitation went to.</p>
          </div>}
        <p className={s.fine}>Joining is free. You won&apos;t need a plan, Pro or credits, and you&apos;ll never spend the host&apos;s.</p>
      </section>
      <section className={s.art} aria-label="How a shared room is split">
        <div className={s.artHead}><span>A shared double</span><span className={s.artLive}><i aria-hidden="true"/>Your roommate is planning</span></div>
        <div className={s.plan} aria-hidden="true">
          <span className={s.theirs}/><span className={s.yours}/>
          <span className={s.bedTheirs}/><span className={s.bedYours}><em>your bed</em></span>
          <span className={s.fridge}/><span className={s.rug}/>
          <span className={s.deskTheirs}/><span className={s.deskYours}/>
          <span className={s.tape}/>
          <span className={s.yourSide}>Your side</span>
        </div>
        <p className="ds-sr">An example plan: the room is split by a line of tape, your half on the right, your roommate&apos;s on the left, and shared things like the fridge and rug in the middle.</p>
        <div className={s.cards}>
          <div data-c="you"><strong>Your side</strong><p>Your bed, desk and closet, waiting for your style.</p></div>
          <div data-c="shared"><strong>The middle</strong><p>Shared things, and who&apos;s getting each one.</p></div>
          <div><strong>Notes</strong><p>Comments pinned to the plan, and a call when you want to talk.</p></div>
        </div>
      </section>
    </main>
  </div>;
}
