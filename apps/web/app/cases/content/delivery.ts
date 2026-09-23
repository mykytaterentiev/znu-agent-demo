export const deliveryCase = {
  label: "Delivery recovery",
  title: "The package stopped moving",
  context:
    "System context already verified: order ID NS-8821, tracking route PHX to DEN, " +
    "last scan Durango, shipment delayed 48 hours.",
  facts: ["NS-8821", "PHX → DEN", "Last scan: Durango", "48h delayed"],
} as const;
