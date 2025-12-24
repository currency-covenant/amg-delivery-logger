import { useQuery } from "@tanstack/react-query";

type WeeklyCheckResponse = {
    submitted: boolean;
};

async function checkWeeklyDriverNumbers(
    clerkAuthId: string,
    weekStart: string
): Promise<WeeklyCheckResponse> {
    const res = await fetch(
        `/api/supabase/drivers/checkWeeklyDriverNumbers/check-weekly?clerkAuthId=${encodeURIComponent(
            clerkAuthId
        )}&weekStart=${weekStart}`
    );

    const data = await res.json();

    // 🔑 Do NOT throw — return safe default
    if (!res.ok) {
        return { submitted: false };
    }

    return data;
}

export function useCheckWeeklyDriverNumbers(
    clerkAuthId?: string,
    weekStart?: string
) {
    return useQuery({
        queryKey: ["weekly-driver-numbers", clerkAuthId, weekStart],
        queryFn: () =>
            checkWeeklyDriverNumbers(clerkAuthId!, weekStart!),
        enabled: !!clerkAuthId && !!weekStart,
        retry: false, // 🔑 avoid retry loops during hydration
    });
}
