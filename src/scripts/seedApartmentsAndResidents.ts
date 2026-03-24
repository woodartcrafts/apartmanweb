import bcrypt from "bcryptjs";
import { ApartmentType, PasswordChangeReason, UserRole } from "@prisma/client";
import { prisma } from "../db";

type ResidentRow = {
  doorNo: string;
  fullName: string;
  type: ApartmentType;
};

const rows: ResidentRow[] = [
  { doorNo: "0", fullName: "Kamil Abi-Apartman Görevlisi", type: ApartmentType.KUCUK },
  { doorNo: "1", fullName: "Hakan Taşyapı", type: ApartmentType.KUCUK },
  { doorNo: "2", fullName: "Ziya Ekin", type: ApartmentType.KUCUK },
  { doorNo: "3", fullName: "Ahmet Ağbulut", type: ApartmentType.KUCUK },
  { doorNo: "4", fullName: "Uğur Taşdelen", type: ApartmentType.KUCUK },
  { doorNo: "5", fullName: "Şerife Kalaycı", type: ApartmentType.KUCUK },
  { doorNo: "6", fullName: "Ellada Gasimova", type: ApartmentType.BUYUK },
  { doorNo: "7", fullName: "Acıbadem Sağlık Hizmetleri", type: ApartmentType.BUYUK },
  { doorNo: "8", fullName: "Ziya Tahan", type: ApartmentType.BUYUK },
  { doorNo: "9", fullName: "Tansel Dikmen", type: ApartmentType.BUYUK },
  { doorNo: "10", fullName: "Havva Eskiköy", type: ApartmentType.BUYUK },
  { doorNo: "11", fullName: "Nazım Aydemir", type: ApartmentType.BUYUK },
  { doorNo: "12", fullName: "Nazım Erkut", type: ApartmentType.BUYUK },
  { doorNo: "13", fullName: "Atilla Argun", type: ApartmentType.BUYUK },
  { doorNo: "14", fullName: "Cemal Kurt", type: ApartmentType.BUYUK },
  { doorNo: "15", fullName: "Emre Üzüm", type: ApartmentType.BUYUK },
  { doorNo: "16", fullName: "Mustafa Koç", type: ApartmentType.BUYUK },
  { doorNo: "17", fullName: "Muhsin Koç", type: ApartmentType.BUYUK },
  { doorNo: "18", fullName: "Nihal Yılmazer", type: ApartmentType.BUYUK },
  { doorNo: "19", fullName: "Hasan Salman", type: ApartmentType.BUYUK },
  { doorNo: "20", fullName: "Fatma Ekşi", type: ApartmentType.BUYUK },
  { doorNo: "21", fullName: "Solmaz Somuncu", type: ApartmentType.BUYUK },
  { doorNo: "22", fullName: "Orçun Aras", type: ApartmentType.BUYUK },
  { doorNo: "23", fullName: "Saadet Atasavun", type: ApartmentType.BUYUK },
  { doorNo: "24", fullName: "Özgür Koç", type: ApartmentType.BUYUK },
  { doorNo: "25", fullName: "İsmail Orhan", type: ApartmentType.BUYUK },
  { doorNo: "26", fullName: "Uğur Gokalp", type: ApartmentType.BUYUK },
  { doorNo: "27", fullName: "Serap Altınsu", type: ApartmentType.BUYUK },
  { doorNo: "28", fullName: "Onur Öztaş", type: ApartmentType.BUYUK },
  { doorNo: "29", fullName: "Serkan Dursun", type: ApartmentType.BUYUK },
  { doorNo: "30", fullName: "Ersan Demirbaş", type: ApartmentType.BUYUK },
  { doorNo: "31", fullName: "Nihat Aktepe", type: ApartmentType.BUYUK },
  { doorNo: "32", fullName: "Anıl Şahin", type: ApartmentType.BUYUK },
  { doorNo: "33", fullName: "Gürcan Yavuz", type: ApartmentType.BUYUK },
  { doorNo: "34", fullName: "Saadet Cuma", type: ApartmentType.BUYUK },
  { doorNo: "35", fullName: "Kemal Karaman", type: ApartmentType.BUYUK },
  { doorNo: "36", fullName: "Ercüment Şevle", type: ApartmentType.BUYUK },
  { doorNo: "37", fullName: "Efreddin Yeni", type: ApartmentType.BUYUK },
  { doorNo: "38", fullName: "Mustafa Çitil", type: ApartmentType.BUYUK },
  { doorNo: "39", fullName: "Hande Babadağ", type: ApartmentType.BUYUK },
  { doorNo: "40", fullName: "Saziye Çetinkaya", type: ApartmentType.BUYUK },
  { doorNo: "41", fullName: "Suzan Altuntaş", type: ApartmentType.BUYUK },
  { doorNo: "42", fullName: "Cenk Baykam", type: ApartmentType.BUYUK },
  { doorNo: "43", fullName: "Semiha DenizŞahin", type: ApartmentType.BUYUK },
  { doorNo: "44", fullName: "Şerife Akbaş", type: ApartmentType.BUYUK },
  { doorNo: "45", fullName: "Ece Kubulay", type: ApartmentType.BUYUK },
  { doorNo: "46", fullName: "Abdullah Büyükgören", type: ApartmentType.BUYUK },
  { doorNo: "47", fullName: "Ünran Elifoğlu", type: ApartmentType.BUYUK },
  { doorNo: "48", fullName: "Ümit Başar", type: ApartmentType.BUYUK },
  { doorNo: "49", fullName: "Yücel Şahin", type: ApartmentType.BUYUK },
  { doorNo: "50", fullName: "Gülistan Gönül", type: ApartmentType.BUYUK },
  { doorNo: "51", fullName: "Şeyma Tangut", type: ApartmentType.BUYUK },
  { doorNo: "52", fullName: "Münir Kargın", type: ApartmentType.BUYUK },
  { doorNo: "53", fullName: "Burak Kuşdoğan", type: ApartmentType.BUYUK },
  { doorNo: "54", fullName: "Emre Yıldırım", type: ApartmentType.BUYUK },
  { doorNo: "55", fullName: "Acibadem Sağlık", type: ApartmentType.BUYUK },
  { doorNo: "56", fullName: "Ahmet Gürkan", type: ApartmentType.BUYUK },
  { doorNo: "57", fullName: "Buket Güner", type: ApartmentType.BUYUK },
  { doorNo: "58", fullName: "Gizem Köse", type: ApartmentType.BUYUK },
  { doorNo: "59", fullName: "Zafer Karasmanoğlu", type: ApartmentType.BUYUK },
  { doorNo: "60", fullName: "Burak Yanlızer", type: ApartmentType.BUYUK },
  { doorNo: "61", fullName: "Sevim Okumuş", type: ApartmentType.BUYUK },
  { doorNo: "62", fullName: "Fatma Sayılan", type: ApartmentType.BUYUK },
  { doorNo: "63", fullName: "Erdoğan Çelebi", type: ApartmentType.BUYUK },
  { doorNo: "64", fullName: "Soner Özdoğan", type: ApartmentType.BUYUK },
  { doorNo: "65", fullName: "Ceyhan Kaptan", type: ApartmentType.BUYUK },
  { doorNo: "66", fullName: "Gülseren Çaylak", type: ApartmentType.BUYUK },
  { doorNo: "67", fullName: "Erkan Akçay", type: ApartmentType.BUYUK },
  { doorNo: "68", fullName: "Altan Erenler", type: ApartmentType.BUYUK },
  { doorNo: "69", fullName: "Haşmet Recan", type: ApartmentType.BUYUK },
  { doorNo: "70", fullName: "Havva Çatak", type: ApartmentType.BUYUK },
  { doorNo: "71", fullName: "Merve Altunel", type: ApartmentType.BUYUK },
  { doorNo: "72", fullName: "Gürkan Aydın", type: ApartmentType.BUYUK },
  { doorNo: "73", fullName: "Melek Çaylak", type: ApartmentType.BUYUK },
  { doorNo: "74", fullName: "Fahri Yılmaz", type: ApartmentType.BUYUK },
  { doorNo: "75", fullName: "Mehmet Çolakoğlu", type: ApartmentType.BUYUK },
  { doorNo: "76", fullName: "Mustafa Yalçiner", type: ApartmentType.BUYUK },
  { doorNo: "77", fullName: "Erinç Tan", type: ApartmentType.BUYUK },
  { doorNo: "78", fullName: "Nail Umut Aykurt", type: ApartmentType.BUYUK },
  { doorNo: "79", fullName: "Şerife Kaya", type: ApartmentType.BUYUK },
  { doorNo: "80", fullName: "Sevim Bekar", type: ApartmentType.BUYUK },
  { doorNo: "81", fullName: "Kahraman Akyüz", type: ApartmentType.BUYUK },
  { doorNo: "82", fullName: "Deniz Şahin", type: ApartmentType.BUYUK },
  { doorNo: "83", fullName: "Tülin Erdem", type: ApartmentType.BUYUK },
  { doorNo: "84", fullName: "Sedat Kaan", type: ApartmentType.BUYUK },
  { doorNo: "85", fullName: "Tayfun Battal", type: ApartmentType.BUYUK },
  { doorNo: "86", fullName: "Sabiha Yılmaz", type: ApartmentType.BUYUK },
  { doorNo: "87", fullName: "Berker Bahçeci", type: ApartmentType.BUYUK },
  { doorNo: "88", fullName: "Mehmet Işık", type: ApartmentType.BUYUK },
  { doorNo: "89", fullName: "Mehmet Çulha", type: ApartmentType.BUYUK },
  { doorNo: "90", fullName: "Ahmet Artün", type: ApartmentType.BUYUK },
  { doorNo: "91", fullName: "Özgür Aktürk", type: ApartmentType.BUYUK },
  { doorNo: "92", fullName: "Mesut Doğan", type: ApartmentType.BUYUK },
  { doorNo: "93", fullName: "Bülent Güner", type: ApartmentType.BUYUK },
  { doorNo: "94", fullName: "Özcan Kutlu", type: ApartmentType.BUYUK },
  { doorNo: "95", fullName: "Ender Elifoğlu", type: ApartmentType.BUYUK },
  { doorNo: "96", fullName: "Egemen TamTürk", type: ApartmentType.BUYUK },
  { doorNo: "97", fullName: "Ayşegül Yumak", type: ApartmentType.BUYUK },
  { doorNo: "98", fullName: "Faik Baharoğlu", type: ApartmentType.BUYUK },
  { doorNo: "99", fullName: "Mehmet Mutlu", type: ApartmentType.BUYUK },
  { doorNo: "100", fullName: "Birol Karacakaya", type: ApartmentType.BUYUK },
  { doorNo: "101", fullName: "Aydın Günertengil", type: ApartmentType.BUYUK },
];

