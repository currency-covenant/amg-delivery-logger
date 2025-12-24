import supabaseClient from "@/clients/supabase";

type DeliveryInput = {
    driverAssignmentId: string;
    deliveries: number;
};

type Payload = {
    clerkAuthId: string;
    deliveryDate: string; // YYYY-MM-DD
    entries: DeliveryInput[];
};

export async function POST(request: Request): Promise<Response> {
    try {
        const body = (await request.json()) as Payload;
        const { clerkAuthId, deliveryDate, entries } = body;

        if (!clerkAuthId || !deliveryDate || !entries?.length) {
            return new Response(
                JSON.stringify({ error: "Missing or invalid fields" }),
                { status: 400 }
            );
        }

        /* ---------------------------------------
           1️⃣ Validate driver
        --------------------------------------- */
        const { data: driver } = await supabaseClient
            .from("drivers")
            .select("id")
            .eq("clerk_auth_id", clerkAuthId)
            .single();

        if (!driver) {
            return new Response(
                JSON.stringify({ error: "Driver not found" }),
                { status: 404 }
            );
        }

        const assignmentIds = entries.map((e) => e.driverAssignmentId);

        /* ---------------------------------------
           2️⃣ Ensure assignments belong to driver
        --------------------------------------- */
        const { data: assignments } = await supabaseClient
            .from("driver_number_assignments")
            .select("id")
            .eq("driver_id", driver.id)
            .in("id", assignmentIds);

        if (!assignments || assignments.length !== assignmentIds.length) {
            return new Response(
                JSON.stringify({ error: "Invalid assignments" }),
                { status: 400 }
            );
        }

        /* ---------------------------------------
           3️⃣ Delete existing entries (edit-safe)
        --------------------------------------- */
        await supabaseClient
            .from("delivery_entries")
            .delete()
            .in("driver_assignment_id", assignmentIds)
            .eq("delivery_date", deliveryDate);

        /* ---------------------------------------
           4️⃣ Insert new entries
        --------------------------------------- */
        const inserts = entries.map((e) => ({
            driver_assignment_id: e.driverAssignmentId,
            delivery_date: deliveryDate,
            deliveries: e.deliveries,
        }));

        const { error } = await supabaseClient
            .from("delivery_entries")
            .insert(inserts);

        if (error) {
            throw new Error(error.message);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
        });
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500 }
        );
    }
}
