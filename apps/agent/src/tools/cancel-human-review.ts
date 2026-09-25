import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const cancelHumanReviewTool = new FunctionTool({
  name: "cancel_human_review_tool",
  description: "Cancel an open human review request when the customer explicitly asks to withdraw it.",
  parameters: z.object({ review_id: z.string().uuid() }),
  execute: async ({ review_id }) => {
    console.info("[TOOL_TRACE] cancel_human_review_tool", { review_id });
    const { data, error } = await supabase
      .from("human_review_requests")
      .update({ status: "CANCELLED" })
      .eq("id", review_id)
      .eq("status", "OPEN")
      .select("id, status, created_at")
      .maybeSingle();
    if (error) return { status: "ERROR", report: error.message };
    if (!data) return { status: "NOT_FOUND", report: "No open human review request was found for that reference." };
    return { status: "CANCELLED", report: `Human review ${data.id} was cancelled.`, data };
  },
});
