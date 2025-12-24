import { useUser } from "@clerk/clerk-expo";
import { WeeklyDeliveries } from "./WeeklyDeliveries";
import { useWeeklyTotal } from "@/app/api/supabase/deliveries/weeklyTotal/useWeeklyTotal";
import { useDriverProfile } from "@/app/api/supabase/drivers/useDriverProfile";

export function WeeklyDeliveriesSection() {
    const { user } = useUser();

    const { data: driverProfile } = useDriverProfile(user?.id);
    const { data, isLoading } = useWeeklyTotal(
        driverProfile ? user?.id : undefined
    );

    if (!driverProfile) return null;

    return (
        <WeeklyDeliveries
            firstName={user?.firstName ?? ""}
            totalDelivered={data?.totalDelivered ?? 0}
            loading={isLoading}
        />
    );
}
