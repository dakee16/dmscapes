/** White graph-paper overlay for cobalt panels — same as the home page CTA. */
export default function PanelGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.12]"
      style={{
        backgroundImage:
          "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}
