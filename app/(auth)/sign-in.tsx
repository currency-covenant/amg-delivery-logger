// app/(auth)/sign-up.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Link, useRouter } from 'expo-router';
import { useSSO, useSignUp } from '@clerk/clerk-expo';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const useWarmUpBrowser = () => {
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        void WebBrowser.warmUpAsync();
        return () => {
            void WebBrowser.coolDownAsync();
        };
    }, []);
};

export default function SignUpPage() {
    useWarmUpBrowser();

    const colorScheme = useColorScheme() ?? 'dark';
    const theme = Colors[colorScheme];
    const router = useRouter();
    const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(
        null
    );

    const { signUp, isLoaded, setActive } = useSignUp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'credentials' | 'verify'>('credentials');
    const [emailFlowLoading, setEmailFlowLoading] = useState(false);

    const { startSSOFlow } = useSSO();

    const handleOAuth = useCallback(
        async (provider: 'google' | 'apple') => {
            setLoadingProvider(provider);
            try {
                const strategy = provider === 'google' ? 'oauth_google' : 'oauth_apple';

                const redirectUrl = AuthSession.makeRedirectUri({
                    scheme: 'deliverylogger',
                });

                const {
                    createdSessionId,
                    setActive: setActiveFromSSO,
                    signIn: signInResult,
                    signUp: signUpResult,
                } = await startSSOFlow({
                    strategy,
                    redirectUrl,
                });

                if (createdSessionId && setActiveFromSSO) {
                    await setActiveFromSSO({ session: createdSessionId });
                    router.replace('/(tabs)');
                    return;
                }

                console.log('SSO sign-up requires additional steps:', {
                    signInResult,
                    signUpResult,
                });

                Alert.alert(
                    'Sign-up incomplete',
                    'We could not complete the sign-up inside the app. Check your Clerk config (OAuth + redirect URLs) or logs for extra steps (MFA, required fields, legal acceptance, etc.).'
                );
            } catch (err: any) {
                console.error(`${provider} sign-up error:`, err);
                Alert.alert('Sign-up error', err.message || 'Unknown error');
            } finally {
                setLoadingProvider(null);
            }
        },
        [router, startSSOFlow]
    );

    const startEmailSignUp = async () => {
        if (!isLoaded) return;
        if (!email || !password) {
            Alert.alert('Missing information', 'Please enter both email and password.');
            return;
        }

        setEmailFlowLoading(true);
        try {
            await signUp.create({
                emailAddress: email.trim(),
                password,
            });

            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });

            setStep('verify');
            Alert.alert('Check your email', 'We sent you a verification code.');
        } catch (err: any) {
            console.error('Email sign-up error:', err);
            const message =
                err?.errors?.[0]?.message ||
                err?.message ||
                'Unable to start sign-up with these details.';
            Alert.alert('Sign-up error', message);
        } finally {
            setEmailFlowLoading(false);
        }
    };

    const verifyEmailCode = async () => {
        if (!isLoaded) return;
        if (!code) {
            Alert.alert('Missing code', 'Please enter the verification code.');
            return;
        }

        setEmailFlowLoading(true);
        try {
            const result = await signUp.attemptEmailAddressVerification({
                code: code.trim(),
            });

            if (result.status === 'complete') {
                await setActive?.({ session: result.createdSessionId });
                router.replace('/(tabs)');
            } else {
                console.log('Sign-up not complete, result:', result);
                Alert.alert(
                    'Verification',
                    'Additional steps are required to complete sign up (check logs / Clerk dashboard).'
                );
            }
        } catch (err: any) {
            console.error('Code verification error:', err);
            const message =
                err?.errors?.[0]?.message ||
                err?.message ||
                'Invalid or expired code. Please try again.';
            Alert.alert('Verification error', message);
        } finally {
            setEmailFlowLoading(false);
        }
    };

    const googleLoading = loadingProvider === 'google';
    const appleLoading = loadingProvider === 'apple';

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.card, { backgroundColor: '#1C1E1F' }]}>
                <Text style={[styles.title, { color: theme.text }]}>Create account</Text>

                {/* Email / password sign up with email code verification */}
                {step === 'credentials' && (
                    <>
                        <Text style={{ color: theme.text, marginBottom: 4 }}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={theme.icon}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={{ color: theme.text, marginTop: 8, marginBottom: 4 }}>
                            Password
                        </Text>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Create a password"
                            placeholderTextColor={theme.icon}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            onPress={startEmailSignUp}
                            disabled={emailFlowLoading || googleLoading || appleLoading}
                        >
                            <Text
                                style={{
                                    textAlign: 'center',
                                    marginTop: 8,
                                    color: theme.tint,
                                    fontFamily: Fonts.rounded,
                                }}
                            >
                                {emailFlowLoading ? 'Creating account…' : 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'verify' && (
                    <>
                        <Text style={{ color: theme.text, marginBottom: 4 }}>
                            Enter the code sent to {email}
                        </Text>
                        <TextInput
                            value={code}
                            onChangeText={setCode}
                            placeholder="123456"
                            placeholderTextColor={theme.icon}
                            keyboardType="number-pad"
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            onPress={verifyEmailCode}
                            disabled={emailFlowLoading || googleLoading || appleLoading}
                        >
                            <Text
                                style={{
                                    textAlign: 'center',
                                    marginTop: 8,
                                    color: theme.tint,
                                    fontFamily: Fonts.rounded,
                                }}
                            >
                                {emailFlowLoading ? 'Verifying…' : 'Verify email'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={startEmailSignUp} disabled={emailFlowLoading}>
                            <Text
                                style={{
                                    textAlign: 'center',
                                    marginTop: 8,
                                    color: theme.icon,
                                }}
                            >
                                Resend code
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Google button */}
                <TouchableOpacity
                    onPress={() => handleOAuth('google')}
                    style={[styles.button, { backgroundColor: theme.tint, marginBottom: 10 }]}
                    disabled={googleLoading || appleLoading || emailFlowLoading}
                >
                    <Text style={[styles.buttonText, { fontFamily: Fonts.rounded }]}>
                        {googleLoading ? 'Loading…' : 'Continue with Google'}
                    </Text>
                </TouchableOpacity>

                {/* Apple button */}
                <TouchableOpacity
                    onPress={() => handleOAuth('apple')}
                    style={[styles.button, { backgroundColor: '#000000' }]}
                    disabled={googleLoading || appleLoading || emailFlowLoading}
                >
                    <Text
                        style={[
                            styles.buttonText,
                            { fontFamily: Fonts.rounded, color: '#ffffff' },
                        ]}
                    >
                        {appleLoading ? 'Loading…' : 'Continue with Apple'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.icon }]}>
                        Already have an account?
                    </Text>
                    <Link href="/sign-in">
                        <Text style={[styles.footerLink, { color: theme.tint }]}>Sign in</Text>
                    </Link>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    card: {
        padding: 28,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    title: {
        fontSize: 26,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 26,
    },
    button: { paddingVertical: 14, borderRadius: 12, marginTop: 4 },
    buttonText: {
        textAlign: 'center',
        color: '#000',
        fontWeight: '600',
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 18,
        gap: 6,
    },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14, fontWeight: '600' },
});
