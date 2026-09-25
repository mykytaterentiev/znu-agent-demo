import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const compareProductsTool = new FunctionTool({
  name: "compare_products_tool",
  description: "Compare products from the catalog without inventing attributes.",
  parameters: z.object({ skus: z.array(z.string().min(1)).min(2).max(4) }),
  execute: async ({ skus }) => {
    console.info("[TOOL_TRACE] compare_products_tool query", { requestedSkus: skus });
    const { data, error } = await supabase.from("products").select("sku, name, price_usd, category").in("sku", skus);
    console.info("[TOOL_TRACE] compare_products_tool result", {
      requestedSkus: skus,
      returnedSkus: data?.map((product) => product.sku) ?? [],
      rowCount: data?.length ?? 0,
      error: error?.message ?? null,
    });
    if (error) return { status: "ERROR", report: error.message };
    return { status: "SUCCESS", report: `Compared ${data.length} catalog products.`, data };
  },
});
