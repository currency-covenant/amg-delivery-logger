import React from "react";
import { View, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useWeeklyPayrollExport } from
        "@/app/api/supabase/admin/weeklyReports/useWeeklyPayrollExport";

export function AdminControls() {
    const exportWeeklyPayroll = useWeeklyPayrollExport();

    return (
        <View className="px-6 mt-6">
            <View className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">

                <ThemedText className="text-center text-lg font-semibold text-white">
                    Admin Tools
                </ThemedText>

                <Pressable
                    onPress={() => exportWeeklyPayroll.mutate()}
                    disabled={exportWeeklyPayroll.isPending}
                    className="mt-4 bg-blue-600 rounded-lg p-3"
                >
                    <ThemedText className="text-center text-white font-semibold">
                        {exportWeeklyPayroll.isPending
                            ? "Preparing Reports..."
                            : "Download Weekly Reports (.zip)"}
                    </ThemedText>
                </Pressable>

            </View>
        </View>
    );
}
