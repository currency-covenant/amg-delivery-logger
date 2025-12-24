import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import supabaseClient from "@/clients/supabase";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

/* ---------------------------------------
   Week helpers (Sunday → Saturday)
--------------------------------------- */

function getLastCompletedWeek(): Date {
    const today = new Date();
    return today.getDay() === 0
        ? startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 })
        : startOfWeek(today, { weekStartsOn: 0 });
}

function getWeekStartSafe(input?: string | null): Date {
    if (!input) return getLastCompletedWeek();
    const d = new Date(input);
    return Number.isNaN(d.getTime())
        ? getLastCompletedWeek()
        : startOfWeek(d, { weekStartsOn: 0 });
}

/* ---------------------------------------
   Excel helpers
--------------------------------------- */

function findAreaHeaderRow(
    sheet: XLSX.WorkSheet,
    areaName: string
): number | null {
    const ref = sheet["!ref"];
    if (!ref) return null;

    const range = XLSX.utils.decode_range(ref);

    for (let r = range.s.r; r <= range.e.r; r++) {
        const cell = sheet[`A${r + 1}`] ?? sheet[`B${r + 1}`];
        if (
            cell?.t === "s" &&
            String(cell.v).trim().toLowerCase() === areaName.toLowerCase()
        ) {
            return r + 2; // insert BELOW header row
        }
    }

    return null;
}

/* ---------------------------------------
   Relation helper (Supabase returns array for joins)
--------------------------------------- */

function firstRel<T>(val: T[] | null | undefined): T | undefined {
    if (!val || val.length === 0) return undefined;
    return val[0];
}

/* ---------------------------------------
   Types (match Supabase shapes)
--------------------------------------- */

type AreaRow = { id: string; name: string };

type DriverRow = {
    id: string;
    full_name: string;
    manager: boolean | null;
    seasonal: boolean | null;
    // Supabase join often returns arrays even for FK joins
    areas: AreaRow[] | null;
};

type AssignmentRow = {
    id: string;
    driver_id: string;
    driver_numbers: { driver_number: string }[] | null;
};

type DeliveryEntryRow = {
    driver_assignment_id: string;
    delivery_date: string; // YYYY-MM-DD
    deliveries: number;
};

type PayrollRow = {
    name: string;
    driverNumber: string;
    role: "Manager" | "Regular" | "Seasonal";
    days: number[]; // Sun → Sat (0..6)
    total: number;
};

/* ---------------------------------------
   API Route
--------------------------------------- */

