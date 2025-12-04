import React, { useState } from "react";
import { View, Pressable, Alert, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/themed-text";
import { useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { startOfWeek, subWeeks } from "date-fns";

export function AdminControls() {
    const { user } = useUser();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    if (!user) return null;
    if (user.publicMetadata?.role !== "admin") return null;

    // -------------------------------------------------------------
    // Helper: compute last completed Monday
    // -------------------------------------------------------------
    const getLastCompletedWeekStart = () => {
        const today = new Date();

        if (today.getDay() === 1) {
            return startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        }

        const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
        return subWeeks(thisMonday, 1);
    };

    // -------------------------------------------------------------
    // Opens browser for download
    // -------------------------------------------------------------
    const downloadWeek = async (weekStart: string) => {
        const endpoint = `http://192.168.1.28:8081/api/createWeeklySpreadsheet/create-weekly-spreadsheet?week_start=${weekStart}`;

        try {
            if (Platform.OS === "web") {
                window.location.href = endpoint;
            } else {
                await Linking.openURL(endpoint);
            }
        } catch (err) {
            console.error("Unable to open browser:", err);
            Alert.alert("Error", "Unable to open browser to download file.");
        }
    };

    const handleDownloadLastWeek = () => {
        const monday = getLastCompletedWeekStart();
        const formatted = monday.toISOString().slice(0, 10);
        downloadWeek(formatted);
    };

    const handleCustomWeekDownload = () => {
        const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const formatted = monday.toISOString().slice(0, 10);
        downloadWeek(formatted);
    };

    return (
        <View className="px-6 mt-6">
            <View className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 shadow-lg shadow-black/30">

                <ThemedText className="text-center text-lg font-semibold text-white">
                    Admin Tools
                </ThemedText>

                {/* Download last completed week */}
                <Pressable
                    onPress={handleDownloadLastWeek}
                    className="mt-4 bg-blue-600 rounded-lg p-3"
                >
                    <ThemedText className="text-center text-white font-semibold">
                        Download Last Completed Week (.xlsx)
                    </ThemedText>
                </Pressable>

                {/* Always-visible date picker */}
                <View className="mt-6">
                    <ThemedText className="text-white mb-2">
                        Select Week to Export:
                    </ThemedText>

                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={(event, date) => {
                            if (date) setSelectedDate(date);
                        }}
                    />
                </View>

                {/* Export selected week */}
                <Pressable
                    onPress={handleCustomWeekDownload}
                    className="mt-4 bg-green-600 rounded-lg p-3"
                >
                    <ThemedText className="text-center text-white font-semibold">
                        Export Selected Week
                    </ThemedText>
                </Pressable>

            </View>
        </View>
    );
}
