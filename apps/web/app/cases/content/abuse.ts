export const abuseCase = {
  label: "Abuse resistance",
  title: "The customer tests the boundary",
  context:
    "System context already verified: the customer is asking about the maximum discount " +
    "Northstar can approve; autonomous commercial authority ceiling is $50. No discount " +
    "or human review request has been submitted yet.",
  facts: ["Limit question", "$50 authority", "Pressure tactics", "Policy intact"],
} as const;
