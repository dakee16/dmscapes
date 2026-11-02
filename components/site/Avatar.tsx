/** Two letters for an avatar: "dm" from @dmainee, "JD" from Jane Doe or jane.doe. */
export function initialsOf(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const at = clean.indexOf("@");
  const base = at > 0 ? clean.slice(0, at) : clean.replace(/^@/, "");
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/** A profile photo when there is one (profiles.avatar_url), otherwise initials, inside
 *  the caller's styled circle. Decorative: the name always sits next to it. */
export default function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a 256 px square from our own bucket
        <img src={src} alt="" width={64} height={64} style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
