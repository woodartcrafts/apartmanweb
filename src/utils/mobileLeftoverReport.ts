import { UserRole } from "@prisma/client";
import { prisma } from "../db";
import { buildLeftoverNotes, type LeftoverNote } from "./leftoverNotes";

/**
 * Mobil Kalan Islemler: "Kalan Islemler Notlari" verisini daire daire gruplar.
 * Veri her istekte canli olarak veritabanindan okunur; ekstre yuklenince ya da bir odeme
 * duzeltilince sayfa bir sonraki yenilemede kendiliginden guncellenir. Hicbir sey yazilmaz.
 */
export type MobileLeftoverApartment = {
  doorNo: string;
  name: string;
  eksik: number;
  fazla: number;
  onay: number;
  ileri: number;
  notes: LeftoverNote[];
};

export type MobileLeftoverReport = {
  generatedAt: string;
  lastDataAt: string | null;
  totals: { eksik: number; fazla: number; onay: number; ileri: number };
  apartments: MobileLeftoverApartment[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function compareDoorNo(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
    return na - nb;
  }
  return a.localeCompare(b, "tr", { numeric: true });
}

/** Notlari daire numarasina gore gruplar; saf fonksiyon, test edilebilir. */
export function groupLeftoverNotesByApartment(
  notes: LeftoverNote[],
  nameByDoorNo: Map<string, string>
): MobileLeftoverApartment[] {
  const byDoor = new Map<string, MobileLeftoverApartment>();

  for (const note of notes) {
    const doorNo = note.doorNo?.trim() || "?";
    let group = byDoor.get(doorNo);
    if (!group) {
      group = { doorNo, name: nameByDoorNo.get(doorNo) ?? "", eksik: 0, fazla: 0, onay: 0, ileri: 0, notes: [] };
      byDoor.set(doorNo, group);
    }

    if (note.kind === "EKSIK") group.eksik += note.amount;
    else if (note.kind === "FAZLA") group.fazla += note.amount;
    else if (note.kind === "ONAY") group.onay += note.amount;
    else group.ileri += note.amount;

    group.notes.push(note);
  }

  const result = Array.from(byDoor.values());
  for (const group of result) {
    group.eksik = roundMoney(group.eksik);
    group.fazla = roundMoney(group.fazla);
    group.onay = roundMoney(group.onay);
    group.ileri = roundMoney(group.ileri);
    group.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  result.sort((a, b) => compareDoorNo(a.doorNo, b.doorNo));
  return result;
}

export async function buildMobileLeftoverReport(): Promise<MobileLeftoverReport> {
  const [report, apartments] = await Promise.all([
    buildLeftoverNotes(null),
    prisma.apartment.findMany({
      select: {
        doorNo: true,
        ownerFullName: true,
        users: {
          where: { role: UserRole.RESIDENT },
          select: { fullName: true },
          orderBy: [{ fullName: "asc" }],
        },
      },
    }),
  ]);

  const nameByDoorNo = new Map<string, string>();
  for (const apartment of apartments) {
    const residents = apartment.users.map((user) => user.fullName.trim()).filter(Boolean);
    const name = residents.length > 0 ? residents.join(", ") : apartment.ownerFullName?.trim() ?? "";
    nameByDoorNo.set(apartment.doorNo, name);
  }

  return {
    generatedAt: report.generatedAt,
    lastDataAt: report.lastDataAt,
    totals: report.totals,
    apartments: groupLeftoverNotesByApartment(report.notes, nameByDoorNo),
  };
}
