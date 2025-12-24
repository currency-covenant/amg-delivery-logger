import { useMutation, useQueryClient } from "@tanstack/react-query";

type Entry = {
    driverAssignmentId: string;
    deliveries: number;
};

type SubmitPayload = {
    clerkAuthId: string;
    deliveryDate: string;
    entries: Entry[];
};

async function logDeliveries(payload: SubmitPayload) {
    const res = await fetch(
        "/api/supabase/deliveries/logDeliveries/log-deliveries",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Submission failed");
    }

    return data;
}

export function useLogDeliveries() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: logDeliveries,
        onSuccess: (_, variables) => {
            // 🔥 THIS is what makes WeeklyDeliveriesSection update
            queryClient.invalidateQueries({
                queryKey: ["weekly-total", variables.clerkAuthId],
            });

            // also refresh today's summary if needed
            queryClient.invalidateQueries({
                queryKey: ["today-delivery-summary", variables.clerkAuthId],
            });
        },
    });
}
