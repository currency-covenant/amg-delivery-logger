import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import supabaseClient from "@/clients/supabase";
import * as XLSX from "xlsx";
import JSZip from "jszip";

/* ---------------------------------------
   Helpers
--------------------------------------- */

// Last fully completed Monday → Sunday
function getLastCompletedWeek() {
    const today = new Date();

    if (today.getDay() === 1) {
        return startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    }

    return startOfWeek(today, { weekStartsOn: 1 });
}

function toExcel(rows: Record<string, any>[], sheetName: string) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    return XLSX.write(workbook, {
        type: "array",
        bookType: "xlsx",
    });
}

/* ---------------------------------------
   API Route
--------------------------------------- */
export async function GET() {
    try {
        const weekStart = getLastCompletedWeek();
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

        const weekStartISO = weekStart.toISOString().slice(0, 10);
        const weekEndISO = weekEnd.toISOString().slice(0, 10);

        /* ---------------------------------------
           Query from deliveries (correct root)
        --------------------------------------- */
        const { data, error } = await supabaseClient
            .from("deliveries")
            .select(`
        delivery_date,
        drivers (
          full_name,
          email
        ),
        delivery_groups (
          group_code,
          delivery_group_scans (
            delivered_count,
            scanners ( scanner_code )
          )
        )
      `)
            .gte("delivery_date", weekStartISO)
            .lte("delivery_date", weekEndISO);

        if (error) {
            console.error(error);
            return new Response(error.message, { status: 500 });
        }

        if (!data || data.length === 0) {
            return new Response("No deliveries for this week", { status: 200 });
        }

        /* ---------------------------------------
           Build datasets
        --------------------------------------- */
        const weekly = new Map<string, any>();
        const daily = new Map<string, any>();
        const raw: any[] = [];

        for (const delivery of data as any[]) {
            const driver = delivery.drivers;
            if (!driver?.email) continue;

            let deliveryTotal = 0;

            for (const group of delivery.delivery_groups ?? []) {
                for (const scan of group.delivery_group_scans ?? []) {
                    deliveryTotal += scan.delivered_count;

                    raw.push({
                        driver_name: driver.full_name,
                        email: driver.email,
                        delivery_date: delivery.delivery_date,
                        group_code: group.group_code,
                        scanner_code: scan.scanners?.scanner_code ?? "",
                        delivered_count: scan.delivered_count,
                    });
                }
            }

            // Weekly summary
            if (!weekly.has(driver.email)) {
                weekly.set(driver.email, {
                    driver_name: driver.full_name,
                    email: driver.email,
                    week_start: weekStartISO,
                    week_end: weekEndISO,
                    total_deliveries: 0,
                });
            }
            weekly.get(driver.email).total_deliveries += deliveryTotal;

            // Daily audit
            const dailyKey = `${driver.email}|${delivery.delivery_date}`;
            if (!daily.has(dailyKey)) {
                daily.set(dailyKey, {
                    driver_name: driver.full_name,
                    email: driver.email,
                    delivery_date: delivery.delivery_date,
                    daily_total: 0,
                });
            }
            daily.get(dailyKey).daily_total += deliveryTotal;
        }

        /* ---------------------------------------
           Create ZIP
        --------------------------------------- */
        const zip = new JSZip();

        zip.file(
            "weekly_payroll_summary.xlsx",
            toExcel(Array.from(weekly.values()), "Weekly Payroll")
        );

        zip.file(
            "daily_audit.xlsx",
            toExcel(Array.from(daily.values()), "Daily Audit")
        );

        zip.file(
            "raw_scan_audit.xlsx",
            toExcel(raw, "Raw Scan Audit")
        );

        const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

        return new Response(zipBuffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition":
                    `attachment; filename="weekly_reports_${weekStartISO}.zip"`,
            },
        });
    } catch (err: any) {
        console.error(err);
        return new Response(err?.message ?? "Unexpected error", { status: 500 });
    }
}
