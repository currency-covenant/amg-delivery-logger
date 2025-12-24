import supabaseClient from "@/clients/supabase";

type Payload = {
    clerkAuthId: string;
    driverNumbers: string[];
    weekStart: string; // YYYY-MM-DD
    weekEnd: string;   // YYYY-MM-DD
};

export async function POST(request: Request): Promise<Response> {
    try {
        const body = (await request.json()) as Payload;
        const { clerkAuthId, driverNumbers, weekStart, weekEnd } = body;

        if (!clerkAuthId || !driverNumbers?.length) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400 }
            );
        }

        const normalizedNumbers = driverNumbers.map((n) => n.trim());

        /* ---------------------------------------
           1️⃣ Fetch driver
        --------------------------------------- */
        const { data: driver, error: driverError } = await supabaseClient
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
           2️⃣ Prevent duplicate weekly submission
        --------------------------------------- */
        const { data: existing } = await supabaseClient
            .from("driver_number_assignments")
            .select("id")
            .eq("driver_id", driver.id)
            .eq("week_start", weekStart)
            .limit(1);

        if (existing && existing.length > 0) {
            return new Response(
                JSON.stringify({ alreadySubmitted: true }),
                { status: 200 }
            );
        }

        /* ---------------------------------------
           3️⃣ Fetch existing driver_numbers
        --------------------------------------- */
        const { data: existingNumbers, error: fetchError } =
            await supabaseClient
                .from("driver_numbers")
                .select("id, driver_number")
                .in("driver_number", normalizedNumbers);

        if (fetchError) {
            throw new Error(fetchError.message);
        }

        const existingMap = new Map(
            (existingNumbers ?? []).map((n) => [n.driver_number, n.id])
        );

        /* ---------------------------------------
           4️⃣ Insert missing driver_numbers
        --------------------------------------- */
        const missingNumbers = normalizedNumbers.filter(
            (n) => !existingMap.has(n)
        );

        let insertedNumbers: { id: string; driver_number: string }[] = [];

        if (missingNumbers.length > 0) {
            const { data, error } = await supabaseClient
                .from("driver_numbers")
                .insert(
                    missingNumbers.map((n) => ({
                        driver_number: n,
                    }))
                )
                .select("id, driver_number");

            if (error) {
                throw new Error(error.message);
            }

            insertedNumbers = data ?? [];
        }

        /* ---------------------------------------
           5️⃣ Combine all driver_number IDs
        --------------------------------------- */
        const allNumberIds = [
            ...existingNumbers!,
            ...insertedNumbers,
        ].map((n) => n.id);

        /* ---------------------------------------
           6️⃣ Insert weekly assignments
        --------------------------------------- */
        const inserts = allNumberIds.map((driver_number_id) => ({
            driver_id: driver.id,
            driver_number_id,
            week_start: weekStart,
            week_end: weekEnd,
        }));

        const { error: insertError } = await supabaseClient
            .from("driver_number_assignments")
            .insert(inserts);

        if (insertError) {
            throw new Error(insertError.message);
        }

        return new Response(
            JSON.stringify({
                success: true,
                createdDriverNumbers: missingNumbers,
            }),
            { status: 200 }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({
                error: err?.message ?? "Failed to assign driver numbers",
            }),
            { status: 500 }
        );
    }
}
