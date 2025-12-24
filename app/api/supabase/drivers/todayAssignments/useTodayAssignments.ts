import { useQuery } from "@tanstack/react-query";

export type Assignment = {
    id: string;
    driver_numbers: {
        driver_number: string;
    };
};

async function fetchTodayAssignments(clerkAuthId: string) {
    const res = await fetch(
        `/api/supabase/drivers/todayAssignments/today-assignments?clerkAuthId=${encodeURIComponent(
            clerkAuthId
        )}`
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Failed to load assignments");
    }

    return data as Assignment[];
}

export function useTodayAssignments(clerkAuthId?: string) {
    return useQuery({
        queryKey: ["today-assignments", clerkAuthId],
        queryFn: () => fetchTodayAssignments(clerkAuthId!),
        enabled: !!clerkAuthId,
    });
}
