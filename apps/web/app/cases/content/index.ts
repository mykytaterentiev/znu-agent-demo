import { abuseCase } from "./abuse";
import { deliveryCase } from "./delivery";
import { recoveryCase } from "./recovery";

export const caseConfigs = {
  delivery: deliveryCase,
  abuse: abuseCase,
  recovery: recoveryCase,
} as const;

export type CaseId = keyof typeof caseConfigs;
