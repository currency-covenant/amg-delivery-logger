import { useQuery } from "@tanstack/react-query";

export type TodayDeliverySummary = {
    submitted: boolean;
    values?: Record<string, number>;
};

async function fetchTodaySummary(clerkAuthId: string) {
    const res = await fetch(
        `/api/supabase/deliveries/todaySummary/today-summary?clerkAuthId=${encodeURIComponent(
            clerkAuthId
        )}`
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Failed to load today’s summary");
    }

    return data as TodayDeliverySummary;
}

export function useTodaySummary(clerkAuthId?: string) {
    return useQuery({
        queryKey: ["today-delivery-summary", clerkAuthId],
        queryFn: () => fetchTodaySummary(clerkAuthId!),
        enabled: !!clerkAuthId,
    });
}
