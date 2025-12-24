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
        const { data: driver, error: driverError } =
            await supabaseClient
                .from("drivers")
                .select("id")
                .eq("clerk_auth_id", clerkAuthId)
                .single();

        if (driverError || !driver) {
            return new Response(
                JSON.stringify({ error: "Driver not found" }),
                { status: 404 }
            );
        }

        /* ---------------------------------------
           2️⃣ Get ACTIVE assignments for today
        --------------------------------------- */
        const { data: assignments, error } =
            await supabaseClient
                .from("driver_number_assignments")
                .select(
                    `
                    id,
                    driver_numbers (
                        driver_number
                    )
                `
                )
                .eq("driver_id", driver.id)
                .lte("week_start", today)
                .or(`week_end.is.null,week_end.gte.${today}`);

        if (error) {
            throw new Error(error.message);
        }

        return new Response(
            JSON.stringify(assignments ?? []),
            { status: 200 }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({
                error: err?.message ?? "Failed to load assignments",
            }),
            { status: 500 }
        );
    }
}
