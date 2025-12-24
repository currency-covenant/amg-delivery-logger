import supabaseClient from "@/clients/supabase";
import { clerkClient } from "@/clients/clerk";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            clerk_auth_id,
            email,
            first_name,
            last_name,
            area_id,
        } = body;

        if (!clerk_auth_id || !first_name || !last_name || !area_id) {
            return Response.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        /* ---------------------------------------
           🚫 BLOCK ADMINS (SERVER-SIDE)
        --------------------------------------- */
        const user = await clerkClient.users.getUser(clerk_auth_id);
        const role = (user.publicMetadata as any)?.role;

        if (role === "admin") {
            return Response.json(
                { error: "Admins cannot be synced as drivers" },
                { status: 403 }
            );
        }

        /* ---------------------------------------
           Upsert driver
        --------------------------------------- */
        const full_name = `${first_name} ${last_name}`.trim();

        const { data: existing, error: findErr } = await supabaseClient
            .from("drivers")
            .select("id")
            .eq("clerk_auth_id", clerk_auth_id)
            .maybeSingle();

        if (findErr) {
            return Response.json({ error: findErr.message }, { status: 500 });
        }

        if (existing) {
            const { error } = await supabaseClient
                .from("drivers")
                .update({
                    full_name,
                    email,
                    area_id,
                })
                .eq("clerk_auth_id", clerk_auth_id);

            if (error) {
                return Response.json({ error: error.message }, { status: 500 });
            }

            return Response.json({ status: "updated" });
        }

        const { error } = await supabaseClient.from("drivers").insert({
            clerk_auth_id,
            full_name,
            email,
            area_id,
        });

        if (error) {
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ status: "created" });
    } catch (err: any) {
        return Response.json(
            { error: err.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
