import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const createReturnRequestTool = new FunctionTool({
  name: "create_return_request_tool",
  description: "Create an authorized return or exchange request after eligibility has been confirmed.",
  parameters: z.object({
    order_id: z.string().min(1),
    action: z.enum(["RETURN", "EXCHANGE"]),
    replacement_sku: z.string().optional(),
  }),
  execute: async ({ order_id, action, replacement_sku }) => {
    console.info("[TOOL_TRACE] create_return_request_tool", { order_id, action, replacement_sku });
    const { data, error } = await supabase
      .from("return_requests")
      .insert({ order_id, action, replacement_sku })
      .select("id, order_id, action, replacement_sku, status, created_at")
      .single();
    if (error) {
      console.info("[TOOL_TRACE] create_return_request_tool error", { message: error.message });
      return { status: "ERROR", report: error.message };
    }
    await supabase.from("orders").update({ return_status: "REQUESTED" }).eq("id", order_id);
    return { status: "SUCCESS", report: `${action === "EXCHANGE" ? "Exchange" : "Return"} request created.`, data };
  },
});
