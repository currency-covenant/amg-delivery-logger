import { useQuery } from "@tanstack/react-query";
import supabaseClient from "@/clients/supabase";

export type Area = {
    id: string;
    name: string;
};

export function useAreas() {
    return useQuery<Area[]>({
        queryKey: ["areas"],
        queryFn: async () => {
            const { data, error } = await supabaseClient
                .from("areas")
                .select("id, name")
                .order("name");

            if (error) {
                throw new Error(error.message);
            }

            return data ?? [];
        },
    });
}
