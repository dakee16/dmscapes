// Whether this visitor needs to opt in before analytics runs (lib/consent.ts).
// Vercel sets x-vercel-ip-country at its edge. No header (local dev, an IP it
// can't place) counts as opt-in, the stricter rule.

// EU member states, their outermost regions with their own codes and Åland; the
// rest of the EEA; the UK, its Crown Dependencies and Gibraltar; Switzerland.
const OPT_IN = new Set(
  (
    "AT BE BG HR CY CZ DK EE FI FR DE GR IE IT LV LT LU MT NL PL PT RO SK SI ES SE " +
    "RE GP MQ GF YT MF AX IS LI NO GB JE GG IM GI CH"
  ).split(" "),
);

export function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  return Response.json({ optIn: !country || OPT_IN.has(country) }, { headers: { "Cache-Control": "private, no-store" } });
}
