import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const contactCarrierTool = new FunctionTool({
  name: "contact_carrier_tool",
  description: "Open a carrier service request for a delayed shipment. This does not promise a refund.",
  parameters: z.object({ order_id: z.string().min(1), reason: z.string().min(1) }),
  execute: async ({ order_id, reason }) => {
    console.info("[TOOL_TRACE] contact_carrier_tool", { order_id, reason });
    const { data, error } = await supabase
      .from("carrier_contacts")
      .insert({ order_id, reason, status: "OPEN" })
      .select("id, status, created_at")
      .single();
    if (error) return { status: "ERROR", report: error.message };
    return { status: "SUCCESS", report: "Carrier contact opened and attached to the order.", data };
  },
});
