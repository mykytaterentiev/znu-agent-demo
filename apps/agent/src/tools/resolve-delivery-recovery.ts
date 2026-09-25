import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const resolveDeliveryRecoveryTool = new FunctionTool({
  name: "resolve_delivery_recovery_tool",
  description: "Take an authorized recovery action for a delayed order: upgrade shipping and/or issue a compensation credit up to $50. Never claim success unless the database update succeeds.",
  parameters: z.object({
    order_id: z.string().min(1),
    shipping_tier: z.enum(["PRIORITY", "EXPRESS"]),
    compensation: z.number().min(0).max(50),
    reason: z.string().min(1),
  }),
  execute: async ({ order_id, shipping_tier, compensation, reason }) => {
    const { data, error } = await supabase
      .from("orders")
      .update({ shipping_tier, recovery_status: "RECOVERY_IN_PROGRESS", recovery_offer: compensation, delay_reason: reason })
      .eq("id", order_id)
      .select("id, shipping_tier, recovery_status, recovery_offer, delay_reason")
      .single();
    if (error) return { status: "ERROR", report: error.message };
    return {
      status: "SUCCESS",
      report: `Recovery action applied: ${shipping_tier.toLowerCase()} delivery and a $${compensation.toFixed(2)} compensation credit. Delay reason recorded: ${reason}.`,
      data,
    };
  },
});
