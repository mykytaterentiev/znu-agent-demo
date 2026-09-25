# The AI Trust Paradox & Agentic Commerce

This repository is the technical demonstration for the lecture on **"The AI Trust Paradox"**. It proves how to break the "chatbot" echo chamber by building deterministic, highly-empowered AI agents using the Google GenAI Agent Development Kit (ADK) and TypeScript.

The architecture directly maps to the 5 parts of the lecture, proving how Enterprise Agentic Systems operate in the real world (using the "Klarna" approach over the "Air Canada" disaster).

## Lecture Architecture Mapping

### 1. The Paradox & The Echo Chamber
We inherently trust private AI but hate corporate "bots" because bots are designed to deflect.
**Implementation:** The agents in `apps/agent/src/agent.ts` have **Write-Access**. They don't just say "your package is delayed" — they use `recover_delayed_shipment_tool` to execute an API call, update the database, and issue a credit.

### 2. Deconstructing the Bullshit (ReAct Loops)
An LLM is a probabilistic word calculator, not a brain. The *Agent* is the software loop around it.
**Implementation:** The codebase relies heavily on `@google/adk`. The LLM only parses intent and outputs JSON; the `FunctionTool` wrappers execute the strict Typescript logic and pass data back. 

### 3. Predictive ML & The Signal (New!)
Before an agent speaks, classical ML decides if the user is worth saving. 
**Implementation:** See `apps/agent/src/utils/predictive-ml.ts`. We simulate a XGBoost model that evaluates `churnProbability`, Customer Lifetime Value (`LTV`), and `riskTier` for different user profiles (`high-value-customer` vs `new-user`). This telemetry is injected as a Signal to the Multi-Agent orchestrator so it knows whether to authorize a 15% exception discount or play hardball.

### 4. Enterprise Architecture & MCP
Instead of one "God Agent", you need a massive pipeline of specialized tech and standard protocols.
**Implementation:** We use a Multi-Agent architecture:
- `executive_sales_agent` (The Triage/Orchestrator)
- `sales_advisor_specialist` (Commercial Agent)
- `delivery_recovery_specialist`
- `human_escalation_specialist` (The Guardrail/Handoff Agent)

### 5. Rebuilding Trust (The Labor Illusion)
Consumers value systems when they see them doing digital labor. An instant block of text feels fake.
**Implementation:** The frontend streams Server-Sent Events (SSE) directly from the ADK backend, natively exposing the `[TOOL_TRACE]` events to the user interface. It shows exactly what the agent is doing (e.g., "[1/3] Checking warehouse stock...") before the final message appears.

---

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