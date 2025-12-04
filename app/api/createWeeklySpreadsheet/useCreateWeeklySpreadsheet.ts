import { useMutation } from "@tanstack/react-query";

function downloadBlob(blob: Blob, filename: string) {
    console.log("Blob received:", blob);

    if (!(blob instanceof Blob)) {
        console.error("Invalid blob:", blob);
        throw new Error("Invalid Blob received from API");
    }

    const url = window.URL.createObjectURL(blob);  // <-- THIS WILL FAIL IF BLOB IS INVALID
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

export function useCreateWeeklySpreadsheet() {
    return useMutation({
        mutationFn: async ({ weekStart }: { weekStart: string }) => {

            const endpoint =
                `/api/createWeeklySpreadsheet/create-weekly-spreadsheet?week_start=${weekStart}`;

            console.log("Fetching:", endpoint);

            const res = await fetch(endpoint);

            console.log("Response status:", res.status);

            if (!res.ok) {
                console.log("Error body:", await res.text());
                throw new Error("Failed to generate spreadsheet");
            }

            const blob = await res.blob();
            console.log("BLOB FROM SERVER:", blob);

            return blob;
        },

        onSuccess: (blob, variables) => {
            const fileName = `weekly-deliveries-${variables.weekStart}.xlsx`;
            downloadBlob(blob, fileName);
        },

        onError: (error) => {
            console.error("Spreadsheet generation failed:", error);
        },
    });
}
