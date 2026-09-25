import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase } from "../utils/supabase.js";

export const recoverDelayedShipmentTool = new FunctionTool({
  name: "recover_delayed_shipment_tool",
  description: "Deterministically investigate and recover a delayed shipment. Looks up the order, contacts the carrier, upgrades it to priority, and applies a $25 recovery credit when the order is IN_TRANSIT_DELAYED.",
  parameters: z.object({ order_id: z.string().min(1) }),
  execute: async ({ order_id }) => {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, tracking_number, delay_reason, shipping_tier, recovery_status, recovery_offer, delivery_events(event_type, location, occurred_at)")
      .eq("id", order_id)
      .maybeSingle();
    if (orderError) return { status: "ERROR", report: orderError.message };
    if (!order) return { status: "NOT_FOUND", report: `Order ${order_id} was not found.` };
    if (order.status !== "IN_TRANSIT_DELAYED") return { status: "NO_RECOVERY_REQUIRED", report: `Order ${order_id} is ${order.status}; no delayed-shipment recovery was applied.`, data: order };

    const reason = order.delay_reason ?? "Carrier transit exception: shipment has not received a scan for 48 hours.";
    const { data: carrierContact, error: carrierError } = await supabase
      .from("carrier_contacts")
      .insert({ order_id, reason, status: "OPEN" })
      .select("id, status, created_at")
      .single();
    if (carrierError) return { status: "ERROR", report: `Order located, but carrier contact failed: ${carrierError.message}` };

    const { data: recovery, error: recoveryError } = await supabase
      .from("orders")
      .update({ shipping_tier: "PRIORITY", recovery_status: "RECOVERY_IN_PROGRESS", recovery_offer: 25, delay_reason: reason })
      .eq("id", order_id)
      .select("id, shipping_tier, recovery_status, recovery_offer, delay_reason")
      .single();
    if (recoveryError) return { status: "ERROR", report: `Carrier contacted, but recovery update failed: ${recoveryError.message}`, data: { carrierContact } };
    return { status: "SUCCESS", report: `Carrier contacted (${carrierContact.id}). Priority delivery applied and a $25 recovery credit issued. Cause: ${reason}`, data: { recovery, carrierContact } };
  },
});
