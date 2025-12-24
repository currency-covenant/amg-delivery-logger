// components/pages/explore/delivery-summary.tsx
import { View, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
    values: Record<string, number>;
    onEdit: () => void;
};

export function DeliverySummary({ values, onEdit }: Props) {
    const mutedText = useThemeColor({}, "mutedText");
    const primary = useThemeColor({}, "primary");

    const total = Object.values(values).reduce((a, b) => a + b, 0);

    return (
        <View className="mt-6 rounded-2xl p-6 bg-emerald-500/10 border border-emerald-500/30">
            <ThemedText className="text-xl font-bold mb-2">
                Deliveries Submitted
            </ThemedText>

            <ThemedText style={{ color: mutedText }} className="mb-4">
                Total deliveries today: {total}
            </ThemedText>

            <Pressable
                onPress={onEdit}
                style={{ backgroundColor: primary }}
                className="rounded-xl py-3 items-center"
            >
                <ThemedText className="text-white font-semibold">
                    Edit Today’s Deliveries
                </ThemedText>
            </Pressable>
        </View>
    );
}
