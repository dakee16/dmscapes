"use client";
import Link from "next/link";
import Wordmark from "@/components/site/Wordmark";
import ProfileMenu from "@/components/auth/ProfileMenu";
import s from "./Workspace.module.css";
export default function RoomAppHeader() {
  return <header className={s.topbar}><Wordmark/><nav aria-label="Your rooms"><Link href="/rooms" aria-current="page">My rooms</Link><Link href="/plan">Plan a room</Link><Link href="/account/billing">Plan &amp; billing</Link></nav><ProfileMenu/></header>;
}
