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

        const { data: driver, error: driverError } = await supabaseClient
            .from("drivers")
            .select("id")
            .eq("clerk_auth_id", clerkAuthId)
            .single();

        if (driverError || !driver) {
            return Response.json(
                { error: "Driver not found" },
                { status: 404 }
            );
        }

        /* ---------------------------------------
           Calculate week range (Mon → Sun)
        --------------------------------------- */

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        const weekStartISO = weekStart.toISOString().slice(0, 10);
        const weekEndISO = weekEnd.toISOString().slice(0, 10);

        /* ---------------------------------------
           Aggregate deliveries
        --------------------------------------- */

        const { data, error } = await supabaseClient
            .from("delivery_group_scans")
            .select(
                `
        delivered_count,
        delivery_groups (
          delivery_id,
          deliveries (
            delivery_date,
            driver_id
          )
        )
      `
            )
            .eq("delivery_groups.deliveries.driver_id", driver.id)
            .gte("delivery_groups.deliveries.delivery_date", weekStartISO)
            .lte("delivery_groups.deliveries.delivery_date", weekEndISO);

        if (error) {
            return Response.json(
                { error: error.message },
                { status: 500 }
            );
        }

        const totalDelivered = data.reduce(
            (sum, row) => sum + row.delivered_count,
            0
        );

        /* ---------------------------------------
           Response
        --------------------------------------- */

        return Response.json({
            driverId: driver.id,
            weekStart: weekStartISO,
            weekEnd: weekEndISO,
            totalDelivered,
        });
    } catch (err: any) {
        return Response.json(
            { error: err.message ?? "Unexpected error" },
            { status: 500 }
        );
    }
}
