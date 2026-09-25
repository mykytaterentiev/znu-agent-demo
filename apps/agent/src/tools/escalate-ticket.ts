import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const escalateTicketTool = new FunctionTool({
  name: "escalate_ticket_tool",
  description: "Create an auditable human handoff for a request outside agent authority.",
  parameters: z.object({
    user_id: z.string().uuid(),
    cart_id: z.string().uuid(),
    summary: z.string().min(1),
  }),
  execute: async ({ user_id, cart_id, summary }) => {
    console.info("[TOOL_TRACE] escalate_ticket_tool", { user_id, cart_id, summaryLength: summary.length });
    const { data, error } = await supabase
      .from("agent_escalations")
      .insert({
        user_id,
        cart_id,
        attempted_action: "discount_request_above_authority",
        agent_summary: summary,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return { status: "ERROR", report: error.message };
    }

    return {
      status: "ESCALATED",
      report: "A human sales executive has been notified.",
      data,
    };
  },
});
