import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";
import { runPredictiveChurnModel } from "../utils/predictive-ml.js";

export const getCustomerContextTool = new FunctionTool({
  name: "get_customer_context_tool",
  description: "Retrieve recent customer behavior signals and real-time Predictive ML telemetry (Churn/LTV).",
  parameters: z.object({ user_id: z.string().min(1) }),
  execute: async ({ user_id }) => {
    // 1. Run the classical ML simulation (XGBoost logic)
    const telemetry = await runPredictiveChurnModel(user_id);
    
    // Log a highly visible terminal trace for the lecture
    console.info(`\n\x1b[36m[PREDICTIVE_ML] Analyzing user: ${user_id}\x1b[0m`);
    console.info(`\x1b[33m ↳ Churn Probability: ${(telemetry.churnProbability * 100).toFixed(1)}% | LTV: $${telemetry.ltv} | Risk Tier: ${telemetry.riskTier}\x1b[0m`);
    console.info(`\x1b[33m ↳ Recommended Action: ${telemetry.recommendedAction}\x1b[0m\n`);

    // 2. Fetch the behavioral events from the database
    const { data: events, error } = await supabase
      .from("behavioral_events")
      .select("event_type, product_sku, metadata, occurred_at")
      .eq("user_id", user_id)
      .order("occurred_at", { ascending: false })
      .limit(12);

    if (error) return { status: "ERROR", report: error.message };
    
    return { 
      status: "SUCCESS", 
      report: `Loaded Predictive ML Telemetry and ${events.length} recent behavioral events.`, 
      data: { telemetry, events } 
    };
  },
});
