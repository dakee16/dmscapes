// Amazon Creators API client — SERVER ONLY.
//
// Replaces the retired PA-API 5.0 (AWS SigV4 signing removed entirely). The
// Creators API uses OAuth 2.0 client-credentials instead: exchange the
// Credential ID + Secret for a short-lived bearer token (cached ~1h), then call
// the search endpoint with `Authorization: Bearer <token>`. The request/response
// shape is PA-API-like but lowerCamelCase (offers are under `offersV2`).
//
// Docs: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/

const TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const SEARCH_URL = "https://creatorsapi.amazon/catalog/v1/searchItems";
const SCOPE = "creatorsapi::default";
const MARKETPLACE = "www.amazon.com";

export interface CreatorsCreds {
  credentialId: string;
  credentialSecret: string;
  partnerTag: string;
}

/**
 * Present only when the Creators credentials + partner tag are set. Reads the
 * new AMAZON_CREATORS_* names first, then falls back to the old AMAZON_PAAPI_*
 * names — the same Credential ID/Secret work either way, so the integration is
 * live whether or not .env.local has been renamed. Values are trimmed.
 */
export function creatorsCreds(): CreatorsCreds | null {
  const credentialId = (
    process.env.AMAZON_CREATORS_CREDENTIAL_ID ?? process.env.AMAZON_PAAPI_ACCESS_KEY
  )?.trim();
  const credentialSecret = (
    process.env.AMAZON_CREATORS_CREDENTIAL_SECRET ?? process.env.AMAZON_PAAPI_SECRET_KEY
  )?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();
  if (!credentialId || !credentialSecret || !partnerTag) return null;
  return { credentialId, credentialSecret, partnerTag };
}

export const creatorsConfigured = (): boolean => creatorsCreds() !== null;

/** Non-secret diagnostic for the logs: which env names supplied the creds, the
 *  value lengths, and the public partner tag. */
export function creatorsDiagnostics(): {
  usingNewNames: boolean;
  credentialIdLen: number;
  credentialSecretLen: number;
  partnerTag: string;
} | null {
  const creds = creatorsCreds();
  if (!creds) return null;
  return {
    usingNewNames: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_ID),
    credentialIdLen: creds.credentialId.length,
    credentialSecretLen: creds.credentialSecret.length,
    partnerTag: creds.partnerTag,
  };
}

// ---- OAuth token cache (in-memory, refreshed just before expiry) -----------
let cachedToken: { token: string; expiresAt: number } | null = null;

/** Fetch a bearer token, reusing the cached one until ~60s before it expires. */
async function getAccessToken(creds: CreatorsCreds): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.credentialId,
      client_secret: creds.credentialSecret,
      scope: SCOPE,
    }),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    // LwA errors are JSON: { error, error_description }.
    let detail = text;
    try {
      const j = JSON.parse(text) as { error?: string; error_description?: string };
      detail = [j.error, j.error_description].filter(Boolean).join(", ") || text;
    } catch {
      /* keep raw */
    }
    throw new Error(`Creators OAuth token HTTP ${res.status}: ${detail}`);
  }
  const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Creators OAuth token: no access_token in response");
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

/** A single normalized Creators result (the subset the pipeline needs). */
export interface CreatorItem {
  asin: string;
  title: string;
  imageUrl: string | null;
  /** Price in dollars, or null when no buyable offer was returned. */
  price: number | null;
  detailPageUrl: string;
  isPrime: boolean;
  /** Star rating 0-5, or null if the API doesn't return it. */
  rating: number | null;
  /** Number of customer reviews, or null if the API doesn't return it. */
  reviewCount: number | null;
}

export interface CreatorsSearchOptions {
  keywords: string;
  searchIndex?: string;
  itemCount?: number;
  minPrice?: number;
  maxPrice?: number;
}

let rawLogged = false;

/** Pull a numeric value out of the possible offersV2 price shapes. */
function readPrice(item: RawItem): number | null {
  const listing = item.offersV2?.listings?.[0] ?? item.offers?.listings?.[0];
  const p = listing?.price;
  const raw = p?.money?.amount ?? p?.amount ?? p?.value ?? p?.displayAmount ?? null;
  if (raw == null) return null;
  const n = typeof raw === "string" ? parseFloat(raw.replace(/[^0-9.]/g, "")) : raw;
  return Number.isFinite(n) ? n : null;
}

