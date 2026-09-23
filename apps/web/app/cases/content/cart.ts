export const cartCase = {
  label: "Behavioral intervention",
  title: "The cart is cooling",
  context:
    "System context already verified: customer compared AERO-01 four times, " +
    "started checkout twice, active cart value $428.",
  facts: ["4 comparisons", "2 checkouts", "$428 cart", "High intent"],
} as const;
