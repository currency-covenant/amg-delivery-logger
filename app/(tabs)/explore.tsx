import { View, ActivityIndicator, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { Navbar } from "@/components/global/navbar";

import { useUser } from "@clerk/clerk-expo";
import { useThemeColor } from "@/hooks/use-theme-color";

import { DeliveryInput } from "@/components/pages/explore/delivery-input";
import { DeliverySummary } from "@/components/pages/explore/delivery-summary";


import Toast from "react-native-toast-message";
import {useTodaySummary} from "@/app/api/supabase/deliveries/todaySummary/useTodaySummary";

export default function LogDeliveriesScreen() {
    const { user, isLoaded } = useUser();
    const backgroundColor = useThemeColor({}, "background");

    const { data, isLoading, isError } = useTodaySummary(user?.id);

    const [submittedValues, setSubmittedValues] =
        useState<Record<string, number> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (data?.submitted && data.values) {
            setSubmittedValues(data.values);
        }
        if (data && !data.submitted) {
            setSubmittedValues(null);
        }
    }, [data]);

    if (!isLoaded || isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center">
                <ThemedText>You must be logged in.</ThemedText>
            </View>
        );
    }

    if (isError) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <ThemedText lightColor="#DC2626" darkColor="#F87171">
                    Failed to load today’s delivery status.
                </ThemedText>
            </View>
        );
    }

    function handleSuccess(values: Record<string, number>) {
        setSubmittedValues(values);
        setIsEditing(false);

        Toast.show({
            type: "success",
            text1: "Deliveries saved",
            text2: "You can edit them anytime today.",
        });
    }

    return (
        <View style={{ flex: 1, backgroundColor }}>
            <Navbar />

            <ScrollView keyboardShouldPersistTaps="handled">
                <View className="px-6 pt-8 pb-24">
                    <View className="mb-10">
                        <ThemedText
                            className="text-3xl font-bold text-center"
                            style={{ fontFamily: Fonts.rounded }}
                        >
                            Daily Deliveries
                        </ThemedText>
                    </View>

                    {!submittedValues || isEditing ? (
                        <DeliveryInput
                            initialValues={submittedValues ?? undefined}
                            onSuccess={handleSuccess}
                        />
                    ) : (
                        <DeliverySummary
                            values={submittedValues}
                            onEdit={() => setIsEditing(true)}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
