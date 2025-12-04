import ExcelJS from "exceljs";
import supabaseClient from "@/clients/supabase";
import { addDays } from "date-fns";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const weekStart = url.searchParams.get("week_start");

        if (!weekStart) {
            return new Response(
                JSON.stringify({ error: "Missing week_start query parameter" }),
                { status: 400 }
            );
        }

        const start = new Date(weekStart);
        const end = addDays(start, 6);
        const weekStartStr = start.toISOString().slice(0, 10);
        const weekEndStr = end.toISOString().slice(0, 10);

        // -------------------------------------------------
        // 1️⃣ Fetch drivers
        // -------------------------------------------------
        const { data: drivers, error: driverErr } = await supabaseClient
            .from("drivers")
            .select("id, name, email");

        if (driverErr) {
            console.error("Driver fetch error:", driverErr);
            return new Response(JSON.stringify({ error: driverErr.message }), { status: 500 });
        }

        // -------------------------------------------------
        // 2️⃣ Fetch deliveries for selected week
        // -------------------------------------------------
        const { data: deliveries, error: delErr } = await supabaseClient
            .from("deliveries")
            .select("driver_id, delivery_date, delivery_count, scanner_numbers")
            .gte("delivery_date", weekStartStr)
            .lte("delivery_date", weekEndStr);

        if (delErr) {
            console.error("Deliveries fetch error:", delErr);
            return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
        }

        // -------------------------------------------------
        // 3️⃣ Aggregate totals
        // -------------------------------------------------
        const totals: Record<string, number> = {};
        const scannerMap: Record<string, string[]> = {};

        deliveries?.forEach((d) => {
            const id = d.driver_id;

            totals[id] = (totals[id] || 0) + (d.delivery_count ?? 0);

            if (!scannerMap[id]) scannerMap[id] = [];
            if (Array.isArray(d.scanner_numbers)) {
                scannerMap[id].push(...d.scanner_numbers);
            }
        });

        // -------------------------------------------------
        // 4️⃣ Build Excel workbook
        // -------------------------------------------------
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Weekly Deliveries");

        sheet.addRow([
            "Driver Name",
            "Email",
            "Total Deliveries",
            "Scanner Numbers Used"
        ]).eachCell((cell) => {
            cell.font = { bold: true };
        });

        drivers?.forEach((driver) => {
            const total = totals[driver.id] ?? 0;
            const scanners = (scannerMap[driver.id] ?? []).join(", ");

            sheet.addRow([
                driver.name,
                driver.email,
                total,
                scanners
            ]);
        });

        // -------------------------------------------------
        // 5️⃣ Convert workbook to ArrayBuffer (Expo-safe)
        // -------------------------------------------------
        const excelData: any = await workbook.xlsx.writeBuffer();

        let arrayBuffer: ArrayBuffer;

        // ExcelJS may return ArrayBuffer, Uint8Array, or ArrayBufferLike
        if (excelData instanceof ArrayBuffer) {
            arrayBuffer = excelData;
        } else if (excelData && typeof excelData.buffer === "object") {
            arrayBuffer = excelData.buffer;
        } else {
            console.error("Unexpected ExcelJS output:", excelData);
            throw new Error("Could not generate spreadsheet binary data.");
        }

        // -------------------------------------------------
        // 6️⃣ Return XLSX file
        // -------------------------------------------------
        return new Response(arrayBuffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                    `attachment; filename="weekly-deliveries-${weekStartStr}-to-${weekEndStr}.xlsx"`,
            },
        });

    } catch (err: any) {
        console.error("Spreadsheet API error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
