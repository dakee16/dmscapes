import { Check } from "@/components/ds/Icons";
import { lastDay, seasonOf } from "@/lib/season";
import { budgetRange } from "@/lib/styles";
import { usd } from "./room-model";
import css from "./SpookyCard.module.css";

// The card's picture: warm lights on a night-blue wall with a little snow, a
// stocking, a tabletop tree with a star, and a red and green plaid rug.
const BULBS = [[22, 27], [56, 38], [92, 43], [128, 40], [166, 31], [204, 29], [242, 36], [280, 34], [318, 24]];
const SNOW = [[30, 70], [74, 96], [118, 66], [150, 98], [190, 76], [214, 104], [312, 84], [104, 20], [262, 14]];
const ART = `<svg viewBox="0 0 340 172" preserveAspectRatio="xMidYMid slice"><defs><pattern id="holiday-wall" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="22" height="22" fill="#1B2A4A"/><rect width="9" height="22" fill="#22345A"/></pattern><pattern id="holiday-plaid" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#D7262E"/><rect width="10" height="28" fill="#2F5D45" opacity=".55"/><rect width="28" height="10" fill="#2F5D45" opacity=".55"/><rect x="20" width="2" height="28" fill="#F6EFE4" opacity=".7"/><rect y="20" width="28" height="2" fill="#F6EFE4" opacity=".7"/></pattern></defs><rect width="340" height="172" fill="url(#holiday-wall)"/>${SNOW.map(
  ([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff" opacity=".6"/>`,
).join("")}<path d="M-4 14 Q85 52 170 22 T344 18" fill="none" stroke="#0E1A2E" stroke-width="1.6"/>${BULBS.map(
  ([x, y], i) => `<circle cx="${x}" cy="${y}" r="10" fill="#FFD49A" opacity=".25"/><ellipse cx="${x}" cy="${y}" rx="4" ry="5.4" fill="${["#FFD49A", "#FFD83D", "#FFF1D6"][i % 3]}"/>`,
).join("")}<rect y="118" width="340" height="54" fill="url(#holiday-plaid)"/><rect y="118" width="340" height="4" fill="#0E1A2E" opacity=".35"/><g transform="translate(46 52)"><path d="M6 0h18v26c0 6 6 8 10 10s4 12-6 12c-6 0-10-3-14-7l-8-8C3 30 6 26 6 22z" fill="#D7262E" stroke="#0E1A2E" stroke-width="2" stroke-linejoin="round"/><rect x="3" y="-4" width="24" height="9" rx="3" fill="#F6EFE4" stroke="#0E1A2E" stroke-width="2"/></g><g transform="translate(234 30)" stroke="#0E1A2E" stroke-width="2" stroke-linejoin="round"><rect x="37" y="82" width="16" height="10" fill="#D7262E"/><path d="M45 34 82 82H8z" fill="#2F5D45"/><path d="M45 18 74 58H16z" fill="#3C7552"/><path d="M45 4 64 36H26z" fill="#2F5D45"/><path d="M45-6l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#FFD83D" stroke-width="1.4"/>${[
  [36, 30], [54, 46], [30, 66], [60, 72], [44, 56],
].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#FFD49A" stroke="none"/>`).join("")}</g></svg>`;

const RANGE = budgetRange("holiday");

/**
 * The limited Cozy Holiday vibe: a wide card above the vibe grid, shown only
 * inside the holiday season. Free for everyone, so it never locks.
 */
export default function HolidayCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`${css.card} ${css.holiday}`} aria-pressed={selected} data-selected={selected} onClick={onSelect}>
      <span className={css.art} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ART }} />
      <span className={css.body}>
        <span className={css.eyebrow}>Limited · Holiday season only</span>
        <span className={css.name}>Cozy Holiday</span>
        <span className={css.line}>
          Warm string lights, a little tree on the desk, a plaid throw. A holiday kit for the room you&rsquo;re already in.
        </span>
        <span className={css.tags}>
          <span className={css.tag} data-tone="holiday">Free · till {lastDay(seasonOf("holiday")!)}</span>
          <span className={css.tag}>No plan credit used</span>
          <span className={`${css.tag} ${css.range}`}>
            {usd(RANGE.min)} to {usd(RANGE.max)}
          </span>
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
