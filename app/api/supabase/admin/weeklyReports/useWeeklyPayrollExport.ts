import { useMutation } from "@tanstack/react-query";
import { Platform, Alert } from "react-native";
import * as Linking from "expo-linking";
import { getBaseUrl } from "@/utils/getBaseUrl";

export function useWeeklyPayrollExport() {
    return useMutation({
        mutationFn: async () => {
            const baseUrl = getBaseUrl();
            const url =
                `${baseUrl}/api/supabase/admin/weeklyReports/weekly-reports`;

            // Web → browser handles ZIP download
            if (Platform.OS === "web") {
                window.open(url, "_blank");
                return;
            }

            // Mobile → open system browser
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                throw new Error("Cannot open download URL");
            }

            await Linking.openURL(url);
        },

        onError: (err: any) => {
            console.error("Weekly export failed:", err);
            Alert.alert(
                "Download failed",
                err?.message ?? "Unable to download weekly reports"
            );
        },
    });
}
