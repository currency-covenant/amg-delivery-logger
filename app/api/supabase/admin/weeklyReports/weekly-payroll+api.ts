import { startOfWeek, endOfWeek } from "date-fns";
import * as XLSX from "xlsx";
import supabaseClient from "@/clients/supabase";

/**
 * IMPORTANT:
 * Metro can ONLY load local binary assets via static import.
 * This is an ArrayBuffer-compatible value at runtime.
 */
import PayrollTemplate from "../../../../../assets/payroll/PayrollTemplate.xlsx";

/* ============================
   WEEK HELPERS (SUNDAY)
============================ */

function getWeekStartSafe(input?: string | null): Date {
  const d = input ? new Date(input) : new Date();
  return startOfWeek(Number.isNaN(d.getTime()) ? new Date() : d, {
    weekStartsOn: 0,
  });
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayIndex(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getDay(); // 0=Sun .. 6=Sat
}

/* ============================
   TEMPLATE BLOCKS
============================ */

type AreaKey = "REDLANDS" | "FLOATER" | "LANCASTER_PALMDALE" | "HESPERIA";

const BLOCKS: Record<AreaKey, { start: number; end: number; donor: number }> = {
  REDLANDS: { start: 6, end: 22, donor: 6 },
  FLOATER: { start: 24, end: 40, donor: 24 },
  LANCASTER_PALMDALE: { start: 48, end: 66, donor: 48 },
  HESPERIA: { start: 68, end: 74, donor: 68 },
};

function bucketForArea(name: string): AreaKey | null {
  const v = name.toLowerCase();
  if (v.includes("redlands")) return "REDLANDS";
  if (v.includes("floater")) return "FLOATER";
  if (v.includes("lancaster") || v.includes("landcaster") || v.includes("palmdale"))
    return "LANCASTER_PALMDALE";
  if (v.includes("hesperia")) return "HESPERIA";
  return null;
}

/* ============================
   TYPES (STRICT)
============================ */

type DriverRow = {
  id: string;
  full_name: string;
  manager: boolean | null;
  seasonal: boolean | null;
  areas: { name: string }[]; // Supabase relationship arrays
};

type AssignmentRow = {
  id: string;
  driver_id: string;
  driver_numbers: { driver_number: string }[];
};

type DeliveryRow = {
  driver_assignment_id: string;
  delivery_date: string;
  deliveries: number;
};

type Role = "driver" | "seasonal" | "manager";

type DriverLine = {
  num: string;
  days: number[];
};

type BucketDriver = {
  name: string;
  role: Role;
  area: string;
  isManager: boolean;
  lines: DriverLine[];
};

/* ============================
   XLSX HELPERS
============================ */

function a1(col: string, row: number): string {
  return `${col}${row}`;
}

function writeCell(
    sheet: XLSX.WorkSheet,
    addr: string,
    value: string | number,
    donor?: XLSX.CellObject
): void {
  const existing = sheet[addr];
  if (existing) {
    existing.v = value;
    return;
  }

  const cell: XLSX.CellObject = {
    t: typeof value === "number" ? "n" : "s",
    v: value,
  };

  if (donor?.s) (cell as any).s = donor.s;
  sheet[addr] = cell;
}

function ensureMerges(sheet: XLSX.WorkSheet): void {
  if (!sheet["!merges"]) sheet["!merges"] = [];
}

function merge(sheet: XLSX.WorkSheet, s: string, e: string): void {
  ensureMerges(sheet);
  sheet["!merges"]!.push({
    s: XLSX.utils.decode_cell(s),
    e: XLSX.utils.decode_cell(e),
  });
}

function roleFor(isManager: boolean, seasonal: boolean): Role {
  if (isManager) return "manager";
  if (seasonal) return "seasonal";
  return "driver";
}

/* ============================
   API ROUTE (EXPO SAFE)
============================ */

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const weekStart = getWeekStartSafe(searchParams.get("weekStart"));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  const startISO = toISO(weekStart);
  const endISO = toISO(weekEnd);

  /* -------- LOAD TEMPLATE (STATIC IMPORT) -------- */

  const workbook = XLSX.read(payrollTemplate as ArrayBuffer, {
    type: "array",
    cellStyles: true,
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return new Response("Invalid payroll template", { status: 500 });
  }

  /* -------- DRIVERS -------- */

  const { data: driversRaw, error: driversError } = await supabaseClient
      .from("drivers")
      .select("id, full_name, manager, seasonal, areas(name)");

  if (driversError) {
    return new Response(driversError.message, { status: 500 });
  }

  const drivers: DriverRow[] = (driversRaw ?? []).map((d) => ({
    id: String(d.id),
    full_name: String(d.full_name),
    manager: d.manager ?? false,
    seasonal: d.seasonal ?? false,
    areas: Array.isArray(d.areas)
        ? d.areas.map((a) => ({ name: String(a.name) }))
        : [],
  }));

  /* -------- ASSIGNMENTS (WEEK-AWARE) -------- */

  const driverIds = drivers.map((d) => d.id);

  const { data: assignmentsRaw, error: assignmentsError } =
      await supabaseClient
          .from("driver_number_assignments")
          .select("id, driver_id, week_start, week_end, driver_numbers(driver_number)")
          .in("driver_id", driverIds)
          .lte("week_start", startISO)
          .or(`week_end.is.null,week_end.gte.${endISO}`);

  if (assignmentsError) {
    return new Response(assignmentsError.message, { status: 500 });
  }

  const assignments: AssignmentRow[] = (assignmentsRaw ?? []).map((a) => ({
    id: String(a.id),
    driver_id: String(a.driver_id),
    driver_numbers: Array.isArray(a.driver_numbers)
        ? a.driver_numbers.map((n) => ({
          driver_number: String(n.driver_number),
        }))
        : [],
  }));

  const assignmentsByDriver: Record<string, AssignmentRow[]> = {};
  for (const a of assignments) {
    (assignmentsByDriver[a.driver_id] ??= []).push(a);
  }

  /* -------- DELIVERIES -------- */

  const deliveryMap: Record<string, number[]> = {};
  const assignmentIds = assignments.map((a) => a.id);

  if (assignmentIds.length > 0) {
    const { data: deliveriesRaw, error: deliveriesError } =
        await supabaseClient
            .from("delivery_entries")
            .select("driver_assignment_id, delivery_date, deliveries")
            .in("driver_assignment_id", assignmentIds)
            .gte("delivery_date", startISO)
            .lte("delivery_date", endISO);

    if (deliveriesError) {
      return new Response(deliveriesError.message, { status: 500 });
    }

    const deliveries: DeliveryRow[] = (deliveriesRaw ?? []) as DeliveryRow[];

    for (const e of deliveries) {
      const idx = dayIndex(e.delivery_date);
      if (!deliveryMap[e.driver_assignment_id]) {
        deliveryMap[e.driver_assignment_id] = [0, 0, 0, 0, 0, 0, 0];
      }
      deliveryMap[e.driver_assignment_id][idx] += e.deliveries;
    }
  }

  /* -------- BUILD BUCKETS -------- */

  const buckets: Record<AreaKey, BucketDriver[]> = {
    REDLANDS: [],
    FLOATER: [],
    LANCASTER_PALMDALE: [],
    HESPERIA: [],
  };

  for (const d of drivers) {
    const areaName = d.areas[0]?.name;
    if (!areaName) continue;

    const key = bucketForArea(areaName);
    if (!key) continue;

    const isManager = Boolean(d.manager);
    const role = roleFor(isManager, Boolean(d.seasonal));

    const driverAssignments = assignmentsByDriver[d.id] ?? [];

    const lines: DriverLine[] =
        driverAssignments.length === 0
            ? [{ num: "—", days: [0, 0, 0, 0, 0, 0, 0] }]
            : driverAssignments.map((a) => ({
              num: a.driver_numbers[0]?.driver_number ?? "—",
              days: deliveryMap[a.id] ?? [0, 0, 0, 0, 0, 0, 0],
            }));

    buckets[key].push({
      name: d.full_name,
      role,
      area: areaName,
      isManager,
      lines,
    });
  }

  for (const key of Object.keys(buckets) as AreaKey[]) {
    buckets[key].sort((a, b) =>
        a.isManager === b.isManager
            ? a.name.localeCompare(b.name)
            : a.isManager
                ? 1
                : -1
    );
  }

  /* -------- WRITE TO SHEET -------- */

  const cols = "ABCDEFGHIJKLM".split("");

  for (const key of Object.keys(BLOCKS) as AreaKey[]) {
    const { start, end, donor } = BLOCKS[key];

    const donors: Record<string, XLSX.CellObject | undefined> = {};
    for (const c of cols) donors[c] = sheet[a1(c, donor)];

    let row = start;
    let index = 1;

    for (const d of buckets[key]) {
      if (row > end) break;

      const startRow = row;

      for (const line of d.lines) {
        if (row > end) break;

        writeCell(sheet, a1("A", row), index, donors["A"]);
        writeCell(sheet, a1("B", row), d.area, donors["B"]);
        writeCell(sheet, a1("C", row), d.role, donors["C"]);
        writeCell(sheet, a1("D", row), d.name, donors["D"]);
        writeCell(sheet, a1("E", row), line.num, donors["E"]);

        line.days.forEach((v, i) => {
          writeCell(sheet, a1(String.fromCharCode(70 + i), row), v, donors["F"]);
        });

        const weeklyTotal = line.days.reduce((a, b) => a + b, 0);
        writeCell(sheet, a1("M", row), weeklyTotal, donors["M"]);

        row++;
      }

      const endRow = row - 1;
      if (endRow > startRow) {
        merge(sheet, a1("A", startRow), a1("A", endRow));
        merge(sheet, a1("D", startRow), a1("D", endRow));
        merge(sheet, a1("B", startRow), a1("B", endRow));
        merge(sheet, a1("C", startRow), a1("C", endRow));
      }

      index++;
    }
  }

  /* -------- RETURN FILE -------- */

  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  return new Response(out, {
    headers: {
      "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="weekly_payroll_${startISO}.xlsx"`,
    },
  });
}
