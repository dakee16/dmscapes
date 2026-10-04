/** A strip of measuring tape carrying a few facts (counts come from data). */
export default function TapeStats({ items, label }: { items: React.ReactNode[]; label?: string }) {
  return (
    <div className="ds-tape ds-tapestats" role="group" aria-label={label}>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
