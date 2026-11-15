import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

// Демоданные. Все люди, клиники и жалобы вымышлены.
const db = new PrismaClient();

const field = (value: string | null, quote: string | null = value) => ({
  value, quote, quoteVerified: value !== null, editedByPatient: false,
});

const demoCard = (o: { since: string; complaint: string; quote: string; triggers?: string; frequency?: string }) =>
  ({
    time_since_birth: field(o.since),
    birth_info: field(null),
    complaint: field(o.complaint, o.quote),
    triggers: field(o.triggers ?? null),
    frequency: field(o.frequency ?? null),
    impact: field(null),
    tried_or_told: field("к врачу не обращалась", "думала, само пройдёт"),
    own_question: field("можно ли это исправить", "можно ли это вообще исправить"),
  }) as Prisma.InputJsonValue;

async function user(login: string, role: "PATIENT" | "DOCTOR" | "ADMIN", passwordHash: string) {
  return db.user.upsert({ where: { login }, update: { passwordHash }, create: { login, role, passwordHash } });
}

async function main() {
  const password = process.env.SEED_PASSWORD ?? "aldi-demo-2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const clinicA = await db.clinic.upsert({ where: { id: "demo-clinic-a" }, update: {}, create: { id: "demo-clinic-a", name: "Клиника «Демо» (вымышленная)" } });
  const clinicB = await db.clinic.upsert({ where: { id: "demo-clinic-b" }, update: {}, create: { id: "demo-clinic-b", name: "Другая клиника (вымышленная)" } });

  await user("admin.demo", "ADMIN", passwordHash);
  const doctorUser = await user("doctor.demo", "DOCTOR", passwordHash);
  const doctor2User = await user("doctor2.demo", "DOCTOR", passwordHash);
  const momUser = await user("mama.demo", "PATIENT", passwordHash);

  const doctor = await db.doctorProfile.upsert({
    where: { userId: doctorUser.id }, update: {},
    create: { userId: doctorUser.id, clinicId: clinicA.id, displayName: "Доктор Ахметова (демо)" },
  });
  // Врач другой клиники — чтобы проверять, что чужие карточки ему не видны.
  await db.doctorProfile.upsert({
    where: { userId: doctor2User.id }, update: {},
    create: { userId: doctor2User.id, clinicId: clinicB.id, displayName: "Доктор Ким (демо)" },
  });
  const mom = await db.patientProfile.upsert({
    where: { userId: momUser.id }, update: {},
    create: { userId: momUser.id, clinicId: clinicA.id, displayName: "Айгерим (демо)", status: "ACTIVE" },
  });
  await db.doctorPatient.upsert({
    where: { doctorId_patientId: { doctorId: doctor.id, patientId: mom.id } }, update: {},
    create: { doctorId: doctor.id, patientId: mom.id },
  });

  // Две отправленные карточки, одна из них с отметкой срочности.
  await db.intake.deleteMany({ where: { patientId: mom.id, consentVersion: "demo" } });
  const demos = [
    { urgent: false, card: demoCard({ since: "около 6 месяцев", complaint: "подтекание мочи", quote: "подтекает", triggers: "когда чихаю или поднимаю сына", frequency: "почти каждый день" }) },
    { urgent: true, card: demoCard({ since: "2 недели", complaint: "сильное кровотечение", quote: "прокладка промокает за час" }) },
  ];
  for (const d of demos) {
    const intake = await db.intake.create({
      data: {
        patientId: mom.id, locale: "ru", country: "KZ", consentVersion: "demo", status: "SHARED", processingStatus: "DONE",
        version: 1, urgent: d.urgent, urgentReason: d.urgent ? "bleeding" : null,
      },
    });
    await db.cardVersion.create({
      data: { intakeId: intake.id, version: 1, sourceLocale: "ru", fields: d.card, doctorQuestions: ["К какому специалисту мне с этим идти?", "Пройдёт ли это само?"] },
    });
    await db.share.create({ data: { intakeId: intake.id, cardVersion: 1, doctorId: doctor.id, notification: "SKIPPED" } });
  }

  // Упражнения: каталог ответственного за 3D (prisma/exercises.json, копия из его репозитория).
  // Тексты не редактируем, казахский написан носителем. Все упражнения пока reviewed: false —
  // это демонстрация, а не проверенная специалистом рекомендация.
  type CatalogExercise = {
    id: string; visual: string; locked: boolean; reviewed: boolean; durationSec: number;
    content: Record<string, { title: string; description: string; steps: string[]; cues: unknown[]; machineTranslated: boolean; unlockNote?: string }>;
  };
  const catalog: CatalogExercise[] = JSON.parse(readFileSync(new URL("./exercises.json", import.meta.url), "utf8"));
  await db.exercise.deleteMany({ where: { id: { notIn: catalog.map((e) => e.id) } } });
  for (const [i, e] of catalog.entries()) {
    const base = { visual: e.visual, locked: e.locked, durationSec: e.durationSec, sortOrder: i + 1, published: true };
    await db.exercise.upsert({ where: { id: e.id }, update: base, create: { id: e.id, ...base } });
    for (const [locale, c] of Object.entries(e.content)) {
      const text = {
        title: c.title, description: c.description,
        instructions: c.steps, breathingCues: c.cues as Prisma.InputJsonValue,
        machineTranslated: c.machineTranslated, unlockNote: c.unlockNote ?? null,
        reviewed: e.reviewed, published: true,
      };
      await db.exerciseTranslation.upsert({
        where: { exerciseId_locale: { exerciseId: e.id, locale } },
        update: text,
        create: { exerciseId: e.id, locale, ...text },
      });
    }
  }

  console.log(`Готово. Логины: admin.demo, doctor.demo, doctor2.demo (другая клиника), mama.demo. Пароль: ${password}`);
}

main().finally(() => db.$disconnect());
