import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useLogDeliveries } from "@/app/api/supabase/deliveries/logDeliveries/useLogDeliveries";
import { useSearchScanners } from "@/app/api/supabase/scanners/useSearchScanners";

/* ---------------------------------------
   Types
--------------------------------------- */

export type BatchInput = {
    scannerCode: string;
    batchDeliveryCode: string;
    deliveryCount: number;
};

type Props = {
    initialBatches?: BatchInput[];
    onCancelEdit?: () => void;
};

/* ---------------------------------------
   Component
--------------------------------------- */

export function DeliveryInput({
                                  initialBatches = [],
                                  onCancelEdit,
                              }: Props) {
    const { user } = useUser();
    const queryClient = useQueryClient();

    const [batches, setBatches] = useState<BatchInput[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [currentBatch, setCurrentBatch] = useState<BatchInput>({
        scannerCode: "",
        batchDeliveryCode: "",
        deliveryCount: 0,
    });

    const [scannerQuery, setScannerQuery] = useState("");
    const [showScannerResults, setShowScannerResults] = useState(false);

    const { mutate, isPending } = useLogDeliveries();

    useEffect(() => {
        if (initialBatches.length > 0) {
            setBatches(initialBatches);
        }
    }, [initialBatches]);

    const {
        data: scannerData,
        isLoading: scannersLoading,
        error: scannersError,
    } = useSearchScanners(scannerQuery);

    const scannerResults = scannerData?.scanners ?? [];

    const groups = useMemo(() => {
        const grouped: Record<string, any> = {};

        for (const batch of batches) {
            if (!grouped[batch.batchDeliveryCode]) {
                grouped[batch.batchDeliveryCode] = {
                    group_code: batch.batchDeliveryCode,
                    expected_count: 0,
                    scans: [],
                };
            }

            grouped[batch.batchDeliveryCode].expected_count +=
                batch.deliveryCount;

            grouped[batch.batchDeliveryCode].scans.push({
                scanner_code: batch.scannerCode.trim(),
                delivered_count: batch.deliveryCount,
            });
        }

        return Object.values(grouped);
    }, [batches]);

    function resetCurrentBatch() {
        setCurrentBatch({
            scannerCode: "",
            batchDeliveryCode: "",
            deliveryCount: 0,
        });
        setScannerQuery("");
        setEditingIndex(null);
        setShowScannerResults(false);
    }

    function saveBatch() {
        if (
            !currentBatch.scannerCode ||
            !currentBatch.batchDeliveryCode ||
            currentBatch.deliveryCount <= 0
        ) {
            Toast.show({
                type: "error",
                text1: "Invalid batch",
                text2: "All fields are required",
            });
            return;
        }

        if (editingIndex !== null) {
            setBatches((prev) =>
                prev.map((b, i) => (i === editingIndex ? currentBatch : b))
            );
        } else {
            setBatches((prev) => [...prev, currentBatch]);
        }

        resetCurrentBatch();
    }

    function removeBatch(index: number) {
        setBatches((prev) => prev.filter((_, i) => i !== index));
        if (editingIndex === index) resetCurrentBatch();
    }

    function onSubmit() {
        if (!user) {
            Toast.show({ type: "error", text1: "Not authenticated" });
            return;
        }

        if (groups.length === 0) {
            Toast.show({ type: "error", text1: "No deliveries added" });
            return;
        }

        mutate(
            {
                clerk_auth_id: user.id,
                delivery_date: new Date().toISOString().slice(0, 10),
                groups,
            },
            {
                onSuccess: () => {
                    Toast.show({ type: "success", text1: "Deliveries saved" });
                    queryClient.invalidateQueries({
                        queryKey: ["weekly-total", user.id],
                    });

                    setBatches([]);
                    resetCurrentBatch();
                    onCancelEdit?.();
                },
                onError: (err) => {
                    Toast.show({
                        type: "error",
                        text1: "Submission failed",
                        text2: err.message,
                    });
                },
            }
        );
    }

    function cancelEdit() {
        setBatches(initialBatches);
        resetCurrentBatch();
        onCancelEdit?.();
    }

    return (
        <>
            {/* Current Batch */}
            <View className="rounded-3xl p-6 mb-6 bg-white dark:bg-gray-900 shadow-lg border border-black/5">
                <ThemedText className="text-xl font-semibold text-center mb-1">
                    {editingIndex !== null
                        ? "Edit Batch"
                        : initialBatches.length > 0
                            ? "Edit Today’s Deliveries"
                            : "Add Delivery Batch"}
                </ThemedText>

                <ThemedText className="text-sm text-center opacity-60 mb-5">
                    Scanner, batch code, and delivered count
                </ThemedText>

                {/* Scanner Code */}
                <TextInput
                    value={scannerQuery}
                    onChangeText={(v) => {
                        setScannerQuery(v);
                        setCurrentBatch((b) => ({ ...b, scannerCode: "" }));
                        setShowScannerResults(true);
                    }}
                    placeholder="Scanner Code"
                    placeholderTextColor="#687076"
                    className="
            rounded-xl
            px-4
            py-4
            mb-2
            bg-black/5
            dark:bg-white/10
            border
            border-black/5
            font-mono
            text-[#11181C]
            dark:text-[#ECEDEE]
          "
                />

                {showScannerResults && (
                    <View className="rounded-xl mb-3 overflow-hidden bg-white dark:bg-gray-800 border border-black/10">
                        {scannersLoading && (
                            <ThemedText className="p-3 text-sm opacity-60">
                                Searching scanners…
                            </ThemedText>
                        )}

                        {scannersError && (
                            <ThemedText className="p-3 text-sm text-red-500">
                                Failed to load scanners
                            </ThemedText>
                        )}

                        {!scannersLoading &&
                            scannerResults.map((item) => (
                                <Pressable
                                    key={item}
                                    onPress={() => {
                                        setScannerQuery(item);
                                        setCurrentBatch((b) => ({
                                            ...b,
                                            scannerCode: item,
                                        }));
                                        setShowScannerResults(false);
                                    }}
                                    className="px-4 py-3 border-b border-black/5"
                                >
                                    <ThemedText className="font-mono">
                                        {item}
                                    </ThemedText>
                                </Pressable>
                            ))}
                    </View>
                )}

                {/* Batch Code */}
                <TextInput
                    value={currentBatch.batchDeliveryCode}
                    onChangeText={(v) =>
                        setCurrentBatch((b) => ({ ...b, batchDeliveryCode: v }))
                    }
                    placeholder="Batch Code"
                    placeholderTextColor="#687076"
                    className="
            rounded-xl
            px-4
            py-4
            mb-4
            bg-black/5
            dark:bg-white/10
            border
            border-black/5
            font-mono
            text-[#11181C]
            dark:text-[#ECEDEE]
          "
                />

                {/* Delivery Count */}
                <View className="flex-row items-center justify-between mb-5">
                    <Pressable
                        onPress={() =>
                            setCurrentBatch((b) => ({
                                ...b,
                                deliveryCount: Math.max(0, b.deliveryCount - 1),
                            }))
                        }
                        className="rounded-xl p-3 bg-[#0a7ea4]"
                    >
                        <Ionicons name="remove" size={22} color={'#fff'}/>
                    </Pressable>

                    <TextInput
                        value={currentBatch.deliveryCount.toString()}
                        keyboardType="numeric"
                        placeholderTextColor="#687076"
                        className="text-center text-[#0a7ea4]"
                        style={{ fontFamily: Fonts.rounded, fontSize: 36 }}
                        onChangeText={(text) => {
                            const numericValue = Number(text.replace(/[^0-9]/g, ""));
                            setCurrentBatch((b) => ({
                                ...b,
                                deliveryCount: isNaN(numericValue) ? 0 : numericValue,
                            }));
                        }}
                    />

                    <Pressable
                        onPress={() =>
                            setCurrentBatch((b) => ({
                                ...b,
                                deliveryCount: b.deliveryCount + 1,
                            }))
                        }
                        className="rounded-xl p-3 bg-[#0a7ea4]"
                    >
                        <Ionicons name="add" size={22} color="#fff" />
                    </Pressable>
                </View>

                {/* Add / Update Batch */}
                <Pressable
                    onPress={saveBatch}
                    className={`rounded-2xl py-4 items-center shadow-md ${
                        editingIndex !== null ? "bg-[#0a7ea4]" : "bg-[#0a7ea4]"
                    }`}
                >
                    <ThemedText className="text-white font-semibold text-base">
                        {editingIndex !== null ? "Update Batch" : "Add Batch"}
                    </ThemedText>
                </Pressable>

                {editingIndex !== null && (
                    <Pressable
                        onPress={resetCurrentBatch}
                        className="
              mt-3
              py-3
              rounded-xl
              items-center
              bg-transparent
              border
              border-[#0a7ea4]/40
            "
                    >
                        <ThemedText className="font-semibold">
                            Cancel Batch Edit
                        </ThemedText>
                    </Pressable>
                )}
            </View>

            {/* Added Batches */}
            {batches.length > 0 && (
                <View className="mb-6">
                    <ThemedText className="text-base font-semibold mb-3">
                        Added Deliveries ({batches.length})
                    </ThemedText>

                    {batches.map((b, idx) => (
                        <Pressable
                            key={idx}
                            onPress={() => {
                                setEditingIndex(idx);
                                setCurrentBatch(b);
                                setScannerQuery(b.scannerCode);
                            }}
                            className={`rounded-2xl p-4 mb-2 bg-black/5 dark:bg-white/10 flex-row justify-between ${
                                editingIndex === idx ? "border-2 border-[#0a7ea4]" : ""
                            }`}
                        >
                            <View>
                                <ThemedText className="font-bold text-4xl mb-1">
                                    Scanner
                                </ThemedText>
                                <ThemedText className="font-medium mb-4">
                                    {b.scannerCode}
                                </ThemedText>

                                <ThemedText className=" mb-1 font-bold text-4xl text-white">
                                    Package Group:
                                </ThemedText>
                                <ThemedText className="font-medium mb-1">
                                    {b.batchDeliveryCode}
                                </ThemedText>

                                <ThemedText className="font-medium">
                                    Count: {b.deliveryCount}
                                </ThemedText>
                            </View>

                            <Pressable onPress={() => removeBatch(idx)}>
                                <Ionicons
                                    name="close-circle"
                                    size={24}
                                    color="#ef4444"
                                />
                            </Pressable>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Save / Cancel */}
            <View className="gap-3">
                <Pressable
                    onPress={onSubmit}
                    disabled={batches.length === 0 || isPending}
                    className={`rounded-2xl py-5 items-center ${
                        batches.length === 0 ? "bg-gray-300" : "bg-green-600"
                    }`}
                >
                    <ThemedText className="text-white text-lg font-semibold">
                        {isPending ? "Saving..." : "Save Deliveries"}
                    </ThemedText>
                </Pressable>

                {onCancelEdit && (
                    <Pressable
                        onPress={cancelEdit}
                        className="rounded-2xl py-4 items-center bg-black/10"
                    >
                        <ThemedText className="font-semibold">
                            Cancel Edit
                        </ThemedText>
                    </Pressable>
                )}
            </View>
        </>
    );
}
