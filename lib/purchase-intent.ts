"use client";

/**
 * Decoupled "the user just clicked a buy link" signal. Buy buttons (individual
 * product Buy and the top Buy-all) fire this; the result page's PurchaseSurvey
 * listens for it to arm the return-to-tab confirmation prompt. A plain window
 * event keeps the buttons unaware of the survey.
 */
export const BUY_INTENT_EVENT = "dormscape:buy-intent";

/**
 * sessionStorage key holding the purchase_surveys row id returned when the
 * user answered the prompt. /thank-you reads it so submitted feedback links
 * back to the same survey record.
 */
export const SURVEY_ID_KEY = "dormscape-purchase-survey-id";

export function signalBuyIntent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BUY_INTENT_EVENT));
  }
}
