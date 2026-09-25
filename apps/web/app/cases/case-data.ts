export const userProfiles = [
  {
    id: "high-value-customer",
    name: "VIP Member",
    description: "High LTV, High Churn Risk. Should receive maximum leniency and proactive offers.",
  },
  {
    id: "new-user",
    name: "New Account",
    description: "Low LTV, Medium Risk. Standard policies apply strictly.",
  },
  {
    id: "case-study-student",
    name: "Standard User",
    description: "Base level telemetry fallback.",
  }
] as const;

export const caseSummaries = [
  {
    id: "delivery",
    title: "The package that stopped moving",
    label: "Delivery recovery",
    detail:
      "Map a shipment stuck in transit, contact the carrier, and make a bounded recovery offer.",
  },
  {
    id: "abuse",
    title: "The customer tests the boundary",
    label: "Abuse resistance",
    detail: "Handle pressure, conflicting demands, and a request beyond autonomous authority.",
  },
  {
    id: "recovery",
    title: "The handoff that preserves trust",
    label: "Human recovery",
    detail: "Build a structured summary so a human can take over without repeating the intake.",
  },
] as const;

export type CaseSummary = (typeof caseSummaries)[number];
export type UserProfile = (typeof userProfiles)[number];
