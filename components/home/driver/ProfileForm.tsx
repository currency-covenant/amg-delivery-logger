import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { ThemedText } from "@/components/themed-text";
import { Area } from "@/app/api/supabase/areas/useAreas";

interface Props {
    firstName: string;
    lastName: string;
    areaId: string;

    setFirstName: (v: string) => void;
    setLastName: (v: string) => void;
    setAreaId: (v: string) => void;

    areas: Area[];
    saving: boolean;
    onSave: () => void;
}

export function ProfileForm({
                                firstName,
                                lastName,
                                areaId,
                                setFirstName,
                                setLastName,
                                setAreaId,
                                areas,
                                saving,
                                onSave,
                            }: Props) {
    return (
        <View className="px-6 mt-10">
            <ThemedText className="text-2xl font-bold mb-6">
                Complete Your Profile
            </ThemedText>

            {/* First Name */}
            <ThemedText className="mb-1">First Name</ThemedText>
            <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                placeholderTextColor="#9BA1A6"
                className="
          rounded-xl
          px-4
          py-3
          bg-black/10
          dark:bg-white/10
          border
          border-black/10
          dark:border-white/10
          text-[#11181C]
          dark:text-[#ECEDEE]
        "
            />

            {/* Last Name */}
            <ThemedText className="mt-5 mb-1">Last Name</ThemedText>
            <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                placeholderTextColor="#9BA1A6"
                className="
          rounded-xl
          px-4
          py-3
          bg-black/10
          dark:bg-white/10
          border
          border-black/10
          dark:border-white/10
          text-[#11181C]
          dark:text-[#ECEDEE]
        "
            />

            {/* Area Picker */}
            <ThemedText className="mt-5 mb-1">Delivery Area</ThemedText>
            <View
                className="
          rounded-xl
          overflow-hidden
          bg-black/10
          dark:bg-white/10
          border
          border-black/10
          dark:border-white/10
        "
            >
                <Picker
                    selectedValue={areaId}
                    onValueChange={setAreaId}
                    dropdownIconColor="#9BA1A6"
                    style={{
                        color: areaId ? "#ECEDEE" : "#9BA1A6",
                    }}
                >
                    <Picker.Item label="Select an area…" value="" />
                    {areas.map((area) => (
                        <Picker.Item
                            key={area.id}
                            label={area.name}
                            value={area.id}
                        />
                    ))}
                </Picker>
            </View>

            {/* Save Button */}
            <Pressable
                onPress={onSave}
                disabled={saving || !areaId}
                className={`
          mt-6
          rounded-2xl
          py-4
          items-center
          ${saving || !areaId ? "bg-gray-400" : "bg-[#0a7ea4]"}
        `}
            >
                <ThemedText className="text-white font-semibold text-base">
                    {saving ? "Saving…" : "Save"}
                </ThemedText>
            </Pressable>
        </View>
    );
}
