import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { InMemoryRunner } from "@google/adk";
import { rootAgent } from "./agent.js";
import { supabase } from "./utils/supabase.js";

// Mock Supabase to make tests fast and deterministic without requiring a live database.
vi.mock("./utils/supabase.js", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

// Helper to extract tool calls from ADK's event stream
function summarizeTrajectory(events: any[]) {
  const toolCalls: { name: string; args: any }[] = [];
  
  JSON.stringify(events, (key, value) => {
    if (value && typeof value === "object" && value.functionCall) {
      toolCalls.push({ name: value.functionCall.name, args: value.functionCall.args });
    }
    return value;
  });

  return { toolCalls };
}

async function runScenario(input: string, userId: string = "test-user") {
  const runner = new InMemoryRunner({ agent: rootAgent });
  const session = await runner.sessionService.createSession({
    appName: runner.appName,
    userId,
  });

  const events: any[] = [];
  for await (const event of runner.runAsync({
    userId: session.userId,
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [{ text: input }],
    },
  })) {
    events.push(event);
  }

  return summarizeTrajectory(events);
}

describe("Executive Sales Agent Trajectories", () => {
  beforeAll(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("Use Case 1: Delivery Recovery", () => {
    it("Scenario 1A: Status Check (Read-Only) does not trigger recovery tools", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { status: "IN_TRANSIT_DELAYED", id: "NS-7714" },
          error: null,
        }),
      } as any);

      const run = await runScenario("What is the status of my order NS-7714?");
      
      const toolNames = run.toolCalls.map((c) => c.name);
      expect(toolNames).toContain("get_order_status_tool");
      expect(toolNames).not.toContain("recover_delayed_shipment_tool");
      expect(toolNames).not.toContain("contact_carrier_tool");
    });
  });

  describe("Use Case 2: Purchase Recovery", () => {
    it("Scenario 2A: Eligible Return Request creates a return", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "NS-7714", return_status: "NOT_REQUESTED", purchased_at: new Date().toISOString() },
          error: null,
        }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "req-123", status: "REQUESTED" },
          error: null,
        }),
      } as any);

      const run = await runScenario("I'd like to return order NS-7714.");
      
      const toolNames = run.toolCalls.map((c) => c.name);
      expect(toolNames).toContain("check_return_eligibility_tool");
      expect(toolNames).toContain("create_return_request_tool");
    });
  });

  describe("Use Case 3: Sales Advisor", () => {
    it("Scenario 3A: Product Fit Hesitation compares but does NOT discount", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn().mockImplementation((cb) => {
           cb({ data: [
             { sku: "AERO-01", name: "Aero Runner 01", price_usd: 428 },
             { sku: "CITY-02", name: "City Walker 02", price_usd: 395 }
           ], error: null })
           return Promise.resolve();
        }),
      } as any);

      const run = await runScenario("I'm not sure which shoes to buy. I've been looking at the Aero Runner and the City Walker. I don't know which is better.");
      
      const toolNames = run.toolCalls.map((c) => c.name);
      expect(toolNames).toContain("compare_products_tool");
      expect(toolNames).toContain("complete_customer_response_tool");
      expect(toolNames).not.toContain("evaluate_cart_offer_tool");
      expect(toolNames).not.toContain("apply_cart_modifier_tool");
    });
  });

  describe("Use Case 4: Human Escalation", () => {
    it("Scenario 4A: Attempting to Exceed Authority blocks and opens human review", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "review-123", status: "OPEN" },
          error: null,
        }),
      } as any);

      const run = await runScenario("Can you give me a $100 discount on my order? Please submit an exception for a manager to review this.");
      
      const toolNames = run.toolCalls.map((c) => c.name);
      expect(toolNames).toContain("open_human_review_tool");
      expect(toolNames).not.toContain("apply_cart_modifier_tool");
    });
  });
});
