import { FunctionTool } from "@google/adk";
import { z } from "zod";

export const completeCustomerResponseTool = new FunctionTool({
  name: "complete_customer_response_tool",
  description: "Required final step. Call this immediately after the required catalog and policy tools. Put the exact concise customer-facing answer in message. Do not end the turn with ordinary text or without calling this tool.",
  parameters: z.object({ message: z.string().min(1).max(600) }),
  execute: async ({ message }) => ({
    status: "RESPONSE_READY",
    message,
  }),
});
