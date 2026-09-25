import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const openHumanReviewTool = new FunctionTool({
  name: "open_human_review_tool",
  description: "Open an auditable human review request when the customer asks for an action outside autonomous authority.",
  parameters: z.object({
    user_id: z.string().min(1),
    requested_action: z.string().min(1),
    reason: z.string().min(1),
  }),
  execute: async ({ user_id, requested_action, reason }) => {
    console.info("[TOOL_TRACE] open_human_review_tool", { user_id, requested_action });
    const { data, error } = await supabase
      .from("human_review_requests")
      .insert({ user_id, requested_action, reason })
      .select("id, status, created_at")
      .single();
    if (error) return { status: "ERROR", report: error.message };
    return {
      status: "OPEN",
      report: `Human review opened for ${requested_action}. Reference ${data.id}. The autonomous authority limit was preserved and a specialist will review the request.`,
      data,
    };
  },
});
