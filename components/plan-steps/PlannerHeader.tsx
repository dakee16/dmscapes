"use client";

import Link from "next/link";
import Wordmark from "@/components/site/Wordmark";
import ProfileMenu from "@/components/auth/ProfileMenu";
import PlannerSteps from "@/components/planner/PlannerSteps";
import { useAuth } from "@/lib/auth-context";
import css from "./Shell.module.css";

/** The planner's own app bar: wordmark, the step tape, My rooms and the profile menu. */
export default function PlannerHeader() {
  const { user } = useAuth();
  return (
    <header className={css.bar}>
      <Wordmark className={css.wordmark} />
      <PlannerSteps />
      <div className={css.actions}>
        {user && (
          <Link href="/rooms" className={css.rooms}>
            My rooms
          </Link>
        )}
        <div className={css.profile}>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
