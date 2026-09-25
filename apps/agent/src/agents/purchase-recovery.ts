import { LlmAgent, SequentialAgent } from "@google/adk";
import { checkInventoryTool } from "../tools/check-inventory.js";
import { checkReturnEligibilityTool } from "../tools/check-return-eligibility.js";
import { createReturnRequestTool } from "../tools/create-return-request.js";

export const purchaseRecoveryAgent = new LlmAgent({
  name: "purchase_recovery_specialist",
  model: "gemini-flash-latest",
  description: "Handles returns and exchanges using order eligibility and inventory evidence.",
  generateContentConfig: { maxOutputTokens: 2048, temperature: 0.2 },
  instruction: `You own post-purchase recovery.
- For a return or exchange request, verify eligibility before promising anything.
- Use order NS-7714 when the verified context supplies it; do not ask the customer to repeat it.
- Use check_return_eligibility_tool first.
- The customer's current message is the choice: if it explicitly asks for a return or exchange and eligibility is true, create the request immediately; do not ask for a second confirmation.
- Only create a request after eligibility is confirmed.
- Never claim a label, refund, or exchange exists unless create_return_request_tool succeeds.
- Stop after the authorized return or exchange action has completed; a separate response agent will explain the result.
- Never claim a label, refund, or exchange exists unless create_return_request_tool succeeds.`,
  tools: [checkReturnEligibilityTool, createReturnRequestTool, checkInventoryTool],
});

export const purchaseRecoveryResponseAgent = new LlmAgent({
  name: "purchase_recovery_response_agent",
  model: "gemini-flash-latest",
  description: "Explains the completed purchase recovery action to the customer.",
  generateContentConfig: { maxOutputTokens: 1024, temperature: 0.2 },
  disallowTransferToParent: true,
  instruction: `You are the final customer-facing voice for a purchase recovery case.
- Read the preceding tool results in the conversation.
- Explain what was verified and what action was completed.
- Never invent a refund, label, exchange, or reference number; use only successful tool results.
- If an action failed or was ineligible, explain the actual next step.
- Respond in no more than 3 concise sentences.`,
});

export const purchaseRecoveryWorkflow = new SequentialAgent({
  name: "purchase_recovery_workflow",
  description: "Verifies and executes a return or exchange, then produces a customer-facing explanation.",
  subAgents: [purchaseRecoveryAgent, purchaseRecoveryResponseAgent],
});
