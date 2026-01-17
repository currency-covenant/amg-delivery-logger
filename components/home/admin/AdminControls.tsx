import React, { useState } from "react";
import { View, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/themed-text";
import { startOfWeek } from "date-fns";
import { useWeeklyPayrollExport } from
        "@/app/api/supabase/admin/weeklyReports/useWeeklyPayrollExport";

export function AdminControls() {
    const exportWeeklyPayroll = useWeeklyPayrollExport();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
        .toISOString()
        .slice(0, 10);

    return (
        <View className="px-6 mt-6">
            <View className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">

                <ThemedText className="text-center text-lg font-semibold text-white">
                    Admin Tools
                </ThemedText>

                {/* Manual week picker */}
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(_, date) => date && setSelectedDate(date)}
                />

                {/* Last completed week */}
                <Pressable
                    onPress={() => exportWeeklyPayroll.mutate()}
                    disabled={exportWeeklyPayroll.isPending}
                    className="mt-4 bg-blue-600 rounded-lg p-3"
                >
                    <ThemedText className="text-center text-white font-semibold">
                        {exportWeeklyPayroll.isPending
                            ? "Preparing Reports..."
                            : "Download Last Completed Week"}
                    </ThemedText>
                </Pressable>

                {/* Selected week */}
                <Pressable
                    onPress={() => exportWeeklyPayroll.mutate({ weekStart })}
                    disabled={exportWeeklyPayroll.isPending}
                    className="mt-3 bg-green-600 rounded-lg p-3"
                >
                    <ThemedText className="text-center text-white font-semibold">
                        Download Selected Week
                    </ThemedText>
                </Pressable>

            </View>
        </View>
    );
}
