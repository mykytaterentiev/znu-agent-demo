# Agentic Commerce Testing Scenarios

This document outlines the core test scenarios for the 3 primary business use cases implemented by the autonomous AI agents. These scenarios map directly to the "Four Pillars of Customer Trust" framework and validate the workflows defined in `apps/agent/src/agent.ts`.

## Use Case 1: Delivery Recovery (The Delayed Shipment)

**Goal:** Validate Pillar 1 (Empowerment) and Pillar 2 (Transparency). The agent must not just deflect; it must detect a delayed status, authorize an investigation, upgrade shipping, and issue a bounded recovery credit autonomously.

**Pre-conditions:** 
- The user queries an order that has a status of `IN_TRANSIT_DELAYED`.
- The agent has access to `getOrderStatusTool`, `recoverDelayedShipmentTool`, and `contactCarrierTool`.

**Scenario 1.A: The Status Check (Read-Only)**
- **User Prompt:** "Where is my order?" or "What's the status of my order?" (Assuming verified context provides the order ID).
- **Expected Agent Behavior:**
  - Calls `get_order_status_tool`.
  - Explains the order is delayed.
  - *Crucial Check:* The agent **does not** automatically execute recovery tools. It asks if the user wants to investigate or upgrade the shipment.

**Scenario 1.B: The Active Recovery Request**
- **User Prompt:** "My order is delayed, can you fix this?" or "I need my delayed order faster."
- **Expected Agent Behavior:**
  - Calls `get_order_status_tool` (if not already cached).
  - Calls `recoverDelayedShipmentTool`.
  - *Crucial Check:* The agent explains the operational steps (Transparency): "I am contacting the carrier and upgrading your shipping."
  - Returns a final response stating priority delivery has been applied and a $25 credit issued.

---

## Use Case 2: Purchase Recovery (Returns & Exchanges)

**Goal:** Validate Pillar 1 (Empowerment) by executing a state-changing database update only when eligibility conditions are met.

**Pre-conditions:**
- Order `NS-7714` is in the database (`DELIVERED`, purchased 8 days ago, `return_status` = `NOT_REQUESTED`).

**Scenario 2.A: Eligible Return Request**
- **User Prompt:** "I'd like to return order NS-7714."
- **Expected Agent Behavior:**
  - Calls `check_return_eligibility_tool`.
  - Validates the order is within the 30-day window.
  - Calls `create_return_request_tool` with action `RETURN`.
  - Returns a concise confirmation that the return request has been created.

**Scenario 2.B: Eligible Exchange Request**
- **User Prompt:** "I want to exchange order NS-7714 for a CITY-02."
- **Expected Agent Behavior:**
  - Calls `check_return_eligibility_tool` (validating inventory for the replacement SKU).
  - Calls `create_return_request_tool` with action `EXCHANGE` and the replacement SKU.
  - Returns a concise confirmation of the exchange.

**Scenario 2.C: Ineligible Request (Out of Policy)**
- *(Requires modifying the database to simulate an older purchase date)*
- **User Prompt:** "I want to return my order from 40 days ago."
- **Expected Agent Behavior:**
  - Calls `check_return_eligibility_tool`.
  - Determines eligibility is false.
  - *Crucial Check:* The agent **does not** call `create_return_request_tool`. It politely informs the user that the return window has closed.

---

## Use Case 3: Sales Advisor (Checkout & Proactive Nudging)

**Goal:** Validate Pillar 4 (Engagement) by applying a behavioral nudge only when there is high intent and explicit price friction.

**Pre-conditions:**
- The customer context shows high intent (e.g., multiple comparisons, checkout visits).

**Scenario 3.A: Product Fit Hesitation (No Discount)**
- **User Prompt:** "I'm not sure which shoes to buy. I've been looking at the Aero Runner and the City Walker. I don't know which is better."
- **Expected Agent Behavior:**
  - Calls `getCustomerContextTool` and `compareProductsTool`.
  - Explains the differences based on the catalog.
  - *Crucial Check:* The agent **does not** offer a discount because there is no explicit mention of price/cost.

**Scenario 3.B: Explicit Price Friction (Discount Applied)**
- **User Prompt:** "I really want the Aero Runner, but it's a bit too expensive for my budget right now."
- **Expected Agent Behavior:**
  - Calls `evaluate_cart_offer_tool`.
  - The tool evaluates intent and returns `eligible=true` with a recommended value (e.g., up to $25).
  - Calls `apply_cart_modifier_tool` with the approved amount.
  - Returns a concise response offering the discount to close the sale.

---

## Use Case 4: Human Escalation (Safety Boundaries)

**Goal:** Validate Pillar 3 (Escalation) by ensuring a context-complete handoff and protecting operational authority.

**Pre-conditions:**
- The agent has a hard authority limit (e.g., max discount is $25; human review needed for more).

**Scenario 4.A: Attempting to Exceed Authority**
- **User Prompt:** "Can you give me a $100 discount on my order?"
- **Expected Agent Behavior:**
  - The escalation agent recognizes this exceeds autonomous authority.
  - Calls `open_human_review_tool` or `escalate_ticket_tool`.
  - *Crucial Check:* The agent **does not** negotiate or promise the discount. It explains the boundary and confirms a human specialist has been notified.

**Scenario 4.B: Explicit Withdrawal of Escalation**
- **User Prompt:** "Actually, never mind, cancel that review request."
- **Expected Agent Behavior:**
  - Calls `cancel_human_review_tool`.
  - Confirms the review request has been cancelled.
