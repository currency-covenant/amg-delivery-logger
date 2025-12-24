import { Navbar } from "@/components/global/navbar";
import { useUser } from "@clerk/clerk-expo";
import { DriverProfileSection } from "@/components/home/driver/DriverProfileSection";
import { WeeklyDeliveriesSection } from "@/components/home/driver/WeeklyDeliveriesSection";
import { AdminControls } from "@/components/home/admin/AdminControls";
import useSetDriverRole from "@/app/api/clerk/setDriverRole/useSetDriverRole";
import { useEffect, useState } from "react";
import {DriverWeeklyNumbersSection} from "@/components/home/driver/DriverWeeklyNumbersSection";

export default function HomeScreen() {
    const { user, isLoaded } = useUser();
    const [role, setRole] = useState<string | undefined>();
    const [checked, setChecked] = useState(false);

    const setDriverRole = useSetDriverRole();

    useEffect(() => {
        if (!isLoaded || !user || checked) return;

        const roleFromMetadata = (user.publicMetadata as any)?.role;
        if (roleFromMetadata) {
            setRole(roleFromMetadata);
            setChecked(true);
            return;
        }

        setDriverRole.mutate(user.id, {
            onSuccess: (d) => {
                setRole(d.role);
                setChecked(true);
            },
            onError: () => setChecked(true),
        });
    }, [user?.id, isLoaded, checked]);

    if (!isLoaded || !user || !checked) return null;

    if (role === "admin") {
        return (
            <>
                <Navbar />
                <AdminControls />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <DriverProfileSection />
            <DriverWeeklyNumbersSection />
            <WeeklyDeliveriesSection />
        </>
    );
}
