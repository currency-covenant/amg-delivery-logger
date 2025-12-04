// components/ui/navbar.tsx
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { UserButton } from "@/components/clerk/user-button";
// import { Sidebar } from "@/components/global/navbar/sidebar";
import { useRouter } from "expo-router";

export function Navbar() {
    const iconColor = useThemeColor({}, 'icon');
    const backgroundColor = useThemeColor({}, 'background');

    const router = useRouter();
    const { user } = useUser();
    const userRole = user?.publicMetadata.role;

    // const [sidebarVisible, setSidebarVisible] = useState(false);

    return (
        <>
            <SafeAreaView edges={['top']} style={{ backgroundColor }}>
                <ThemedView className="flex-row items-center justify-between px-4 py-3">

                    {/* Left (Admin Menu + User Button) */}
                    {/*{userRole === "admin" && (*/}
                        <View className="flex-1 flex-row items-start justify-start gap-4">
                            {/*<Pressable onPress={() => setSidebarVisible(true)}>*/}
                            {/*    <Ionicons name="menu" size={28} color={iconColor} />*/}
                            {/*</Pressable>*/}

{/*                            <Pressable>
                                <UserButton />
                            </Pressable>*/}
                        </View>
                    {/*)}*/}

                    {/* Left for Normal User */}
                    {/*{userRole === "user" && (
                        <Pressable className="flex-1 items-start">
                            <UserButton />
                        </Pressable>
                    )}*/}

                    {/* Center Icon (Delivery Truck) */}
                    <Pressable
                        className="flex-1 items-center"
                        onPress={() => router.push('/')}
                    >
                        <Ionicons
                            name="cube-outline"
                            size={36}
                            color={iconColor}
                        />
                    </Pressable>

                    {/* Right Icons */}
                    <View className="flex-1 flex-row items-center gap-4 justify-end">
                        {userRole === "driver" || userRole === "admin" && (
                            <Pressable className="flex-1 items-end">
                                <UserButton />
                            </Pressable>
                        )}

                    </View>
                </ThemedView>
            </SafeAreaView>

        </>
    );
}
