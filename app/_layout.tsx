import "../styles/global.css"
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache as clerkTokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Toast from 'react-native-toast-message';
import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query'

export default function RootLayout() {
    const queryClient = new QueryClient()
    const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const colorScheme = useColorScheme();

    if (!clerkKey) {
        throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    }

    return (
            <ClerkProvider publishableKey={clerkKey} tokenCache={clerkTokenCache}>
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen
                                name="modal"
                                options={{ presentation: 'modal', title: 'Modal' }}
                            />
                        </Stack>
                        <Toast/>
                        <StatusBar style="auto" />
                    </ThemeProvider>
                </QueryClientProvider>
            </ClerkProvider>
    );
}