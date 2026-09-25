import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const getOrderStatusTool = new FunctionTool({
  name: "get_order_status_tool",
  description: "Retrieve an order's current delivery state and recent carrier events.",
  parameters: z.object({ order_id: z.string().min(1) }),
  execute: async ({ order_id }) => {
    console.info("[TOOL_TRACE] get_order_status_tool", { order_id });
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, promised_at, tracking_number, delay_reason, shipping_tier, recovery_status, recovery_offer, delivery_events(event_type, location, occurred_at)")
      .eq("id", order_id)
      .maybeSingle();
    if (error) return { status: "ERROR", report: error.message };
    return { status: data ? "SUCCESS" : "NOT_FOUND", report: data ? `Order ${order_id} is ${data.status}.` : "Order not found.", data };
  },
});
