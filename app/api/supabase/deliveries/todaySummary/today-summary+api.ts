import supabaseClient from "@/clients/supabase";

export async function GET(request: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const clerkAuthId = searchParams.get("clerkAuthId");

        if (!clerkAuthId) {
            return new Response(
                JSON.stringify({ error: "Missing clerkAuthId" }),
                { status: 400 }
            );
        }

        const today = new Date().toISOString().slice(0, 10);

        /* ---------------------------------------
           1️⃣ Get driver
        --------------------------------------- */
        const { data: driver, error: driverError } = await supabaseClient
            .from("drivers")
            .select("id")
            .eq("clerk_auth_id", clerkAuthId)
            .single();

        if (driverError || !driver) {
            // Not an error state for UI: just means nothing to show
            return new Response(JSON.stringify({ submitted: false }), {
                status: 200,
            });
        }

        /* ---------------------------------------
           2️⃣ Get ACTIVE assignments for today
        --------------------------------------- */
        const { data: assignments, error: assignmentsError } =
            await supabaseClient
                .from("driver_number_assignments")
                .select("id")
                .eq("driver_id", driver.id)
                .lte("week_start", today)
                .or(`week_end.is.null,week_end.gte.${today}`);

        if (assignmentsError) {
            throw new Error(assignmentsError.message);
        }

        const assignmentIds = (assignments ?? []).map((a) => a.id);

        if (assignmentIds.length === 0) {
            return new Response(JSON.stringify({ submitted: false }), {
                status: 200,
            });
        }

        /* ---------------------------------------
           3️⃣ Get today's delivery entries for those assignments
        --------------------------------------- */
        const { data: entries, error: entriesError } = await supabaseClient
            .from("delivery_entries")
            .select("driver_assignment_id, deliveries")
            .eq("delivery_date", today)
            .in("driver_assignment_id", assignmentIds);

        if (entriesError) {
            throw new Error(entriesError.message);
        }

        if (!entries || entries.length === 0) {
            return new Response(JSON.stringify({ submitted: false }), {
                status: 200,
            });
        }

        /* ---------------------------------------
           4️⃣ Build map for UI
        --------------------------------------- */
        const values: Record<string, number> = {};
        for (const row of entries) {
            values[row.driver_assignment_id] = row.deliveries;
        }

        return new Response(
            JSON.stringify({ submitted: true, values }),
            { status: 200 }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({
                error: err?.message ?? "Failed to load today summary",
            }),
            { status: 500 }
        );
    }
}
