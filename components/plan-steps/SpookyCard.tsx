import { Check } from "@/components/ds/Icons";
import css from "./SpookyCard.module.css";

// The card's picture (design-handoff/halloween/VibeStep.dc.html): string lights
// on a dark striped wall, a bat, a pumpkin on the desk, an orange and black rug.
const ART = `<svg viewBox="0 0 340 172" preserveAspectRatio="xMidYMid slice"><defs><pattern id="spooky-wall" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="22" height="22" fill="#2A1F3A"/><rect width="9" height="22" fill="#33244A"/></pattern></defs><rect width="340" height="172" fill="url(#spooky-wall)"/><path d="M-4 14 Q85 52 170 22 T344 18" fill="none" stroke="#0E0B14" stroke-width="1.6"/>${[
  [22, 27, "#FF7A1A"], [56, 38, "#B58CFF"], [92, 43, "#FFC24B"], [128, 40, "#FF7A1A"], [166, 31, "#B58CFF"],
  [204, 29, "#FFC24B"], [242, 36, "#FF7A1A"], [280, 34, "#B58CFF"], [318, 24, "#FFC24B"],
].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}" opacity=".27"/><ellipse cx="${x}" cy="${y}" rx="4" ry="5.4" fill="${c}"/>`).join("")}<rect y="118" width="340" height="54" fill="#FF7A1A"/><rect y="118" width="340" height="7" fill="#0E0B14"/><rect y="134" width="340" height="7" fill="#0E0B14"/><rect y="150" width="340" height="7" fill="#0E0B14"/><g transform="translate(252 74)"><ellipse cx="14" cy="26" rx="12" ry="15" fill="#FF7A1A" stroke="#0E0B14" stroke-width="2"/><ellipse cx="36" cy="26" rx="12" ry="15" fill="#FF7A1A" stroke="#0E0B14" stroke-width="2"/><ellipse cx="25" cy="26" rx="9.5" ry="16" fill="#FF8F3A" stroke="#0E0B14" stroke-width="2"/><path d="M25 10c0-4 1.2-6.4 4.2-8" stroke="#7BBF5A" stroke-width="3.4" fill="none" stroke-linecap="round"/></g><g transform="translate(44 72) scale(1.5)" fill="#0E0B14"><path d="M20 15C18.6 12.6 16.4 11.6 13.6 12.2C12.6 10.2 10.4 9.2 7.8 9.8C7.4 7.6 5.4 6 2 5.8C6 4 10.6 3.6 14.4 5.6C15.6 4.6 16.6 4.4 17.6 4.8L18.4 2.6L19.4 4.4L20.6 4.4L21.6 2.6L22.4 4.8C23.4 4.4 24.4 4.6 25.6 5.6C29.4 3.6 34 4 38 5.8C34.6 6 32.6 7.6 32.2 9.8C29.6 9.2 27.4 10.2 26.4 12.2C23.6 11.6 21.4 12.6 20 15Z"/></g></svg>`;

/**
 * The limited Spooky Season vibe: a wide card above the vibe grid, shown only
 * inside the Halloween window. Free for everyone, so it never locks.
 */
export default function SpookyCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={css.card} aria-pressed={selected} data-selected={selected} onClick={onSelect}>
      <span className={css.art} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART }} />
      <span className={css.body}>
        <span className={css.eyebrow}>Limited · Halloween only</span>
        <span className={css.name}>Spooky Season</span>
        <span className={css.line}>
          Orange glow, bats on the wall, a pumpkin on the desk. A Halloween kit for the room you&rsquo;re already in.
        </span>
        <span className={css.tags}>
          <span className={css.tag} data-tone="pumpkin">Free · till Oct 31</span>
          <span className={css.tag}>No plan credit used</span>
          <span className={`${css.tag} ${css.range}`}>$25 to $200</span>
        </span>
      </span>
      {selected && (
        <span className={css.tick} aria-hidden="true">
          <Check size={16} strokeWidth={3.2} />
        </span>
      )}
    </button>
  );
}
