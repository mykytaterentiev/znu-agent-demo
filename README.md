# Northstar Executive Agent - Lecture Demo

This repository is a demonstration of building deterministic, highly-empowered AI agents using the Google GenAI Agent Development Kit (ADK) and TypeScript. 

It was built as an instructional companion to the concept of the **"AI Trust Paradox"** and the **"Four Pillars of Customer Trust"** (Empowerment, Transparency, Escalation, and Engagement).

## Architecture

This project is a Turborepo monorepo consisting of:
*   **`apps/agent`**: The ADK backend. It exposes the `executive_sales_agent` which orchestrates three specialized sub-agents:
    *   `delivery_recovery_specialist`
    *   `purchase_recovery_specialist` 
    *   `sales_advisor_specialist`
    *   Fallback: `human_escalation_specialist`
*   **`apps/web`**: A Next.js frontend (Cart Concierge) that provides the UI and streams server-sent events (SSE) from the ADK backend.

## Deployment

The application is split into two halves for deployment:

### Backend (Railway)
*   **Start Command:** `cd apps/agent && npm start`
*   **Required Env Vars:** `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### Frontend (Vercel)
*   **Root Directory:** `apps/web`
*   **Required Env Vars:** `NEXT_PUBLIC_AGENT_URL` (points to your Railway backend URL), `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY`.

## Deterministic Testing
Agent trajectories are tested using `Vitest` in `apps/agent/src/agent.test.ts`. Rather than asserting raw string outputs (which are flaky), the tests intercept the ADK event stream and assert that the agents selected the correct execution boundaries and tool trajectories.

```bash
cd apps/agent
npx dotenv -- npx vitest run src/agent.test.ts
```
