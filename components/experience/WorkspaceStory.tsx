import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import s from "./HomeJourney.module.css";

export default function WorkspaceStory() {
  return <section id="together" className={s.roommates} aria-labelledby="roommates-title">
    <Reveal className={s.roommatesInner}>
      <div className={s.roommatesArt} aria-hidden="true"><div><span>You</span><span>J</span><span>A</span><span>M</span></div><p>ONE ROOM. YOUR PEOPLE.</p><span className={s.roommatesNote}>I'll bring the lamp. ✓</span></div>
      <div><p className={s.eyebrow}>Keep the plan. Bring your people.</p><h2 id="roommates-title">Move in.<br/><em>On the same page.</em></h2><p>Save your layout and shopping list in My rooms. With Pro, invite three roommates by email to edit, comment, and decide who brings what.</p><Link href="/rooms">Explore My rooms <span aria-hidden="true">↗</span></Link><small>One Pro host. Four people total. Friends join free.</small></div>
    </Reveal>
  </section>;
}
