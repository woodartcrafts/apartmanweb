import { UserRole } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import JSZip from "jszip";
import { prisma } from "../db";

type BuildingProfileRow = {
  singletonKey: string;
  buildingName: string | null;
  parcelInfo: string | null;
  address: string | null;
  totalIndependentSections: number | null;
};

const prismaWithBuildingProfile = prisma as typeof prisma & {
  buildingProfile: {
    findUnique: (args: { where: { singletonKey: string } }) => Promise<BuildingProfileRow | null>;
  };
};

function addDays(base: Date, dayCount: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + dayCount);
  return copy;
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTr(value: Date): string {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear());
  return `${day}.${month}.${year}`;
}

function toSafeText(value: string | null | undefined, fallback = "-"): string {
  const raw = value?.trim();
  return raw && raw.length > 0 ? raw : fallback;
}

function sanitizeFileToken(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function replaceFirstByNeedle(source: string, needle: string, replacement: string): string {
  const index = source.indexOf(needle);
  if (index < 0) {
    return source;
  }

  return `${source.slice(0, index)}${replacement}${source.slice(index + needle.length)}`;
}

function replaceFieldRunValues(documentXml: string, values: string[]): string {
  let current = documentXml;

  for (const value of values) {
    current = current.replace(/\.{6,}/, escapeXml(value));
  }

  return current;
}

function replaceEmptyRunValues(documentXml: string, values: string[]): string {
  let current = documentXml;
  const emptyRun = `<w:t xml:space="preserve"></w:t>`;

  for (const value of values) {
    current = replaceFirstByNeedle(current, emptyRun, `<w:t xml:space="preserve">${escapeXml(value)}</w:t>`);
  }

  return current;
}

function replaceSelfClosingParagraphValues(rowXml: string, values: string[]): string {
  let current = rowXml;

  for (const value of values) {
    current = current.replace(/<w:p\b([^>]*)\/>/, (_match, attrs: string) => {
      return `<w:p${attrs}><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
    });
  }

  return current;
}

function buildWordMultilineTextXml(lines: string[]): string {
  if (lines.length === 0) {
    return `<w:t xml:space="preserve">-</w:t>`;
  }

  return lines
    .map((line, index) => {
      const escaped = escapeXml(line);
      return index === 0
        ? `<w:t xml:space="preserve">${escaped}</w:t>`
        : `<w:br/><w:t xml:space="preserve">${escaped}</w:t>`;
    })
    .join("");
}

const apartmentOrderCollator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

function compareApartmentsByDoorOrder(
  left: { block: { name: string } | null; doorNo: string | null },
  right: { block: { name: string } | null; doorNo: string | null }
): number {
  const blockCompare = apartmentOrderCollator.compare(
    toSafeText(left.block?.name, ""),
    toSafeText(right.block?.name, "")
  );

  if (blockCompare !== 0) {
    return blockCompare;
  }

  return apartmentOrderCollator.compare(toSafeText(left.doorNo, ""), toSafeText(right.doorNo, ""));
}

export function createAdminMeetingRoutes(): Router {
  const router = Router();

  router.get("/meeting-documents/minutes", async (req, res) => {
    const now = new Date();
    const defaultMeetingDate = addDays(now, 15);
    const meetingDateCandidate = new Date(String(req.query.meetingDate ?? formatDateInput(defaultMeetingDate)));
    const meetingDate = Number.isNaN(meetingDateCandidate.getTime()) ? defaultMeetingDate : meetingDateCandidate;
    const meetingTime = toSafeText(String(req.query.meetingTime ?? "19:00"), "19:00");
    const meetingPlace = toSafeText(String(req.query.meetingPlace ?? "Apartman giris salonu"));
    const meetingRound = String(req.query.meetingRound ?? "1") === "2" ? "2" : "1";
    const requestedMeetingType = String(req.query.meetingType ?? "OLAGAN").toUpperCase();
    const meetingType = requestedMeetingType === "OLAGANUSTU" ? "OLAGANUSTU" : "OLAGAN";

    const [apartmentCount, blocks, buildingProfile, managerApartments, fallbackAdmin] = await Promise.all([
      prisma.apartment.count(),
      prisma.block.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
      prismaWithBuildingProfile.buildingProfile.findUnique({ where: { singletonKey: "DEFAULT" } }),
      prisma.apartment.findMany({
        where: {
          apartmentDuty: {
            is: {
              code: "YONETICI",
              isActive: true,
            },
          },
        },
        orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
        select: {
          ownerFullName: true,
          users: {
            orderBy: { createdAt: "asc" },
            select: { fullName: true },
            take: 1,
          },
        },
      }),
      prisma.user.findFirst({ where: { role: UserRole.ADMIN }, orderBy: { createdAt: "asc" }, select: { fullName: true } }),
    ]);

    const managerNames = Array.from(
      new Set(
        managerApartments
          .map((item: { ownerFullName: string | null; users: Array<{ fullName: string }> }) =>
            toSafeText(item.ownerFullName ?? item.users?.[0]?.fullName ?? null, "")
          )
          .filter(Boolean)
      )
    );

    const primaryManager = managerNames[0] ?? toSafeText(fallbackAdmin?.fullName, "-");
    const clerkName = managerNames[1] ?? "-";

    const defaultBuildingName =
      blocks.length === 0
        ? "Apartman Yonetimi"
        : blocks.length === 1
        ? blocks[0].name
        : blocks.map((item: { name: string }) => item.name).join("; ");

    const buildingName = toSafeText(buildingProfile?.buildingName ?? defaultBuildingName, defaultBuildingName);

    const templatePath = path.resolve(process.cwd(), "public", "4_Toplanti_Tutanagi.docx");
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return res.status(500).json({ message: "Toplanti tutanagi sablonu okunamadi" });
    }

    let documentXml = await documentFile.async("string");

    const placeholderValues = [
      buildingName,
      `${formatDateTr(meetingDate)} ${meetingTime}`,
      meetingPlace,
      primaryManager,
      clerkName,
      `${apartmentCount}`,
      "-",
      primaryManager,
      clerkName,
      "0",
      "0",
      "Uygun",
      "0",
      "0",
      "0",
      primaryManager,
      clerkName,
      "0",
      "0",
      "0",
      "0",
      "0",
      "-",
      "-",
      meetingTime,
      ...Array.from({ length: 20 }, () => "-"),
    ];

    documentXml = replaceFieldRunValues(documentXml, placeholderValues);

    const minutesMeetingTypeLine =
      meetingRound === "2"
        ? "□ Olagan    □ Olaganustu    ■ Ikinci Toplanti"
        : meetingType === "OLAGANUSTU"
        ? "□ Olagan    ■ Olaganustu    □ Ikinci Toplanti"
        : "■ Olagan    □ Olaganustu    □ Ikinci Toplanti";

    documentXml = documentXml.replace(
      /□\s*Olağan\s*□\s*Olağanüstü\s*□\s*İkinci Toplantı/,
      escapeXml(minutesMeetingTypeLine)
    );

    zip.file("word/document.xml", documentXml);
    const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const generatedAtToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const fileName = `toplanti-tutanagi-${sanitizeFileToken(generatedAtToken)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(generatedBuffer);
  });

  router.get("/meeting-documents/decision-book", async (req, res) => {
    const now = new Date();
    const defaultMeetingDate = addDays(now, 15);
    const meetingDateCandidate = new Date(String(req.query.meetingDate ?? formatDateInput(defaultMeetingDate)));
    const meetingDate = Number.isNaN(meetingDateCandidate.getTime()) ? defaultMeetingDate : meetingDateCandidate;

    const [managerApartments, fallbackAdmin] = await Promise.all([
      prisma.apartment.findMany({
        where: {
          apartmentDuty: {
            is: {
              code: "YONETICI",
              isActive: true,
            },
          },
        },
        orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
        select: {
          ownerFullName: true,
          users: {
            orderBy: { createdAt: "asc" },
            select: { fullName: true },
            take: 1,
          },
        },
      }),
      prisma.user.findFirst({ where: { role: UserRole.ADMIN }, orderBy: { createdAt: "asc" }, select: { fullName: true } }),
    ]);

    const managerNames = Array.from(
      new Set(
        managerApartments
          .map((item: { ownerFullName: string | null; users: Array<{ fullName: string }> }) =>
            toSafeText(item.ownerFullName ?? item.users?.[0]?.fullName ?? null, "")
          )
          .filter(Boolean)
      )
    );

    const primaryManager = managerNames[0] ?? toSafeText(fallbackAdmin?.fullName, "-");
    const clerkName = managerNames[1] ?? "-";

    const templatePath = path.resolve(process.cwd(), "public", "5_Karar_Defteri_Taslagi.docx");
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return res.status(500).json({ message: "Karar defteri sablonu okunamadi" });
    }

    let documentXml = await documentFile.async("string");

    const placeholderValues = [
      formatDateTr(now),
      "Merkez Noterligi",
      "1",
      formatDateTr(meetingDate),
      formatDateTr(meetingDate),
      formatDateTr(meetingDate),
      "Divan heyeti secildi.",
      "0",
      "0",
      "0",
      formatDateTr(meetingDate),
      "Yonetim ve denetim ibra edildi.",
      "0",
      "0",
      "0",
      formatDateTr(meetingDate),
      `Yonetici: ${primaryManager}; Denetci: ${clerkName}`,
      "0",
      "0",
      "0",
      formatDateTr(meetingDate),
      "Isletme projesi onaylandi.",
      "0",
      "0",
      "0",
    ];

    documentXml = replaceFieldRunValues(documentXml, placeholderValues);

    zip.file("word/document.xml", documentXml);
    const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const generatedAtToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const fileName = `karar-defteri-${sanitizeFileToken(generatedAtToken)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(generatedBuffer);
  });

  router.get("/meeting-documents/operating-plan", async (req, res) => {
    const now = new Date();
    const defaultMeetingDate = addDays(now, 15);
    const meetingDateCandidate = new Date(String(req.query.meetingDate ?? formatDateInput(defaultMeetingDate)));
    const meetingDate = Number.isNaN(meetingDateCandidate.getTime()) ? defaultMeetingDate : meetingDateCandidate;

    const templatePath = path.resolve(process.cwd(), "public", "6_Isletme_Projesi.docx");
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return res.status(500).json({ message: "Isletme projesi sablonu okunamadi" });
    }

    let documentXml = await documentFile.async("string");

    const placeholderValues = [
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "0",
      "TR00 0000 0000 0000 0000 0000 00",
      formatDateTr(meetingDate),
      "0",
      "0",
      "0",
    ];

    documentXml = replaceFieldRunValues(documentXml, placeholderValues);
    documentXml = documentXml.replace(/□\s*Banka Havalesi\s*□\s*Elden Yöneticiye/, "■ Banka Havalesi    □ Elden Yoneticiye");

    zip.file("word/document.xml", documentXml);
    const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const generatedAtToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const fileName = `isletme-projesi-${sanitizeFileToken(generatedAtToken)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(generatedBuffer);
  });

  router.get("/meeting-documents/notification-list", async (req, res) => {
    const now = new Date();
    const defaultMeetingDate = addDays(now, 15);
    const meetingDateCandidate = new Date(String(req.query.meetingDate ?? formatDateInput(defaultMeetingDate)));
    const meetingDate = Number.isNaN(meetingDateCandidate.getTime()) ? defaultMeetingDate : meetingDateCandidate;

    const [managerApartments, fallbackAdmin] = await Promise.all([
      prisma.apartment.findMany({
        where: {
          apartmentDuty: {
            is: {
              code: "YONETICI",
              isActive: true,
            },
          },
        },
        orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
        select: {
          ownerFullName: true,
          users: {
            orderBy: { createdAt: "asc" },
            select: { fullName: true },
            take: 1,
          },
        },
      }),
      prisma.user.findFirst({ where: { role: UserRole.ADMIN }, orderBy: { createdAt: "asc" }, select: { fullName: true } }),
    ]);

    const managerNames = Array.from(
      new Set(
        managerApartments
          .map((item: { ownerFullName: string | null; users: Array<{ fullName: string }> }) =>
            toSafeText(item.ownerFullName ?? item.users?.[0]?.fullName ?? null, "")
          )
          .filter(Boolean)
      )
    );

    const primaryManager = managerNames[0] ?? toSafeText(fallbackAdmin?.fullName, "-");

    const templatePath = path.resolve(process.cwd(), "public", "7_Teblig_Takip_Listesi.docx");
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return res.status(500).json({ message: "Teblig takip listesi sablonu okunamadi" });
    }

    let documentXml = await documentFile.async("string");

    const placeholderValues = [formatDateTr(meetingDate), formatDateTr(now), primaryManager];
    documentXml = replaceFieldRunValues(documentXml, placeholderValues);
    documentXml = documentXml.replace(/2026\s*İşletme Projesi/, `${now.getFullYear()} Isletme Projesi`);
    documentXml = documentXml.replace(
      /□\s*Toplantı Tutanağı\s*□\s*Karar Özeti\s*□\s*2026 Isletme Projesi/,
      `■ Toplanti Tutanagi    ■ Karar Ozeti    ■ ${now.getFullYear()} Isletme Projesi`
    );

    zip.file("word/document.xml", documentXml);
    const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const generatedAtToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const fileName = `teblig-takip-listesi-${sanitizeFileToken(generatedAtToken)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(generatedBuffer);
  });

  router.get("/meeting-documents/attendance-sheet", async (req, res) => {
    const now = new Date();
    const defaultMeetingDate = addDays(now, 15);
    const meetingDateCandidate = new Date(String(req.query.meetingDate ?? formatDateInput(defaultMeetingDate)));
    const meetingDate = Number.isNaN(meetingDateCandidate.getTime()) ? defaultMeetingDate : meetingDateCandidate;
    const meetingPlace = toSafeText(String(req.query.meetingPlace ?? "Apartman giris salonu"));
    const meetingRound = String(req.query.meetingRound ?? "1") === "2" ? "2" : "1";

    const apartments = await prisma.apartment.findMany({
      orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
      select: {
        doorNo: true,
        ownerFullName: true,
        block: { select: { name: true } },
        users: {
          orderBy: { createdAt: "asc" },
          select: { fullName: true },
          take: 1,
        },
      },
    });

    const sortedApartments = [...apartments].sort(compareApartmentsByDoorOrder);

    const participants = sortedApartments.map((apartment) => {
      const ownerName = toSafeText(apartment.ownerFullName ?? apartment.users?.[0]?.fullName ?? null, "-");
      const attendanceType = "□ ASIL    □ VEKALETEN";
      const blockDoor = `${toSafeText(apartment.block?.name, "Blok")} ${toSafeText(apartment.doorNo, "-")}`;

      return {
        door: blockDoor,
        ownerName,
        attendanceType,
        signature: "",
      };
    });

    const templatePath = path.resolve(process.cwd(), "public", "2_Hazirun_Cetveli.docx");
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return res.status(500).json({ message: "Hazirun cetveli sablonu okunamadi" });
    }

    let documentXml = await documentFile.async("string");
    documentXml = replaceFieldRunValues(documentXml, [formatDateTr(meetingDate), meetingPlace]);

    const meetingRoundLine =
      meetingRound === "2"
        ? "□ 1. Toplanti    ■ 2. Toplanti"
        : "■ 1. Toplanti    □ 2. Toplanti";

    documentXml = documentXml.replace(/□\s*1\.\s*Toplant[ıi]\s*□\s*2\.\s*Toplant[ıi]/i, escapeXml(meetingRoundLine));
    documentXml = documentXml.replace(/Toplam Kat Maliki Say[ıi]s[ıi]:\s*\.{3,}/i, `Toplam Kat Maliki Sayisi: ${participants.length}`);
    documentXml = documentXml.replace(/Toplant[ıi]ya Kat[ıi]lan Ki[sş][ıi] Say[ıi]s[ıi]:\s*\.{3,}/i, `Toplantiya Katilan Kisi Sayisi: ${participants.length}`);
    documentXml = documentXml.replace(/Toplam Arsa Pay[ıi]:\s*\.{3,}/i, "Toplam Arsa Payi: -");
    documentXml = documentXml.replace(/Temsil Edilen Arsa Pay[ıi]:\s*\.{3,}/i, "Temsil Edilen Arsa Payi: -");

    const rowMatches = [...documentXml.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)];
    const participantRows = rowMatches
      .map((match) => match[0])
      .filter((row) => /<w:t[^>]*>\s*\d+\s*<\/w:t>/.test(row) && (row.match(/<w:tc>/g)?.length ?? 0) >= 5);

    if (participantRows.length > 0) {
      const rowCount = Math.max(participantRows.length, participants.length);
      const generatedRows = Array.from({ length: rowCount }, (_, rowIndex) => {
        const participant = participants[rowIndex];
        const baseRowTemplate = participantRows[rowIndex % participantRows.length];
        const numberedRow = baseRowTemplate.replace(/(<w:t[^>]*>)\s*\d+\s*(<\/w:t>)/, `$1${rowIndex + 1}$2`);

        return replaceSelfClosingParagraphValues(numberedRow, [
          participant?.door ?? "",
          participant?.ownerName ?? "",
          participant?.attendanceType ?? "",
          participant?.signature ?? "",
        ]);
      });

      documentXml = replaceFirstByNeedle(documentXml, participantRows.join(""), generatedRows.join(""));
    }

    zip.file("word/document.xml", documentXml);
    const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const generatedAtToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const fileName = `hazirun-cetveli-${sanitizeFileToken(generatedAtToken)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(generatedBuffer);
  });

  router.get("/meeting-documents/invitation", async (req, res) => {
    const now = new Date();
    const defaultFirstMeetingDate = addDays(now, 15);
    const defaultSecondMeetingDate = addDays(defaultFirstMeetingDate, 7);

    const requestedMeetingType = String(req.query.meetingType ?? "OLAGAN").toUpperCase();
    const meetingType = requestedMeetingType === "OLAGANUSTU" ? "OLAGANUSTU" : "OLAGAN";

    const firstMeetingDateCandidate = new Date(
      String(req.query.firstMeetingDate ?? formatDateInput(defaultFirstMeetingDate))
    );
    const secondMeetingDateCandidate = new Date(
      String(req.query.secondMeetingDate ?? formatDateInput(defaultSecondMeetingDate))
    );

    const firstMeetingDate = Number.isNaN(firstMeetingDateCandidate.getTime())
      ? defaultFirstMeetingDate
      : firstMeetingDateCandidate;
    const secondMeetingDate = Number.isNaN(secondMeetingDateCandidate.getTime())
      ? defaultSecondMeetingDate
      : secondMeetingDateCandidate;

    const firstMeetingTime = toSafeText(String(req.query.firstMeetingTime ?? "19:00"), "19:00");
    const secondMeetingTime = toSafeText(String(req.query.secondMeetingTime ?? "19:30"), "19:30");
    const firstMeetingPlace = toSafeText(String(req.query.firstMeetingPlace ?? "Apartman giris salonu"));
    const secondMeetingPlace = toSafeText(String(req.query.secondMeetingPlace ?? firstMeetingPlace));

    const [apartmentCount, blocks, buildingProfile, managerApartments, adminFromSession, fallbackAdmin] = await Promise.all([
      prisma.apartment.count(),
      prisma.block.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
      prismaWithBuildingProfile.buildingProfile.findUnique({ where: { singletonKey: "DEFAULT" } }),
      prisma.apartment.findMany({
        where: {
          apartmentDuty: {
            is: {
              code: "YONETICI",
              isActive: true,
            },
          },
        },
        orderBy: [{ block: { name: "asc" } }, { doorNo: "asc" }],
        select: {
          ownerFullName: true,
          apartmentDuty: {
            select: {
              name: true,
            },
          },
          users: {
            orderBy: { createdAt: "asc" },
            select: {
              fullName: true,
            },
            take: 1,
          },
        },
      }),
      req.user?.userId
        ? prisma.user.findUnique({ where: { id: req.user.userId }, select: { fullName: true, role: true } })
        : Promise.resolve(null),
      prisma.user.findFirst({ where: { role: UserRole.ADMIN }, orderBy: { createdAt: "asc" }, select: { fullName: true } }),
    ]);

    const managerNamesFromApartments = Array.from(
      new Set(
        managerApartments
          .map((item: { ownerFullName: string | null; users: Array<{ fullName: string }> }) =>
            toSafeText(item.ownerFullName ?? item.users?.[0]?.fullName ?? null, "")
          )
          .filter(Boolean)
      )
    );

    const managerName =
      (managerNamesFromApartments.length > 0 ? managerNamesFromApartments.join("; ") : "") ||
      (adminFromSession && adminFromSession.role === UserRole.ADMIN
        ? toSafeText(adminFromSession.fullName, "-")
        : toSafeText(fallbackAdmin?.fullName, "-"));

    const managerSignatureNames = managerNamesFromApartments.length > 0 ? managerNamesFromApartments : [managerName];

    const defaultBuildingName =
      blocks.length === 0
        ? "Apartman Yonetimi"
        : blocks.length === 1
        ? blocks[0].name
        : blocks.map((item: { name: string }) => item.name).join("; ");

    const buildingName = toSafeText(
      String(req.query.buildingName ?? buildingProfile?.buildingName ?? defaultBuildingName),
      defaultBuildingName
    );
    const parcelInfo = toSafeText(String(req.query.parcelInfo ?? buildingProfile?.parcelInfo ?? "-"));
    const buildingAddress = toSafeText(String(req.query.buildingAddress ?? buildingProfile?.address ?? "-"));
    const requestedSectionCount = Number(req.query.totalIndependentSections);
    const totalIndependentSections = Number.isFinite(requestedSectionCount) && requestedSectionCount > 0
      ? Math.floor(requestedSectionCount)
      : buildingProfile?.totalIndependentSections ?? apartmentCount;
    const fiscalYear = Number(req.query.fiscalYear ?? now.getFullYear());

    const templatePath = path.resolve(process.cwd(), "public", "1_Cagri_Metni.docx");
    const templateBuffer = await readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      return res.status(500).json({ message: "Toplanti cagri metni sablonu okunamadi" });
    }

    let documentXml = await documentFile.async("string");

    documentXml = replaceFieldRunValues(documentXml, [
      buildingName,
      parcelInfo,
      buildingAddress,
      String(totalIndependentSections),
      managerName,
      formatDateTr(firstMeetingDate),
      firstMeetingTime,
      firstMeetingPlace,
      formatDateTr(secondMeetingDate),
      secondMeetingPlace,
    ]);

    const meetingTypeLine =
      meetingType === "OLAGANUSTU"
        ? "[ ] Olagan Genel Kurul    [X] Olaganustu Genel Kurul"
        : "[X] Olagan Genel Kurul    [ ] Olaganustu Genel Kurul";

    documentXml = documentXml.replace(
      /□ Olağan Genel Kurul\s+□ Olağanüstü Genel Kurul/,
      escapeXml(meetingTypeLine)
    );
    documentXml = documentXml.replace(
      /\(1\. toplantıdan en az 7, en fazla 15 gün sonra\)/,
      `${escapeXml(secondMeetingTime)} (1. toplantidan en az 7, en fazla 15 gun sonra)`
    );
    documentXml = documentXml.replace(/2026 yılı işletme projesinin/, `${escapeXml(String(fiscalYear))} yılı işletme projesinin`);

    const managerNameLines = ["Yonetici Adi Soyadi:", ...managerSignatureNames.map((name, index) => `${index + 1}) ${name}`)];

    documentXml = replaceFirstByNeedle(
      documentXml,
      "<w:t>Yönetici Adı Soyadı</w:t>",
      buildWordMultilineTextXml(managerNameLines)
    );
    documentXml = replaceFirstByNeedle(
      documentXml,
      "<w:t>İmza / Tarih</w:t>",
      `<w:t xml:space="preserve"></w:t>`
    );

    zip.file("word/document.xml", documentXml);
    const generatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const generatedAtToken = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const fileName = `toplanti-cagri-metni-${sanitizeFileToken(generatedAtToken)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(generatedBuffer);
  });

  return router;
}