async function main() {
  const blockName = process.env.BLOCK_NAME ?? "B Blok";
  const emailDomain = process.env.RESIDENT_EMAIL_DOMAIN ?? "apartman.local";
  const residentPassword = process.env.RESIDENT_DEFAULT_PASSWORD ?? "Daire123!";

  const passwordHash = await bcrypt.hash(residentPassword, 10);

  const block = await prisma.block.upsert({
    where: { name: blockName },
    update: {},
    create: { name: blockName },
  });

  for (const row of rows) {
    const apartment = await prisma.apartment.upsert({
      where: {
        blockId_doorNo: {
          blockId: block.id,
          doorNo: row.doorNo,
        },
      },
      update: {
        ownerFullName: row.fullName,
        type: row.type,
      },
      create: {
        blockId: block.id,
        doorNo: row.doorNo,
        ownerFullName: row.fullName,
        type: row.type,
      },
    });

    const email = `daire${row.doorNo}@${emailDomain}`;
    const phone = `+905550${row.doorNo.padStart(5, "0")}`;
    const residentUser = await prisma.user.upsert({
      where: { email },
      update: {
        fullName: row.fullName,
        role: UserRole.RESIDENT,
        apartmentId: apartment.id,
        phone,
        passwordPlaintext: residentPassword,
        passwordHash,
      },
      create: {
        fullName: row.fullName,
        role: UserRole.RESIDENT,
        email,
        phone,
        passwordPlaintext: residentPassword,
        passwordHash,
        apartmentId: apartment.id,
      },
    });

    const latestHistory = await prisma.userPasswordHistory.findFirst({
      where: { userId: residentUser.id },
      orderBy: [{ changedAt: "desc" }],
      select: { id: true, passwordHash: true },
    });

    if (!latestHistory || latestHistory.passwordHash !== passwordHash) {
      await prisma.userPasswordHistory.create({
        data: {
          userId: residentUser.id,
          changedByUserId: null,
          passwordHash,
          passwordPlaintext: residentPassword,
          reason: PasswordChangeReason.INITIAL_SEED,
        },
      });
    }
  }

  console.log(`Daire + resident import tamamlandi. Toplam: ${rows.length}`);
  console.log(`Varsayilan resident sifresi: ${residentPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