/**
 * Live Creators API SearchItems. Throws on any failure so the caller can log it
 * and fall back to mock. Returns [] on an empty result set.
 */
export async function searchItems(opts: CreatorsSearchOptions): Promise<CreatorItem[]> {
  const creds = creatorsCreds();
  if (!creds) throw new Error("Creators API not configured");
  const token = await getAccessToken(creds);

  const body = {
    keywords: opts.keywords,
    marketplace: MARKETPLACE,
    partnerTag: creds.partnerTag,
    partnerType: "Associates",
    itemCount: Math.min(opts.itemCount ?? 5, 10),
    ...(opts.searchIndex ? { searchIndex: opts.searchIndex } : {}),
    ...(opts.minPrice ? { minPrice: Math.round(opts.minPrice * 100) } : {}),
    ...(opts.maxPrice ? { maxPrice: Math.round(opts.maxPrice * 100) } : {}),
    // Valid resource enum values confirmed live by the API's own 400 validation
    // error. customerReviews.starRating + customerReviews.count ARE supported by
    // the Creators API (PA-API 5.0 did not return these), so the live path can
    // apply the same rating/review quality bar as the curated catalog. There is
    // no Prime/deliveryInfo resource in this API version, so isPrime is dropped.
    resources: [
      "images.primary.large",
      "itemInfo.title",
      "offersV2.listings.price",
      "customerReviews.count",
      "customerReviews.starRating",
    ],
  };

  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-marketplace": MARKETPLACE,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as {
        message?: string;
        Message?: string;
        errors?: { code?: string; message?: string }[];
        __type?: string;
      };
      const code = j.__type ?? j.errors?.[0]?.code ?? "";
      const msg = j.message ?? j.Message ?? j.errors?.[0]?.message ?? "";
      detail = [code, msg].filter(Boolean).join(", ") || text;
    } catch {
      /* keep raw */
    }
    throw new Error(`Creators searchItems HTTP ${res.status}: ${detail}`);
  }

  const data = JSON.parse(text) as { searchResult?: { items?: RawItem[] } };
  // One-time raw sample so the exact response shape (and whether ratings/reviews
  // are present) is verifiable in the server logs during activation.
  if (!rawLogged) {
    rawLogged = true;
    console.log("[creators] first raw searchItems response:", text.slice(0, 1600));
  }

  const items = data.searchResult?.items ?? [];
  return items.map((it) => ({
    asin: it.asin ?? "",
    title: it.itemInfo?.title?.displayValue ?? "",
    imageUrl: it.images?.primary?.large?.url ?? it.images?.primary?.medium?.url ?? null,
    price: readPrice(it),
    detailPageUrl: it.detailPageUrl ?? it.detailPageURL ?? "",
    isPrime: it.offersV2?.listings?.[0]?.deliveryInfo?.isPrimeEligible ?? false,
    rating:
      it.customerReviews?.starRating?.value != null
        ? Number(it.customerReviews.starRating.value)
        : null,
    reviewCount: it.customerReviews?.count != null ? Number(it.customerReviews.count) : null,
  }));
}

// Loose shape of a Creators API item (fields are optional/defensive because the
// exact schema isn't fully published; the raw log above verifies the real one).
interface RawItem {
  asin?: string;
  detailPageUrl?: string;
  detailPageURL?: string;
  images?: { primary?: { large?: { url?: string }; medium?: { url?: string } } };
  itemInfo?: { title?: { displayValue?: string } };
  customerReviews?: { count?: number; starRating?: { value?: number | string } };
  offersV2?: { listings?: RawListing[] };
  offers?: { listings?: RawListing[] };
}
interface RawListing {
  price?: {
    money?: { amount?: number | string };
    amount?: number | string;
    value?: number | string;
    displayAmount?: string;
  };
  deliveryInfo?: { isPrimeEligible?: boolean };
}
