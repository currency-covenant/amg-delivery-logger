import React, { useRef, useEffect } from "react";
import { View, Animated } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";

interface Props {
    firstName: string;
    totalDelivered: number;
    loading: boolean;
}

export function WeeklyDeliveries({
                                     firstName,
                                     totalDelivered,
                                     loading,
                                 }: Props) {
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1.25,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulse]);

    return (
        <View className="px-6 mt-10">
            <View className="bg-neutral-900 rounded-2xl p-8 shadow-xl shadow-black/50 border border-neutral-800 items-center">
                {/* Icon */}
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                    <Ionicons name="cube-outline" size={48} color="#3B82F6" />
                </Animated.View>

                {/* Welcome */}
                <ThemedText className="text-center text-2xl font-bold mt-4 mb-1 text-white">
                    Welcome back, {firstName}!
                </ThemedText>

                <ThemedText className="text-center text-lg font-semibold mb-6 text-neutral-300">
                    Deliveries This Week
                </ThemedText>

                {/* Content */}
                {loading ? (
                    <ThemedText className="text-center text-neutral-400">
                        Loading…
                    </ThemedText>
                ) : totalDelivered === 0 ? (
                    <ThemedText className="text-center text-neutral-400">
                        No deliveries recorded yet this week.
                    </ThemedText>
                ) : (
                    <View className="bg-neutral-800 border border-neutral-700 rounded-xl px-6 py-6 w-full">
                        <ThemedText className="text-center text-4xl font-bold text-white">
                            {totalDelivered}
                        </ThemedText>
                        <ThemedText className="text-center text-neutral-400 mt-1">
                            Deliveries This Week
                        </ThemedText>
                    </View>
                )}
            </View>
        </View>
    );
}
