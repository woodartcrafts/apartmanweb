import { describe, expect, it } from "vitest";
import { groupLeftoverNotesByApartment } from "./utils/mobileLeftoverReport";
import { mapRequestPathToAdminPage } from "./utils/adminPermissions";
import type { LeftoverNote } from "./utils/leftoverNotes";

function note(partial: Partial<LeftoverNote> & Pick<LeftoverNote, "id" | "kind" | "doorNo" | "amount">): LeftoverNote {
  return { date: "2026-11-10T00:00:00.000Z", text: "x", hint: "y", ...partial };
}

describe("mobil kalan islemler", () => {
  it("notlari daireye gore gruplar, turlere gore toplar ve kapi numarasina gore siralar", () => {
    const notes = [
      note({ id: "a", kind: "EKSIK", doorNo: "10", amount: 0.5 }),
      note({ id: "b", kind: "FAZLA", doorNo: "2", amount: 20.25, date: "2026-11-01T00:00:00.000Z" }),
      note({ id: "c", kind: "EKSIK", doorNo: "10", amount: 0.25 }),
      note({ id: "d", kind: "FAZLA", doorNo: "2", amount: 1.1, date: "2026-11-15T00:00:00.000Z" }),
    ];
    const result = groupLeftoverNotesByApartment(notes, new Map([["2", "Ali Veli"]]));

    expect(result.map((x) => x.doorNo)).toEqual(["2", "10"]);
    expect(result[0].name).toBe("Ali Veli");
    expect(result[0].fazla).toBe(21.35);
    expect(result[1].eksik).toBe(0.75);
    expect(result[1].name).toBe("");
    // her dairede en yeni not once gelir
    expect(result[0].notes.map((x) => x.id)).toEqual(["d", "b"]);
  });

  it("onay bekleyen ve onceden odenen tutarlari ayri toplar", () => {
    const result = groupLeftoverNotesByApartment(
      [
        note({ id: "a", kind: "ONAY", doorNo: "5", amount: 100 }),
        note({ id: "b", kind: "ILERI", doorNo: "5", amount: 40 }),
      ],
      new Map()
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ eksik: 0, fazla: 0, onay: 100, ileri: 40 });
  });

  it("yeni mobil endpoint kendi yetki anahtarina baglidir, eski notlar sayfasindan ayridir", () => {
    expect(mapRequestPathToAdminPage("/reports/leftover-mobile", "GET")).toBe("REPORTS_MOBILE_LEFTOVER");
    expect(mapRequestPathToAdminPage("/reports/leftover-notes", "GET")).toBe("CONTROL_LEFTOVER_NOTES");
  });
});
