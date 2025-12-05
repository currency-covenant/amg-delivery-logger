import React, { useState, useEffect } from 'react';
import { Pressable, Image, View, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ProfileModal } from './ProfileModal';
import { useRouter } from "expo-router";

type NativeUserButtonProps = {
    size?: number;
    topOffset?: number;
    rightOffset?: number;
};

export function UserButton({ size = 32, topOffset = 110, rightOffset = 16 }: NativeUserButtonProps) {
    const router = useRouter();
    const { user } = useUser();
    const { signOut } = useClerk();
    const iconColor = useThemeColor({}, 'icon');

    const [visible, setVisible] = useState(false);
    const [accountModalVisible, setAccountModalVisible] = useState(false);

    // Local state for avatar
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Update avatar whenever user changes or after modal save
    useEffect(() => {
        if (!user) return;

        const newAvatar =
            typeof user.publicMetadata?.avatar === 'string'
                ? user.publicMetadata.avatar
                : typeof user.imageUrl === 'string'
                    ? user.imageUrl
                    : 'https://via.placeholder.com/48';

        setAvatarUrl(newAvatar);
    }, [user]);

    if (!user) return null;

    return (
        <>
            <Pressable
                onPress={() => setVisible(true)}
                className="justify-center items-center rounded-full overflow-hidden bg-gray-200"
                style={{ width: size, height: size, borderRadius: size / 2 }}
            >
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: size, height: size, borderRadius: size / 2 }}
                    />
                ) : (
                    <Ionicons name="person-circle" size={size} color={iconColor} />
                )}
            </Pressable>

            <Modal animationType="fade" transparent visible={visible} onRequestClose={() => setVisible(false)}>
                <Pressable className="flex-1 bg-transparent" onPress={() => setVisible(false)}>
                    <View
                        className="absolute bg-white rounded-xl p-3 shadow-md"
                        style={{ top: topOffset, right: rightOffset, minWidth: 180, maxWidth: 250 }}
                    >
                        <View className="flex-row items-center mb-3">
                            {avatarUrl ? (
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={{ width: 48, height: 48, borderRadius: 24 }}
                                />
                            ) : (
                                <Ionicons name="person-circle" size={48} color={iconColor} />
                            )}
                            <View className="ml-3 flex-shrink">
                                <Text className="text-base font-semibold">{user.fullName}</Text>
                                <Text className="text-sm text-gray-500">{user.emailAddresses[0]?.emailAddress}</Text>
                            </View>
                        </View>

                        <View className="h-px bg-gray-200 my-2" />

                        <Pressable
                            className="py-2"
                            onPress={() => {
                                setAccountModalVisible(true);
                                setVisible(false);
                            }}
                        >
                            <Text className="text-base font-medium text-blue-500">Manage Account</Text>
                        </Pressable>

                        <Pressable
                            className="py-2"
                            onPress={async () => {
                                try {
                                    await signOut();
                                    setVisible(false);

                                    // Redirect to sign-in (replace prevents stacking)
                                    router.replace("/sign-in");
                                } catch (err) {
                                    console.error("Sign-out error:", err);
                                }
                            }}
                        >
                            <Text className="text-base font-medium text-red-500">Sign Out</Text>
                        </Pressable>

                    </View>
                </Pressable>
            </Modal>

            <ProfileModal
                visible={accountModalVisible}
                onClose={() => setAccountModalVisible(false)}
                onAvatarChange={(newAvatarUrl: string) => {
                    // ⚡️ update immediately
                    setAvatarUrl(newAvatarUrl);

                    // ⚡️ reload Clerk user so useUser() returns the updated avatar
                    user.reload().catch(console.error);
                }}
            />
        </>
    );
}
