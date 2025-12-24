import { useQuery } from "@tanstack/react-query";

type WeeklyTotalResponse = {
    driverId: string;
    weekStart: string;
    weekEnd: string;
    totalDelivered: number;
};

async function fetchWeeklyTotal(
    clerkAuthId: string
): Promise<WeeklyTotalResponse> {
    const res = await fetch(
        `/api/supabase/deliveries/weeklyTotal/weekly-total?clerkAuthId=${encodeURIComponent(
            clerkAuthId
        )}`
    );

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch weekly total");
    }

    return res.json();
}

export function useWeeklyTotal(clerkAuthId?: string) {
    return useQuery({
        queryKey: ["weekly-total", clerkAuthId],
        queryFn: () => fetchWeeklyTotal(clerkAuthId!),
        enabled: !!clerkAuthId,
        staleTime: 1000 * 60 * 5,
    });
}
