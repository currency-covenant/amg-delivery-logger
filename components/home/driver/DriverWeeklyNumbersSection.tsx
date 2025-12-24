import { useState } from "react";
import {
    View,
    TextInput,
    Pressable,
    ActivityIndicator,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { ThemedText } from "@/components/themed-text";
import { startOfWeek, endOfWeek } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

import { useAssignDriverNumbers } from "@/app/api/supabase/drivers/assignDriverNumbers/useAssignDriverNumbers";
import { useCheckWeeklyDriverNumbers } from "@/app/api/supabase/drivers/checkWeeklyDriverNumbers/useCheckWeeklyDriverNumbers";

export function DriverWeeklyNumbersSection() {
    /* ---------------------------------------
       Hooks MUST be unconditional
    --------------------------------------- */
    const { user } = useUser();

    const [driverNumbers, setDriverNumbers] = useState<string[]>([""]);
    const [localSubmitted, setLocalSubmitted] = useState(false);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        .toISOString()
        .slice(0, 10);

    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
        .toISOString()
        .slice(0, 10);

    const clerkAuthId = user?.id;

    const {
        data,
        isLoading,
        isError,
    } = useCheckWeeklyDriverNumbers(clerkAuthId, weekStart);

    const assignMutation = useAssignDriverNumbers();

    /* ---------------------------------------
       Guard AFTER hooks
    --------------------------------------- */
    if (!user) return null;

    const submitted = Boolean(data?.submitted) || localSubmitted;

    /* ---------------------------------------
       Loading / error
    --------------------------------------- */
    if (isLoading) {
        return (
            <View className="px-6 mt-10 items-center">
                <ActivityIndicator />
            </View>
        );
    }

    if (isError) {
        return (
            <View className="px-6 mt-10">
                <ThemedText className="text-red-500">
                    Failed to check weekly driver numbers.
                </ThemedText>
            </View>
        );
    }

    /* ---------------------------------------
       Already submitted (read-only)
    --------------------------------------- */
    if (submitted) {
        return (
            <View className="px-6 mt-10">
                <View className="rounded-2xl p-6 bg-emerald-500/10 border border-emerald-500/30">
                    <ThemedText className="text-lg font-semibold text-emerald-400 mb-2">
                        Driver Numbers Submitted
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-400">
                        You’ve completed this step for the current week.
                    </ThemedText>
                </View>
            </View>
        );
    }

    /* ---------------------------------------
       Input helpers
    --------------------------------------- */
    const updateNumber = (index: number, value: string) => {
        setDriverNumbers((prev) =>
            prev.map((n, i) => (i === index ? value : n))
        );
    };

    const addInput = () => {
        setDriverNumbers((prev) => [...prev, ""]);
    };

    const removeInput = (index: number) => {
        setDriverNumbers((prev) =>
            prev.filter((_, i) => i !== index)
        );
    };

    const onSubmit = () => {
        const cleaned = driverNumbers
            .map((n) => n.trim())
            .filter(Boolean);

        if (!cleaned.length || !clerkAuthId) return;

        assignMutation.mutate(
            {
                clerkAuthId,
                driverNumbers: cleaned,
                weekStart,
                weekEnd,
            },
            {
                onSuccess: () => {
                    setLocalSubmitted(true);
                },
            }
        );
    };

    /* ---------------------------------------
       Input form
    --------------------------------------- */
    return (
        <View className="px-6 mt-10">
            <ThemedText className="text-xl font-bold mb-3">
                Driver Numbers (This Week)
            </ThemedText>

            <ThemedText className="text-sm text-neutral-400 mb-4">
                Enter each driver number you’ll use this week.
            </ThemedText>

            {driverNumbers.map((value, index) => (
                <View
                    key={index}
                    className="flex-row items-center mb-3"
                >
                    <TextInput
                        value={value}
                        onChangeText={(v) => updateNumber(index, v)}
                        placeholder={`Driver Number ${index + 1}`}
                        className="
              flex-1
              rounded-xl
              px-4
              py-3
              bg-black/10
              dark:bg-white/10
              border
              border-black/10
              dark:border-white/10
            "
                    />

                    {driverNumbers.length > 1 && (
                        <Pressable
                            onPress={() => removeInput(index)}
                            className="ml-2 p-2"
                        >
                            <Ionicons
                                name="close-circle"
                                size={22}
                                color="#EF4444"
                            />
                        </Pressable>
                    )}
                </View>
            ))}

            <Pressable
                onPress={addInput}
                className="flex-row items-center mt-2"
            >
                <Ionicons name="add-circle" size={22} color="#3B82F6" />
                <ThemedText className="ml-2 text-blue-500 font-medium">
                    Add another number
                </ThemedText>
            </Pressable>

            <Pressable
                onPress={onSubmit}
                disabled={assignMutation.isPending}
                className={`
          mt-6
          rounded-2xl
          py-4
          items-center
          ${
                    assignMutation.isPending
                        ? "bg-gray-400"
                        : "bg-[#0a7ea4]"
                }
        `}
            >
                <ThemedText className="text-white font-semibold">
                    {assignMutation.isPending
                        ? "Saving…"
                        : "Submit Driver Numbers"}
                </ThemedText>
            </Pressable>

            {assignMutation.isError && (
                <ThemedText className="text-red-500 mt-2">
                    {(assignMutation.error as Error).message}
                </ThemedText>
            )}
        </View>
    );
}
