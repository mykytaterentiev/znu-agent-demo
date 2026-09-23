export const recoveryCase = {
  label: "Purchase recovery",
  title: "The purchase you can still undo",
  context:
    "System context already verified: order NS-7714 contains Aero Runner 01 (AERO-01), " +
    "purchased 8 days ago, inside the 30-day return window; City Walker 02 (CITY-02) " +
    "is available for exchange. Verify eligibility before creating a return or exchange request.",
  facts: ["NS-7714", "Aero Runner 01", "Purchased 8 days ago", "30-day return window"],
} as const;
