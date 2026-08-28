"use client";

export type ProductTab = "list" | "catalog";

/**
 * Segmented tab switcher for the result page's product column, reusing the
 * header island's floating-pill treatment exactly (rounded-full, ink border,
 * translucent paper background, blur, soft drop shadow) so it reads as the same
 * design system. The active tab is filled with the brand highlight yellow; the
 * inactive one is quiet muted text.
 */
export default function ProductTabSwitcher({
  active,
  onChange,
}: {
  active: ProductTab;
  onChange: (tab: ProductTab) => void;
}) {
  const tabs: { id: ProductTab; label: string }[] = [
    { id: "list", label: "Shopping list" },
    { id: "catalog", label: "Add more" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Products"
      className="flex rounded-full border border-ink/10 bg-paper/80 p-1 shadow-[0_12px_34px_-14px_rgba(23,23,43,0.4)] backdrop-blur-md"
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-highlight text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
