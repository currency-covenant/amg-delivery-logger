import { useMutation } from "@tanstack/react-query";
import { Platform, Alert } from "react-native";
import * as Linking from "expo-linking";
import { getBaseUrl } from "@/utils/getBaseUrl";

type ExportArgs = {
    weekStart?: string;
};

export function useWeeklyPayrollExport() {
    return useMutation<void, Error, ExportArgs | void>({
        mutationFn: async (args) => {
            const baseUrl = getBaseUrl();
            const weekStart = args && "weekStart" in args ? args.weekStart : undefined;

            const url =
                `${baseUrl}/api/supabase/admin/weeklyReports/weekly-payroll` +
                (weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "");

            if (Platform.OS === "web") {
                window.open(url, "_blank");
                return;
            }

            const supported = await Linking.canOpenURL(url);
            if (!supported) throw new Error("Cannot open download URL");
            await Linking.openURL(url);
        },
        onError: (err) => {
            console.error("Weekly payroll export failed:", err);
            Alert.alert("Download failed", err.message ?? "Unable to download payroll spreadsheet");
        },
    });
}
