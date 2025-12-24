import { useMutation } from "@tanstack/react-query";

type AssignPayload = {
    clerkAuthId: string;
    driverNumbers: string[];
    weekStart: string;
    weekEnd: string;
};

type AssignResponse = {
    success?: boolean;
    alreadySubmitted?: boolean;
    createdDriverNumbers?: string[];
};

async function assignDriverNumbers(
    payload: AssignPayload
): Promise<AssignResponse> {
    const res = await fetch(
        "/api/supabase/drivers/assignDriverNumbers/assign-driver-numbers",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Assignment failed");
    }

    return data;
}

export function useAssignDriverNumbers() {
    return useMutation({
        mutationFn: assignDriverNumbers,
    });
}
