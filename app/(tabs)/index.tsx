import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/global/navbar";
import { useUser } from "@clerk/clerk-expo";

import { useWeeklyTotal } from "@/app/api/supabase/deliveries/weeklyTotal/useWeeklyTotal";
import useSyncDriver from "@/app/api/supabase/sync/syncDrivers/useSyncDrivers";
import useSetDriverRole from "@/app/api/clerk/setDriverRole/useSetDriverRole";

import { ProfileForm } from "@/components/home/ProfileForm";
import { WeeklyDeliveries } from "@/components/home/WeeklyDeliveries";
import { AdminControls } from "@/components/home/admin/AdminControls";

export default function HomeScreen() {
    const { user, isLoaded } = useUser();

    // ----- LOCAL STATE -----
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [savingName, setSavingName] = useState(false);

    const [isSynced, setIsSynced] = useState<boolean | null>(null);

    // Role handling
    const [hasCheckedRole, setHasCheckedRole] = useState(false);
    const [roleState, setRoleState] = useState<string | undefined>(undefined);

    // ----- INITIAL USER LOAD -----
    useEffect(() => {
        if (!isLoaded || !user) return;

        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");

        const existingRole = (user.publicMetadata as any)?.role;
        setRoleState(existingRole);
    }, [isLoaded, user?.id]);

    // ----- MUTATIONS -----
    const setDriverRoleMutation = useSetDriverRole();
    const syncDriverMutation = useSyncDriver();

    // ----- ROLE ASSIGNMENT -----
    useEffect(() => {
        if (!isLoaded || !user) return;
        if (hasCheckedRole) return;

        if (roleState === "admin") {
            setHasCheckedRole(true);
            return;
        }

        if (!roleState) {
            setDriverRoleMutation.mutate(user.id, {
                onSuccess: (data) => {
                    setRoleState(data.role);
                    setHasCheckedRole(true);
                },
                onError: () => {
                    setHasCheckedRole(true);
                },
            });
            return;
        }

        setHasCheckedRole(true);
    }, [isLoaded, user?.id, roleState, hasCheckedRole]);

    // ----- WEEKLY TOTAL QUERY -----
    const {
        data: weeklyTotal,
        isLoading: loadingWeeklyTotal,
        refetch: refetchWeeklyTotal,
    } = useWeeklyTotal(
        hasCheckedRole && roleState === "driver" ? user?.id : undefined
    );

    // ----- DRIVER SYNC -----
    useEffect(() => {
        if (!isLoaded || !user) return;
        if (!hasCheckedRole) return;
        if (roleState !== "driver") return;
        if (!user.firstName || !user.lastName) return;
        if (isSynced !== null) return;

        syncDriverMutation.mutate(
            {
                clerk_auth_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                first_name: user.firstName,
                last_name: user.lastName,
            },
            {
                onSuccess: () => {
                    setIsSynced(true);
                    refetchWeeklyTotal();
                },
                onError: () => {
                    setIsSynced(true);
                },
            }
        );
    }, [isLoaded, user?.id, hasCheckedRole, roleState, isSynced]);

    // ----- SAVE NAME -----
    const saveName = async () => {
        if (!firstName || !lastName) {
            alert("Please enter both names");
            return;
        }
        try {
            setSavingName(true);
            await user?.update({ firstName, lastName });
            setIsSynced(null);
        } catch (err: any) {
            alert(err?.message || "Unable to save name.");
        } finally {
            setSavingName(false);
        }
    };

    // ----- LOADING STATE -----
    if (!isLoaded || !user || !hasCheckedRole) return null;

    // ----- ADMIN UI -----
    if (roleState === "admin") {
        return (
            <>
                <Navbar />
                <AdminControls />
            </>
        );
    }

    // ----- DRIVER UI -----
    const missingName = !user.firstName || !user.lastName;

    return (
        <>
            <Navbar />

            {missingName ? (
                <ProfileForm
                    firstName={firstName}
                    lastName={lastName}
                    setFirstName={setFirstName}
                    setLastName={setLastName}
                    savingName={savingName}
                    saveName={saveName}
                />
            ) : (
                <WeeklyDeliveries
                    firstName={user.firstName!}
                    totalDelivered={weeklyTotal?.totalDelivered ?? 0}
                    loading={loadingWeeklyTotal}
                />
            )}
        </>
    );
}
