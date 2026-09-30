import type Stripe from "stripe";
import type { getServiceClient } from "./supabase-server";
import { sendEmail, type SendArgs } from "./email";
import { purchaseInvoiceEmail } from "./email-templates";
import { PURCHASE_TYPES, type PurchaseType } from "./plan";

const names: Record<PurchaseType, string> = { plus: "Dormscape Plus", pro: "Dormscape Pro", recharge: "Dormscape Plus recharge", flex_credits: "Dormscape Flex credits" };

/** Separate from credit fulfillment: invoice events may arrive before checkout events.
 * Freeze the first payload so every retry has an identical Resend idempotency body. */
export async function deliverPurchaseInvoice(db: NonNullable<ReturnType<typeof getServiceClient>>, stripe: Stripe, eventInvoice: Stripe.Invoice) {
  if (eventInvoice.metadata?.dormscape_email !== "v1") return;
  const purchase = eventInvoice.metadata.purchase as PurchaseType;
  if (!PURCHASE_TYPES.includes(purchase) || !eventInvoice.metadata.user_id) throw new Error("Missing invoice purchase metadata.");
  const { data: prior, error: lookupError } = await db.from("purchase_email_deliveries").select("payload,sent_at").eq("invoice_id", eventInvoice.id).maybeSingle();
  if (lookupError) throw new Error("Purchase email migration is not available.");
  if (prior?.sent_at) return;
  let payload = prior?.payload as SendArgs | undefined;
  if (!payload) {
    const invoice = eventInvoice.invoice_pdf && eventInvoice.hosted_invoice_url ? eventInvoice : await stripe.invoices.retrieve(eventInvoice.id);
    if (invoice.status !== "paid") return;
    if (!invoice.invoice_pdf || !invoice.hosted_invoice_url || !invoice.customer_email) throw new Error("Paid invoice is not ready for delivery.");
    const credits = Number(invoice.metadata?.credit_amount);
    if (!Number.isSafeInteger(credits) || credits < 1) throw new Error("Invalid invoice credit metadata.");
    const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.amount_paid / 100);
    const date = new Date((invoice.status_transitions.paid_at || invoice.created) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    payload = {
      to: invoice.customer_email,
      from: process.env.CONTACT_FROM_EMAIL || "Dormscape <contact@dormscape.us>",
      ...purchaseInvoiceEmail({ tier: names[purchase], credits, invoiceNumber: invoice.number || invoice.id, amount, date, url: invoice.hosted_invoice_url }),
      attachments: [{ filename: `Dormscape-invoice-${(invoice.number || invoice.id).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`, path: invoice.invoice_pdf }],
      idempotencyKey: `purchase-invoice/${invoice.id}`,
    };
    const { error } = await db.from("purchase_email_deliveries").insert({ invoice_id: invoice.id, user_id: invoice.metadata?.user_id, payload });
    if (error && error.code !== "23505") throw new Error("Could not queue the purchase email.");
    // Concurrent webhook deliveries must use the exact winning payload.
    if (error?.code === "23505") {
      const { data, error: readError } = await db.from("purchase_email_deliveries").select("payload,sent_at").eq("invoice_id", invoice.id).single();
      if (readError || !data) throw new Error("Could not read the purchase email.");
      if (data.sent_at) return;
      payload = data.payload as SendArgs;
    }
  }
  if (!await sendEmail(payload)) throw new Error("Purchase email was not accepted. Retry this invoice event.");
  const { error } = await db.from("purchase_email_deliveries").update({ sent_at: new Date().toISOString() }).eq("invoice_id", eventInvoice.id);
  if (error) throw new Error("Could not record purchase email delivery.");
}
