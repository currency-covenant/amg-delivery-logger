// app/(auth)/sign-up.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    TextInput,
    Platform,
    Animated,
    KeyboardAvoidingView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSSO, useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

// Same warm browser hook
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

const useWarmUpBrowser = () => {
    useEffect(() => {
        if (Platform.OS !== "android") return;
        void WebBrowser.warmUpAsync();
        return () => void WebBrowser.coolDownAsync();
    }, []);
};

// Press animation hook
const usePressAnimation = () => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => {
        Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };
    return { scale, onPressIn, onPressOut };
};

// OAuth icon button (same from sign-in)
type OAuthProvider = "google" | "apple";

interface OAuthIconButtonProps {
    provider: OAuthProvider;
    icon: keyof typeof Ionicons.glyphMap;
    bg: string;
    color: string;
    loadingProvider: OAuthProvider | null;
    googleLoading: boolean;
    appleLoading: boolean;
    onPressProvider: (provider: OAuthProvider) => void;
}

const OAuthIconButton: React.FC<OAuthIconButtonProps> = ({
                                                             provider,
                                                             icon,
                                                             bg,
                                                             color,
                                                             loadingProvider,
                                                             googleLoading,
                                                             appleLoading,
                                                             onPressProvider,
                                                         }) => {
    const isLoading =
        loadingProvider === provider ||
        (provider === "google" ? googleLoading : appleLoading);

    const shimmer = useRef(new Animated.Value(0)).current;
    const { scale, onPressIn, onPressOut } = usePressAnimation();

    useEffect(() => {
        let animation: Animated.CompositeAnimation | undefined;
        if (isLoading) {
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                    Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
                ])
            );
            animation.start();
        } else shimmer.setValue(0);

        return () => animation?.stop();
    }, [isLoading]);

    const animatedOpacity = isLoading
        ? shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })
        : 1;

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={() => onPressProvider(provider)}
                disabled={isLoading}
                className="w-20 h-12 rounded-xl items-center justify-center border border-neutral-700"
                style={{ backgroundColor: bg }}
            >
                <Animated.View style={{ opacity: animatedOpacity }}>
                    <Ionicons name={icon} size={26} color={color} />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function SignUpScreen() {
    useWarmUpBrowser();

    const router = useRouter();
    const { startSSOFlow } = useSSO();
    const { signUp, isLoaded, setActive } = useSignUp();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [code, setCode] = useState("");
    const [step, setStep] = useState<"credentials" | "verify">("credentials");
    const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
    const [emailFlowLoading, setEmailFlowLoading] = useState(false);

    const googleLoading = loadingProvider === "google";
    const appleLoading = loadingProvider === "apple";

    // Fade animation like sign-in
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
        }).start();
    }, []);

    // OAuth logic unchanged
    const handleOAuth = async (provider: OAuthProvider) => {
        setLoadingProvider(provider);
        try {
            const strategy = provider === "google" ? "oauth_google" : "oauth_apple";
            const { createdSessionId, setActive: setActiveFromSSO } =
                await startSSOFlow({ strategy });

            if (createdSessionId && setActiveFromSSO) {
                await setActiveFromSSO({ session: createdSessionId });
                router.replace("/(tabs)");
                return;
            }

            Alert.alert("Sign-up incomplete", "Continue in browser.");
        } catch (err: any) {
            Alert.alert("OAuth error", err.message || "Unknown OAuth error");
        } finally {
            setLoadingProvider(null);
        }
    };

    // Email sign-up logic unchanged
    const startEmailSignUp = async () => {
        if (!isLoaded) return;
        if (!email || !password)
            return Alert.alert("Missing info", "Enter email and password.");

        setEmailFlowLoading(true);
        try {
            await signUp.create({ emailAddress: email.trim(), password });
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setStep("verify");
            Alert.alert("Check email", "Verification code sent.");
        } catch (err: any) {
            Alert.alert("Sign-up error", err.errors?.[0]?.message ?? err.message);
        } finally {
            setEmailFlowLoading(false);
        }
    };

    // Verify email logic unchanged
    const verifyEmailCode = async () => {
        if (!isLoaded) return;
        if (!code) return Alert.alert("Missing code", "Enter verification code.");

        setEmailFlowLoading(true);
        try {
            const result = await signUp.attemptEmailAddressVerification({
                code: code.trim(),
            });

            if (result.status === "complete") {
                await setActive?.({ session: result.createdSessionId });
                router.replace("/(tabs)");
                return;
            }

            Alert.alert("More steps required", "Check Clerk dashboard.");
        } catch (err: any) {
            Alert.alert("Verification error", err.errors?.[0]?.message ?? err.message);
        } finally {
            setEmailFlowLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : -80}
            className="flex-1 justify-center bg-black"
        >
            <View className="px-6 flex-1 justify-center">
                <Animated.View
                    className="bg-neutral-900 p-6 rounded-2xl shadow-md border border-neutral-800"
                    style={{ opacity: fadeAnim }}
                >
                    <Text className="text-white text-3xl font-bold text-center mb-6">
                        Create Account
                    </Text>

                    {/* OAuth buttons */}
                    <View className="flex-row justify-center mb-6 gap-4">
                        <OAuthIconButton
                            provider="google"
                            icon="logo-google"
                            bg="white"
                            color="#000"
                            loadingProvider={loadingProvider}
                            googleLoading={googleLoading}
                            appleLoading={appleLoading}
                            onPressProvider={handleOAuth}
                        />

                        <OAuthIconButton
                            provider="apple"
                            icon="logo-apple"
                            bg="black"
                            color="#fff"
                            loadingProvider={loadingProvider}
                            googleLoading={googleLoading}
                            appleLoading={appleLoading}
                            onPressProvider={handleOAuth}
                        />
                    </View>

                    {/* Divider */}
                    <View className="flex-row items-center mb-6">
                        <View className="flex-1 h-[1px] bg-neutral-700" />
                        <Text className="px-4 text-neutral-500 text-sm">
                            or sign up with email
                        </Text>
                        <View className="flex-1 h-[1px] bg-neutral-700" />
                    </View>

                    {/* EMAIL & PASSWORD INPUTS */}
                    {step === "credentials" && (
                        <>
                            {/* Email */}
                            <Text className="text-neutral-400 mb-1">Email</Text>
                            <TextInput
                                className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-4"
                                placeholder="you@example.com"
                                placeholderTextColor="#777"
                                onChangeText={setEmail}
                                value={email}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />

                            {/* Password */}
                            <Text className="text-neutral-400 mb-1">Password</Text>
                            <View className="mb-4">
                                <TextInput
                                    className="bg-neutral-800 text-white px-4 py-3 rounded-xl"
                                    placeholder="Create a password"
                                    placeholderTextColor="#777"
                                    secureTextEntry={!passwordVisible}
                                    onChangeText={setPassword}
                                    value={password}
                                />

                                {/* Visibility toggle */}
                                <TouchableOpacity
                                    className="absolute right-4 top-3"
                                    onPress={() => setPasswordVisible(!passwordVisible)}
                                >
                                    <Ionicons
                                        name={passwordVisible ? "eye-off" : "eye"}
                                        size={22}
                                        color="#aaa"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Continue */}
                            <TouchableOpacity
                                onPress={startEmailSignUp}
                                disabled={emailFlowLoading}
                                className="bg-blue-600 py-3 rounded-xl"
                            >
                                <Text className="text-white text-center font-semibold">
                                    {emailFlowLoading ? "Creating…" : "Continue"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* VERIFY CODE */}
                    {step === "verify" && (
                        <>
                            <Text className="text-neutral-400 mb-2">
                                Enter the code sent to {email}
                            </Text>

                            <TextInput
                                className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-4"
                                placeholder="123456"
                                placeholderTextColor="#777"
                                value={code}
                                onChangeText={setCode}
                                keyboardType="numeric"
                            />

                            <TouchableOpacity
                                onPress={verifyEmailCode}
                                disabled={emailFlowLoading}
                                className="bg-blue-600 py-3 rounded-xl"
                            >
                                <Text className="text-white text-center font-semibold">
                                    {emailFlowLoading ? "Verifying…" : "Verify Email"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={startEmailSignUp} className="mt-3">
                                <Text className="text-neutral-400 text-center">Resend code</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Footer */}
                    <View className="flex-row justify-center mt-8">
                        <Text className="text-neutral-500">Already have an account?</Text>
                        <TouchableOpacity onPress={() => router.replace("/sign-in")}>
                            <Text className="text-blue-500 font-semibold ml-1">Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
}
