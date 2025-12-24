import supabaseClient from "@/clients/supabase";

export async function GET(request: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const clerkAuthId = searchParams.get("clerkAuthId");
        const weekStart = searchParams.get("weekStart");

        // 🔑 Treat missing params as "not submitted", NOT an error
        if (!clerkAuthId || !weekStart) {
            return new Response(
                JSON.stringify({ submitted: false }),
                { status: 200 }
            );
        }

        // 1️⃣ Get driver
        const { data: driver } = await supabaseClient
            .from("drivers")
            .select("id")
            .eq("clerk_auth_id", clerkAuthId)
            .single();

        if (!driver) {
            return new Response(
                JSON.stringify({ submitted: false }),
                { status: 200 }
            );
        }

        // 2️⃣ Check weekly assignments
        const { data: assignments } = await supabaseClient
            .from("driver_number_assignments")
            .select("id")
            .eq("driver_id", driver.id)
            .eq("week_start", weekStart)
            .limit(1);

        const submitted =
            Array.isArray(assignments) && assignments.length > 0;

        return new Response(
            JSON.stringify({ submitted }),
            { status: 200 }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ submitted: false }),
            { status: 200 } // 🔑 never hard-fail UI
        );
    }
}
