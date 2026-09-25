import { FunctionTool } from "@google/adk";
import { z } from "zod";

export const evaluateCartOfferTool = new FunctionTool({
  name: "evaluate_cart_offer_tool",
  description: "Evaluate whether a bounded cart incentive is economically and behaviorally justified. Product-fit questions are not discount eligible. After this tool returns, the sales agent must call complete_customer_response_tool next.",
  parameters: z.object({
    user_id: z.string().min(1),
    cart_value: z.number().min(0),
    comparison_count: z.number().int().min(0),
    checkout_count: z.number().int().min(0),
    price_is_blocker: z.boolean(),
    days_since_last_offer: z.number().min(0).nullable().default(null),
  }),
  execute: async ({ user_id, cart_value, comparison_count, checkout_count, price_is_blocker, days_since_last_offer }) => {
    const highIntentSignals = Number(comparison_count >= 2) + Number(checkout_count >= 1);
    const offerCooldownPassed = days_since_last_offer === null || days_since_last_offer >= 30;
    const eligible =
      highIntentSignals >= 2 &&
      price_is_blocker &&
      offerCooldownPassed &&
      cart_value >= 100;
    const recommendedValue = eligible ? Math.min(25, Math.round(cart_value * 0.05 * 100) / 100) : 0;
    const reason = eligible
      ? "High intent, explicit price friction, sufficient cart value, and no recent offer."
      : !price_is_blocker
        ? "No incentive: the hesitation is about product fit rather than price."
        : !offerCooldownPassed
          ? "No incentive: the customer received an offer within the 30-day cooldown."
          : "No incentive: purchase intent or cart value is not strong enough.";
    console.info("[POLICY_TRACE] evaluate_cart_offer_tool", {
      user_id,
      highIntentSignals,
      price_is_blocker,
      days_since_last_offer,
      cart_value,
      eligible,
      recommendedValue,
    });
    return {
      status: "SUCCESS",
      eligible,
      recommended_value: recommendedValue,
      report: `${reason} ${eligible ? `Maximum authorized offer: $${recommendedValue.toFixed(2)}.` : "Do not offer a discount."}`,
    };
  },
});
