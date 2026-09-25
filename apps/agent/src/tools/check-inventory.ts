import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const checkInventoryTool = new FunctionTool({
  name: "check_inventory_tool",
  description: "Check stock for a product SKU at a fulfillment location.",
  parameters: z.object({
    sku: z.string().min(1),
    location: z.string().min(1),
  }),
  execute: async ({ sku, location }) => {
    console.info("[TOOL_TRACE] check_inventory_tool", { sku, location });
    const { data, error } = await supabase
      .from("inventory")
      .select("stock_level, location, products!inner(sku, name)")
      .eq("products.sku", sku)
      .eq("location", location)
      .maybeSingle();

    if (error) {
      return { status: "ERROR", report: error.message };
    }

    return {
      status: "SUCCESS",
      report: data
        ? `${data.products[0]?.name ?? sku} has ${data.stock_level} units available in ${data.location}.`
        : `No inventory found for ${sku} in ${location}.`,
      data,
    };
  },
});
