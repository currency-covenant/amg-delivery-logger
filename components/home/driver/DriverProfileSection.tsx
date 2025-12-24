import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";

import { ProfileForm } from "./ProfileForm";
import { useDriverProfile } from "@/app/api/supabase/drivers/useDriverProfile";
import useSyncDriver from "@/app/api/supabase/sync/syncDrivers/useSyncDrivers";
import { useAreas } from "@/app/api/supabase/areas/useAreas";

export function DriverProfileSection() {
    const { user, isLoaded } = useUser();

    const { data: driverProfile, isLoading } = useDriverProfile(user?.id);
    const { data: areas = [] } = useAreas();
    const syncDriver = useSyncDriver();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [areaId, setAreaId] = useState("");

    const [saving, setSaving] = useState(false);

    // Populate from Clerk
    useEffect(() => {
        if (!user) return;

        setFirstName(user.firstName ?? "");
        setLastName(user.lastName ?? "");
    }, [user?.id]);

    // Hide section entirely if profile exists
    if (!isLoaded || isLoading) return null;
    if (driverProfile) return null;

    const onSave = () => {
        if (!user || !firstName || !lastName || !areaId) return;

        setSaving(true);

        syncDriver.mutate(
            {
                clerk_auth_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                first_name: firstName,
                last_name: lastName,
                area_id: areaId,
            },
            {
                onSuccess: () => {
                    setSaving(false);
                },
                onError: (err) => {
                    alert(err.message);
                    setSaving(false);
                },
            }
        );
    };

    return (
        <ProfileForm
            firstName={firstName}
            lastName={lastName}
            areaId={areaId}
            setFirstName={setFirstName}
            setLastName={setLastName}
            setAreaId={setAreaId}
            areas={areas}
            saving={saving}
            onSave={onSave}
        />
    );
}
