import { useEffect, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { useUser } from "@clerk/clerk-expo";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

import { useLogDeliveries } from "@/app/api/supabase/deliveries/logDeliveries/useLogDeliveries";
import { useTodayAssignments } from "@/app/api/supabase/drivers/todayAssignments/useTodayAssignments";

type Props = {
    initialValues?: Record<string, number>;
    onSuccess?: (values: Record<string, number>) => void; // ✅ changed
};

export function DeliveryInput({ initialValues, onSuccess }: Props) {
    /* ---------------------------------------
       Hooks (unconditional)
    --------------------------------------- */
    const { user } = useUser();
    const submitMutation = useLogDeliveries();

    const { data, isLoading } = useTodayAssignments(user?.id);
    const [values, setValues] = useState<Record<string, number>>({});

    /* ---------------------------------------
       Theme colors
    --------------------------------------- */
    const textColor = useThemeColor({}, "text");
    const mutedText = useThemeColor({}, "mutedText");
    const surface = useThemeColor({}, "surface");
    const border = useThemeColor({}, "border");
    const primary = useThemeColor({}, "primary");

    /* ---------------------------------------
       Sync initial values (edit mode)
    --------------------------------------- */
    useEffect(() => {
        if (initialValues) setValues(initialValues);
    }, [initialValues]);

    /* ---------------------------------------
       Guards
    --------------------------------------- */
    if (!user) return null;

    if (isLoading) {
        return (
            <View className="mt-6 items-center">
                <ThemedText style={{ color: mutedText }}>
                    Loading assignments…
                </ThemedText>
            </View>
        );
    }

    if (!data || data.length === 0) {
        return (
            <View className="mt-6">
                <ThemedText style={{ color: mutedText }} className="text-center">
                    No active driver numbers for today.
                </ThemedText>
            </View>
        );
    }

    const assignments = data;
    const clerkAuthId = user.id;
    const deliveryDate = new Date().toISOString().slice(0, 10);

    function update(id: string, value: number) {
        setValues((prev) => ({ ...prev, [id]: value }));
    }

    function onSubmit() {
        const entries = assignments.map((a) => ({
            driverAssignmentId: a.id,
            deliveries: values[a.id] ?? 0,
        }));

        submitMutation.mutate(
            { clerkAuthId, deliveryDate, entries },
            {
                onSuccess: () => {
                    // ✅ pass the latest values up so summary can render immediately
                    onSuccess?.(values);
                },
            }
        );
    }

    return (
        <View className="mt-6">
            <ThemedText className="text-xl font-bold mb-4">
                Log Today’s Deliveries
            </ThemedText>

            {assignments.map((a) => (
                <View key={a.id} className="mb-5">
                    <ThemedText className="mb-1 font-medium" style={{ color: textColor }}>
                        Driver #{a.driver_numbers.driver_number}
                    </ThemedText>

                    <TextInput
                        keyboardType="number-pad"
                        value={String(values[a.id] ?? "")}
                        onChangeText={(v) => update(a.id, Number(v) || 0)}
                        placeholder="0"
                        placeholderTextColor={mutedText}
                        style={{
                            backgroundColor: surface,
                            borderColor: border,
                            color: textColor,
                        }}
                        className="rounded-xl px-4 py-3 border"
                    />
                </View>
            ))}

            <Pressable
                onPress={onSubmit}
                disabled={submitMutation.isPending}
                style={{
                    backgroundColor: submitMutation.isPending ? `${primary}80` : primary,
                }}
                className="mt-6 rounded-2xl py-4 items-center"
            >
                <ThemedText className="text-white font-semibold">
                    {submitMutation.isPending ? "Saving…" : "Submit"}
                </ThemedText>
            </Pressable>

            {submitMutation.isError && (
                <ThemedText className="mt-3" lightColor="#DC2626" darkColor="#F87171">
                    {(submitMutation.error as Error).message}
                </ThemedText>
            )}
        </View>
    );
}
