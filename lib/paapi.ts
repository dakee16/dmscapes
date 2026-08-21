// Amazon Product Advertising API (PA-API 5.0) client, SERVER ONLY.
//
// ⚠️ ACTIVATION REQUIRED. This talks to Amazon's *official* API (never scraping,
// which violates Amazon's ToS and risks the affiliate account). It is NOT wired
// to live credentials yet:
//   • paapiConfigured() is false until AMAZON_PAAPI_ACCESS_KEY,
//     AMAZON_PAAPI_SECRET_KEY, and AMAZON_PARTNER_TAG exist in the environment.
//   • Until then, callers fall back to a CLEARLY-MARKED mock (see
//     app/api/vibe/generate). No fake API is presented as real.
//
// The signing below follows the AWS Signature V4 + PA-API 5.0 spec. It is
// implemented but UNVERIFIED against a live endpoint (we have no keys). Before
// launch: obtain PA-API access (Associates account with ≥3 qualifying sales →
// Associates Central → Tools → Product Advertising API), set the env vars, and
// verify one live SearchItems call end to end.
import crypto from "node:crypto";

const HOST = "webservices.amazon.com";
const REGION = "us-east-1";
const SERVICE = "ProductAdvertisingAPI";
const PATH = "/paapi5/searchitems";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

export interface PaapiCreds {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
}

/** Present only when all three PA-API env vars are set. Values are trimmed:
 *  a stray newline/space pasted into .env.local corrupts the SigV4 signature
 *  (or the access key) and yields Amazon's opaque "invalid token" error. */
export function paapiCreds(): PaapiCreds | null {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY?.trim();
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY?.trim();
  const partnerTag = process.env.AMAZON_PARTNER_TAG?.trim();
  if (!accessKey || !secretKey || !partnerTag) return null;
  return { accessKey, secretKey, partnerTag };
}

export const paapiConfigured = (): boolean => paapiCreds() !== null;

/** Non-secret shape for a one-time diagnostic log (lengths only, plus the
 *  public partner tag). PA-API access keys are 20 chars and secrets 40; a length
 *  that's off points straight at a truncated/whitespaced paste. Also flags when
 *  trimming actually changed a value (i.e. there WAS stray whitespace). */
export function paapiDiagnostics(): {
  accessKeyLen: number;
  secretKeyLen: number;
  partnerTag: string;
  hadWhitespace: boolean;
} | null {
  const rawAccess = process.env.AMAZON_PAAPI_ACCESS_KEY;
  const rawSecret = process.env.AMAZON_PAAPI_SECRET_KEY;
  const rawTag = process.env.AMAZON_PARTNER_TAG;
  const creds = paapiCreds();
  if (!creds) return null;
  return {
    accessKeyLen: creds.accessKey.length,
    secretKeyLen: creds.secretKey.length,
    partnerTag: creds.partnerTag,
    hadWhitespace:
      rawAccess !== creds.accessKey ||
      rawSecret !== creds.secretKey ||
      rawTag !== creds.partnerTag,
  };
}

/** A single normalized PA-API result (the subset the pipeline needs). */
export interface PaapiItem {
  asin: string;
  title: string;
  imageUrl: string | null;
  /** Price in dollars, or null when no buyable offer was returned. */
  price: number | null;
  detailPageUrl: string;
  isPrime: boolean;
}

export interface PaapiSearchOptions {
  keywords: string;
  /** PA-API SearchIndex, e.g. "HomeAndKitchen". */
  searchIndex?: string;
  itemCount?: number;
  minPrice?: number;
  maxPrice?: number;
}

const sha256Hex = (data: string) =>
  crypto.createHash("sha256").update(data, "utf8").digest("hex");
const hmac = (key: Buffer | string, data: string) =>
  crypto.createHmac("sha256", key).update(data, "utf8").digest();

/** AWS SigV4 signing key derivation. */
function signingKey(secret: string, date: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

/**
 * Live PA-API 5.0 SearchItems. Throws if creds are missing or the call fails;
 * the caller decides whether to fall back to mock data. Returns [] on an empty
 * result set.
 */
export async function searchItems(opts: PaapiSearchOptions): Promise<PaapiItem[]> {
  const creds = paapiCreds();
  if (!creds) throw new Error("PA-API not configured");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const payload = JSON.stringify({
    Keywords: opts.keywords,
    SearchIndex: opts.searchIndex ?? "HomeAndKitchen",
    ItemCount: Math.min(opts.itemCount ?? 5, 10),
    PartnerTag: creds.partnerTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com",
    ...(opts.minPrice ? { MinPrice: Math.round(opts.minPrice * 100) } : {}),
    ...(opts.maxPrice ? { MaxPrice: Math.round(opts.maxPrice * 100) } : {}),
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Offers.Listings.DeliveryInfo.IsPrimeEligible",
    ],
  });

  // ---- SigV4 canonical request ----
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `host:${HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`;
  const signedHeaders = "content-encoding;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    PATH,
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join("\n");

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = crypto
    .createHmac("sha256", signingKey(creds.secretKey, dateStamp))
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: "POST",
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      host: HOST,
      "x-amz-date": amzDate,
      "x-amz-target": TARGET,
      Authorization: authorization,
    },
    body: payload,
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    // PA-API returns a typed JSON error. Surface __type/Code + message so the
    // real cause is legible (UnrecognizedClientException = bad/expired/wrong key
    // or a truncated paste; InvalidSignature = a signing bug; a partner-tag
    // mismatch has its own message) instead of an opaque "invalid token".
    let detail = bodyText;
    try {
      const j = JSON.parse(bodyText) as {
        __type?: string;
        message?: string;
        Message?: string;
        Errors?: { Code?: string; Message?: string }[];
      };
      const type = j.__type ?? j.Errors?.[0]?.Code ?? "";
      const msg = j.message ?? j.Message ?? j.Errors?.[0]?.Message ?? "";
      detail = [type, msg].filter(Boolean).join(", ") || bodyText;
    } catch {
      /* non-JSON body, keep the raw text */
    }
    throw new Error(`PA-API SearchItems HTTP ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as PaapiSearchResponse;
  const items = data.SearchResult?.Items ?? [];
  return items.map((it) => ({
    asin: it.ASIN,
    title: it.ItemInfo?.Title?.DisplayValue ?? "",
    imageUrl: it.Images?.Primary?.Large?.URL ?? null,
    price: it.Offers?.Listings?.[0]?.Price?.Amount ?? null,
    detailPageUrl: it.DetailPageURL,
    isPrime: it.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible ?? false,
  }));
}

// Minimal shape of the PA-API 5.0 SearchItems response we read.
interface PaapiSearchResponse {
  SearchResult?: {
    Items?: Array<{
      ASIN: string;
      DetailPageURL: string;
      Images?: { Primary?: { Large?: { URL?: string } } };
      ItemInfo?: { Title?: { DisplayValue?: string } };
      Offers?: {
        Listings?: Array<{
          Price?: { Amount?: number };
          DeliveryInfo?: { IsPrimeEligible?: boolean };
        }>;
      };
    }>;
  };
}
