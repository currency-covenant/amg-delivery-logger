// components/ui/navbar.tsx
import React from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@clerk/clerk-expo";
import { UserButton } from "@/components/clerk/user-button";
import { useRouter } from "expo-router";
import {Logo} from "@/components/global/logo";

export function Navbar() {
    const iconColor = useThemeColor({}, "icon");
    const backgroundColor = useThemeColor({}, "background");

    const router = useRouter();
    const { user } = useUser();

    return (
        <SafeAreaView edges={["top"]} style={{ backgroundColor }}>
            <ThemedView className="flex-row items-center justify-between px-4 py-3">

                {/* Left */}
                <View className="flex-1" />

                {/* Center Logo */}
                <Pressable
                    className="flex-1 items-center"
                    onPress={() => router.push("/")}
                >
                    <Logo size={120} />
                    {/*    size={36}*/}
                    {/*/>*/}
                </Pressable>

                {/* Right */}
                <View className="flex-1 flex-row justify-end">
                    <UserButton />
                </View>

            </ThemedView>
        </SafeAreaView>
    );
}
