// app/(auth)/sign-in.tsx
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
    Modal,
    Pressable,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

// Warm browser for Android
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
        Animated.spring(scale, {
            toValue: 0.94,
            useNativeDriver: true,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return { scale, onPressIn, onPressOut };
};

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
                    Animated.timing(shimmer, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmer, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
        } else {
            shimmer.setValue(0);
        }

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
                    <Ionicons name={icon} size={28} color={color} />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function SignInPage() {
    useWarmUpBrowser();

    const router = useRouter();
    const { startSSOFlow } = useSSO();
    const { signIn, isLoaded, setActive } = useSignIn();

    const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
    const [emailFlowLoading, setEmailFlowLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");

    const googleLoading = loadingProvider === "google";
    const appleLoading = loadingProvider === "apple";

    // Fade only
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
        }).start();
    }, []);

    // OAuth sign-in handler
    const handleOAuth = useCallback(
        async (provider: OAuthProvider) => {
            setLoadingProvider(provider);
            try {
                const strategy =
                    provider === "google" ? "oauth_google" : "oauth_apple";

                const redirectUrl = AuthSession.makeRedirectUri({
                    scheme: "deliverylogger",
                });

                const { createdSessionId, setActive: setActiveFromSSO } =
                    await startSSOFlow({ strategy, redirectUrl });

                if (createdSessionId && setActiveFromSSO) {
                    await setActiveFromSSO({ session: createdSessionId });
                    router.replace("/(tabs)");
                }
            } catch (err: any) {
                Alert.alert("OAuth Error", err.message);
            } finally {
                setLoadingProvider(null);
            }
        },
        [router, startSSOFlow]
    );

    // Email sign-in
    const attemptLogin = async () => {
        if (!isLoaded) return;
        if (!email || !password) {
            setErrorMessage("Email and password required");
            return;
        }

        setEmailFlowLoading(true);
        setErrorMessage("");

        try {
            const result = await signIn.create({
                identifier: email.trim(),
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.replace("/(tabs)");
                return;
            }
        } catch (err: any) {
            const msg =
                err?.errors?.[0]?.message ||
                "Incorrect email or password. Try again.";
            setErrorMessage(msg);
        } finally {
            setEmailFlowLoading(false);
        }
    };

    // -------------------------------
    // Forgot Password Modal Logic
    // -------------------------------
    const [forgotVisible, setForgotVisible] = useState(false);
    const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email");

    const [resetEmail, setResetEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [resetPassword, setResetPassword] = useState("");

    const [resetError, setResetError] = useState("");

    const sendResetEmail = async () => {
        setResetError("");

        if (!signIn) {
            setResetError("Unable to start reset flow.");
            return;
        }

        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: resetEmail.trim(),
            });

            setResetStep("code");
        } catch (err: any) {
            setResetError(err?.errors?.[0]?.message || "Email not found.");
        }
    };


    const verifyResetCode = async () => {
        setResetError("");

        if (!signIn) {
            setResetError("Unable to verify code.");
            return;
        }

        try {
            await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code: resetCode,
            });

            setResetStep("password");
        } catch (err: any) {
            setResetError("Invalid or expired code.");
        }
    };


    const submitNewPassword = async () => {
        setResetError("");

        if (!signIn) {
            setResetError("Unable to submit new password.");
            return;
        }

        try {
            const result = await signIn.resetPassword({
                password: resetPassword,
            });

            if (result?.status === "complete") {
                await setActive?.({ session: result.createdSessionId });
                setForgotVisible(false);
                router.replace("/(tabs)");
                return;
            }

            setResetError("Unable to complete password reset.");
        } catch (err: any) {
            setResetError(err?.errors?.[0]?.message || "Invalid password.");
        }
    };


    return (
        <>
            {/* MAIN SIGN-IN SCREEN */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 justify-center bg-black"
                keyboardVerticalOffset={Platform.OS === "ios" ? 40 : -80}
            >
                <View className="px-6 flex-1 justify-center">
                    <Animated.View
                        style={{ opacity: fadeAnim }}
                        className="bg-neutral-900 p-6 rounded-2xl shadow-md border border-neutral-800"
                    >
                        <Text className="text-white text-3xl font-bold text-center mb-6">
                            Sign In
                        </Text>

                        {/* OAuth Buttons */}
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
                                or continue with email
                            </Text>
                            <View className="flex-1 h-[1px] bg-neutral-700" />
                        </View>

                        {/* Email */}
                        <Text className="text-neutral-400 mb-1">Email</Text>
                        <TextInput
                            className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-1"
                            placeholder="you@example.com"
                            placeholderTextColor="#777"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />

                        {/* Password */}
                        <Text className="text-neutral-400 mb-1 mt-3">Password</Text>
                        <View className="mb-2">
                            <TextInput
                                className="bg-neutral-800 text-white px-4 py-3 rounded-xl"
                                placeholder="Password"
                                placeholderTextColor="#777"
                                secureTextEntry={!passwordVisible}
                                value={password}
                                onChangeText={setPassword}
                            />
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

                        {/* REAL-TIME ERRORS */}
                        {errorMessage ? (
                            <Text className="text-red-400 text-sm mb-2">{errorMessage}</Text>
                        ) : null}

                        {/* Continue */}
                        <TouchableOpacity
                            onPress={attemptLogin}
                            disabled={emailFlowLoading}
                            className="bg-blue-600 py-3 rounded-xl mt-2"
                        >
                            <Text className="text-white text-center font-semibold">
                                {emailFlowLoading ? "Signing in…" : "Continue"}
                            </Text>
                        </TouchableOpacity>

                        {/* Forgot Password */}
                        <TouchableOpacity onPress={() => setForgotVisible(true)} className="mt-3">
                            <Text className="text-neutral-400 text-center">Forgot Password?</Text>
                        </TouchableOpacity>

                        {/* Footer */}
                        <View className="flex-row justify-center mt-8">
                            <Text className="text-neutral-500">Don&apos;t have an account?</Text>
                            <TouchableOpacity onPress={() => router.replace("/sign-up")}>
                                <Text className="text-blue-500 font-semibold ml-1">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>

            {/* ------------------------------ */}
            {/* FORGOT PASSWORD MODAL */}
            {/* ------------------------------ */}
            <Modal
                visible={forgotVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setForgotVisible(false)}
            >
                <Pressable
                    className="flex-1 bg-black/60 justify-center items-center px-6"
                    onPress={() => setForgotVisible(false)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className="bg-neutral-900 p-6 rounded-2xl w-full border border-neutral-700"
                    >
                        <Text className="text-white text-xl font-bold text-center mb-6">
                            Reset Password
                        </Text>

                        {/* Step 1 — Enter Email */}
                        {resetStep === "email" && (
                            <>
                                <Text className="text-neutral-400 mb-1">Email</Text>
                                <TextInput
                                    className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-2"
                                    placeholder="you@example.com"
                                    placeholderTextColor="#777"
                                    value={resetEmail}
                                    onChangeText={setResetEmail}
                                    autoCapitalize="none"
                                />

                                {resetError ? (
                                    <Text className="text-red-400 mb-2">{resetError}</Text>
                                ) : null}

                                <TouchableOpacity
                                    onPress={sendResetEmail}
                                    className="bg-blue-600 py-3 rounded-xl mt-2"
                                >
                                    <Text className="text-white text-center font-semibold">
                                        Send reset code
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Step 2 — Verify Code */}
                        {resetStep === "code" && (
                            <>
                                <Text className="text-neutral-400 mb-1">Verification Code</Text>
                                <TextInput
                                    className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-2"
                                    placeholder="123456"
                                    placeholderTextColor="#777"
                                    value={resetCode}
                                    onChangeText={setResetCode}
                                    keyboardType="numeric"
                                />

                                {resetError ? (
                                    <Text className="text-red-400 mb-2">{resetError}</Text>
                                ) : null}

                                <TouchableOpacity
                                    onPress={verifyResetCode}
                                    className="bg-blue-600 py-3 rounded-xl mt-2"
                                >
                                    <Text className="text-white text-center font-semibold">
                                        Verify Code
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Step 3 — Enter New Password */}
                        {resetStep === "password" && (
                            <>
                                <Text className="text-neutral-400 mb-1">New Password</Text>
                                <TextInput
                                    className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-2"
                                    placeholder="New password"
                                    placeholderTextColor="#777"
                                    value={resetPassword}
                                    secureTextEntry
                                    onChangeText={setResetPassword}
                                />

                                {resetError ? (
                                    <Text className="text-red-400 mb-2">{resetError}</Text>
                                ) : null}

                                <TouchableOpacity
                                    onPress={submitNewPassword}
                                    className="bg-blue-600 py-3 rounded-xl mt-2"
                                >
                                    <Text className="text-white text-center font-semibold">
                                        Update Password
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
