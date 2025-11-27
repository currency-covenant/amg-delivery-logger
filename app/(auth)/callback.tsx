import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useClerk } from '@clerk/clerk-expo';

export default function AuthCallback() {
    const router = useRouter();
    const { setActive } = useClerk();
    const { url: urlParam } = useLocalSearchParams<{ url?: string }>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleUrl = async (url: string) => {
            try {
                const decodedUrl = decodeURIComponent(url);

                // 🔍 Log the incoming URL
                console.log('Auth callback URL:', decodedUrl);

                const parsed = Linking.parse(decodedUrl);

                // 🔍 Log parsed query params
                console.log('Parsed callback params:', parsed.queryParams);

                const qp = parsed.queryParams ?? {};

                const sessionId =
                    (qp.createdSessionId as string | undefined) ||
                    (qp.session_id as string | undefined) ||
                    (qp.sessionId as string | undefined) ||
                    (qp.session as string | undefined);

                // 🔍 Log the extracted sessionId
                console.log('Extracted sessionId:', sessionId);

                if (!sessionId) {
                    Alert.alert('Error', 'No session returned from Clerk callback.');
                    setLoading(false);
                    return;
                }

                await setActive({ session: sessionId });

                // 🔍 Confirm setActive ran
                console.log('Session setActive successful');

                router.replace('/');
            } catch (err: any) {
                console.error('Error activating Clerk session:', err);
                Alert.alert('Authentication error', err.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        if (urlParam) {
            // 🔍 Log that we got a url param
            console.log('Callback urlParam:', urlParam);
            handleUrl(urlParam as string);
        } else {
            // 🔍 Log when no url param is passed
            console.log('No url param passed to callback');
            setLoading(false);
        }
    }, [router, setActive, urlParam]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {loading && <ActivityIndicator size="large" />}
        </View>
    );
}