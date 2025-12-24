import { useQuery } from "@tanstack/react-query";
import supabaseClient from "@/clients/supabase";

export function useDriverProfile(clerkAuthId?: string) {
    return useQuery({
        queryKey: ["driver-profile", clerkAuthId],
        enabled: !!clerkAuthId,
        queryFn: async () => {
            const { data, error } = await supabaseClient
                .from("drivers")
                .select("id, full_name, area_id")
                .eq("clerk_auth_id", clerkAuthId)
                .maybeSingle();

            if (error) {
                throw new Error(error.message);
            }

            return data; // null if not found
        },
    });
}
