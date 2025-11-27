// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function Index() {
    const { isLoaded, isSignedIn } = useAuth();

    if (!isLoaded) return null; // or a splash/loading

    if (isSignedIn) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/(auth)/sign-in" />;
}