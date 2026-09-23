export const advisorCase = {
  label: "Product advisor",
  title: "The decision nobody wants to regret",
  context:
    "System context already verified: customer is shopping for long city walks; " +
    "compare catalog SKUs AERO-01 and CITY-02.",
  facts: ["AERO-01", "CITY-02", "Long city walks", "Catalog grounded"],
} as const;
