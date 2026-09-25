import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const applyCartModifierTool = new FunctionTool({
  name: "apply_cart_modifier_tool",
  description: "Apply an already-approved cart discount. Never call this without a successful eligible result from evaluate_cart_offer_tool. Values above 25 dollars must be escalated.",
  parameters: z.object({
    cart_id: z.string().uuid(),
    value: z.number().min(0),
  }),
  execute: async ({ cart_id, value }) => {
    console.info("[TOOL_TRACE] apply_cart_modifier_tool", { cart_id, value });
    if (value > 25) {
      return {
        status: "REJECTED_EXCEEDS_AUTHORITY",
        report: "Discount exceeds the 25 dollar cart-offer authority boundary. Escalation required.",
      };
    }

    const { data, error } = await supabase
      .from("active_carts")
      .update({ applied_discount: value })
      .eq("id", cart_id)
      .select("id, applied_discount")
      .single();

    if (error) {
      return { status: "ERROR", report: error.message };
    }

    return { status: "SUCCESS", report: `Applied a $${value.toFixed(2)} discount.`, data };
  },
});
