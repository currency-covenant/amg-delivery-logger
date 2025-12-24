// api/supabase/deliveries/weeklyTotal/weekly-total+api.ts
import { startOfWeek, endOfWeek } from "date-fns";
import supabaseClient from "@/clients/supabase";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clerkAuthId = searchParams.get("clerkAuthId");

        if (!clerkAuthId) {
            return Response.json(
                { error: "Missing clerkAuthId" },
                { status: 400 }
            );
        }

        /* ---------------------------------------
           Resolve driver
        --------------------------------------- */
        const { data: driver } = await supabaseClient
            .from("drivers")
            .select("id")
            .eq("clerk_auth_id", clerkAuthId)
            .single();

        if (!driver) {
            return Response.json(
                { error: "Driver not found" },
                { status: 404 }
            );
        }

        /* ---------------------------------------
           Calculate week (Mon → Sun)
        --------------------------------------- */
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
            .toISOString()
            .slice(0, 10);
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
            .toISOString()
            .slice(0, 10);

        /* ---------------------------------------
           Fetch weekly delivery entries via assignments
        --------------------------------------- */
        const { data: rows, error } = await supabaseClient
            .from("delivery_entries")
            .select(
                `
                deliveries,
                driver_number_assignments!inner (
                    driver_id
                )
            `
            )
            .eq("driver_number_assignments.driver_id", driver.id)
            .gte("delivery_date", weekStart)
            .lte("delivery_date", weekEnd);

        if (error) {
            return Response.json(
                { error: error.message },
                { status: 500 }
            );
        }

        const totalDelivered = (rows ?? []).reduce(
            (sum, r) => sum + r.deliveries,
            0
        );

        return Response.json({
            driverId: driver.id,
            weekStart,
            weekEnd,
            totalDelivered,
        });
    } catch (err: any) {
        return Response.json(
            { error: err.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}
