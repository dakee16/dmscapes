import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import s from "@/components/site/Support.module.css";
export default function AccountDeletedPage() {
  return <><SiteHeader /><main id="page-content" className={s.page}><div className={s.success}>
    <span aria-hidden="true">✓</span><h1 className="text-3xl font-semibold">Account deleted.</h1>
    <p className="mt-4">You have been signed out. Your account and the rooms you owned have been removed.</p>
    <p>Remember to clear Dormscape drafts on any other devices you use.</p>
    <Link href="/" className={s.primary}>Back to Dormscape ↗</Link>
  </div></main></>;
}
