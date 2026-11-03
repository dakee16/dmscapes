import Link from "next/link";
import { FOUNDER } from "@/lib/seo";

/** The author byline link: the founder's name, to their section on /about. */
export default function FounderLink({ className = "ds-link" }: { className?: string }) {
  return (
    <Link href={FOUNDER.path} className={className} rel="author">
      {FOUNDER.name}
    </Link>
  );
}
