import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const checkReturnEligibilityTool = new FunctionTool({
  name: "check_return_eligibility_tool",
  description: "Check whether an order is eligible for return or exchange and whether a replacement product is in stock.",
  parameters: z.object({
    order_id: z.string().min(1),
    action: z.enum(["RETURN", "EXCHANGE"]),
    replacement_sku: z.string().optional(),
  }),
  execute: async ({ order_id, action, replacement_sku }) => {
    console.info("[TOOL_TRACE] check_return_eligibility_tool", { order_id, action, replacement_sku });
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, product_sku, purchased_at, return_status")
      .eq("id", order_id)
      .maybeSingle();
    if (error) {
      console.info("[TOOL_TRACE] check_return_eligibility_tool error", { message: error.message });
      return { status: "ERROR", report: error.message };
    }
    if (!order) return { status: "NOT_FOUND", report: `Order ${order_id} was not found.` };
    const purchasedAt = order.purchased_at ? new Date(order.purchased_at) : null;
    const daysSincePurchase = purchasedAt
      ? Math.floor((Date.now() - purchasedAt.getTime()) / 86400000)
      : null;
    const withinWindow = daysSincePurchase !== null && daysSincePurchase <= 30;
    let replacementAvailable = true;
    if (action === "EXCHANGE" && replacement_sku) {
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("stock_level, products!inner(sku)")
        .eq("products.sku", replacement_sku)
        .gt("stock_level", 0)
        .maybeSingle();
      if (inventoryError) return { status: "ERROR", report: inventoryError.message };
      replacementAvailable = Boolean(inventory);
    }
    const eligible = withinWindow && order.return_status === "NOT_REQUESTED" && replacementAvailable;
    return {
      status: "SUCCESS",
      eligible,
      report: eligible
        ? `${action === "EXCHANGE" ? "Exchange" : "Return"} is eligible for order ${order_id}.`
        : "This request is not currently eligible.",
      data: { order, days_since_purchase: daysSincePurchase, replacement_available: replacementAvailable },
    };
  },
});
