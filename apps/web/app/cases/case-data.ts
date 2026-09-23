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