export async function GET(req: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(req.url);
        const weekStartParam = searchParams.get("weekStart");

        const weekStart = getWeekStartSafe(weekStartParam);
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

        const weekStartISO = weekStart.toISOString().slice(0, 10);
        const weekEndISO = weekEnd.toISOString().slice(0, 10);

        /* ---------------------------------------
           Load template
        --------------------------------------- */

        const workbook = XLSX.read(
            fs.readFileSync(path.join(process.cwd(), "Payroll-Template.xlsx")),
            { type: "buffer", cellStyles: true }
        );
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        /* ---------------------------------------
           1) Fetch drivers (base table, always present)
        --------------------------------------- */

        const { data: driversRaw, error: driversError } =
            await supabaseClient
                .from("drivers")
                .select(
                    `
                    id,
                    full_name,
                    manager,
                    seasonal,
                    areas:area_id ( id, name )
                `
                );

        if (driversError) {
            return new Response(
                JSON.stringify({ error: driversError.message }),
                { status: 500 }
            );
        }

        const drivers: DriverRow[] = (driversRaw ?? []).map((d) => ({
            id: String((d as any).id),
            full_name: String((d as any).full_name),
            manager: (d as any).manager ?? null,
            seasonal: (d as any).seasonal ?? null,
            areas: Array.isArray((d as any).areas) ? (d as any).areas : null,
        }));

        if (drivers.length === 0) {
            return new Response("No drivers found", { status: 200 });
        }

        /* ---------------------------------------
           2) Fetch assignments overlapping the selected week
        --------------------------------------- */

        const { data: assignmentsRaw, error: assignError } =
            await supabaseClient
                .from("driver_number_assignments")
                .select(
                    `
                    id,
                    driver_id,
                    driver_numbers ( driver_number )
                `
                )
                .lte("week_start", weekEndISO)
                .or(`week_end.is.null,week_end.gte.${weekStartISO}`);

        if (assignError) {
            return new Response(
                JSON.stringify({ error: assignError.message }),
                { status: 500 }
            );
        }

        const assignments: AssignmentRow[] = (assignmentsRaw ?? []).map((a) => ({
            id: String((a as any).id),
            driver_id: String((a as any).driver_id),
            driver_numbers: Array.isArray((a as any).driver_numbers)
                ? (a as any).driver_numbers
                : null,
        }));

        const assignmentIds = assignments.map((a) => a.id);

        /* ---------------------------------------
           3) Fetch delivery entries for those assignments (within the week)
        --------------------------------------- */

        const entriesByAssignment: Record<string, DeliveryEntryRow[]> = {};

        if (assignmentIds.length > 0) {
            const { data: entriesRaw, error: entriesError } =
                await supabaseClient
                    .from("delivery_entries")
                    .select("driver_assignment_id, delivery_date, deliveries")
                    .in("driver_assignment_id", assignmentIds)
                    .gte("delivery_date", weekStartISO)
                    .lte("delivery_date", weekEndISO);

            if (entriesError) {
                return new Response(
                    JSON.stringify({ error: entriesError.message }),
                    { status: 500 }
                );
            }

            const entries: DeliveryEntryRow[] = (entriesRaw ?? []).map((e) => ({
                driver_assignment_id: String((e as any).driver_assignment_id),
                delivery_date: String((e as any).delivery_date),
                deliveries: Number((e as any).deliveries ?? 0),
            }));

            for (const e of entries) {
                (entriesByAssignment[e.driver_assignment_id] ??= []).push(e);
            }
        }

        /* ---------------------------------------
           4) Build payroll rows grouped by area
        --------------------------------------- */

        const byArea: Record<string, PayrollRow[]> = {};

        for (const driver of drivers) {
            const area = firstRel(driver.areas ?? null);
            if (!area?.name) continue;

            const role: PayrollRow["role"] = driver.manager
                ? "Manager"
                : driver.seasonal
                    ? "Seasonal"
                    : "Regular";

            const driverAssignments = assignments.filter(
                (a) => a.driver_id === driver.id
            );

            // Include drivers even if no assignments
            if (driverAssignments.length === 0) {
                byArea[area.name] ??= [];
                byArea[area.name].push({
                    name: driver.full_name,
                    driverNumber: "—",
                    role,
                    days: [0, 0, 0, 0, 0, 0, 0],
                    total: 0,
                });
                continue;
            }

            // One row per driver number assignment
            for (const a of driverAssignments) {
                const dn = firstRel(a.driver_numbers ?? null);
                const driverNumber = dn?.driver_number ?? "—";

                const days = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
                let total = 0;

                for (const e of entriesByAssignment[a.id] ?? []) {
                    // 0=Sun..6=Sat
                    const dayIdx = new Date(`${e.delivery_date}T00:00:00`).getDay();
                    days[dayIdx] += e.deliveries;
                    total += e.deliveries;
                }

                byArea[area.name] ??= [];
                byArea[area.name].push({
                    name: driver.full_name,
                    driverNumber,
                    role,
                    days,
                    total,
                });
            }
        }

        /* ---------------------------------------
           5) Write into template under area headers
        --------------------------------------- */

        for (const [areaName, rows] of Object.entries(byArea)) {
            const startRow = findAreaHeaderRow(sheet, areaName);
            if (!startRow) continue;

            let row = startRow;
            let index = 1;

            for (const r of rows) {
                sheet[`A${row}`] = { t: "n", v: index++ };
                sheet[`B${row}`] = { t: "s", v: r.name };
                sheet[`C${row}`] = { t: "s", v: r.driverNumber };

                // D..J = Sun..Sat
                r.days.forEach((v, i) => {
                    sheet[String.fromCharCode(68 + i) + row] = { t: "n", v };
                });

                sheet[`K${row}`] = { t: "n", v: r.total };
                row++;
            }
        }

        /* ---------------------------------------
           Export
        --------------------------------------- */

        const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

        return new Response(buffer, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                    `attachment; filename="weekly_payroll_${weekStartISO}.xlsx"`,
            },
        });
    } catch (err: unknown) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : "Unexpected error",
            }),
            { status: 500 }
        );
    }
}
