/**
 * Renders one or more schema.org JSON-LD blocks. Server-renderable (no hooks),
 * so structured data ships in the initial HTML where crawlers and answer
 * engines actually read it. `<` is escaped so a stray string can't break out of
 * the script tag.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
