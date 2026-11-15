import { AppError } from "@/domain/errors";
import type { Locale } from "@/domain/types";
import { db } from "@/infrastructure/db";

type Row = Awaited<ReturnType<typeof load>>[number];
type Cue = { atSec: number; phase: string; text: string };

const load = (id?: string) =>
  db.exercise.findMany({
    where: { published: true, ...(id && { id }) },
    orderBy: { sortOrder: "asc" },
    include: { translations: { where: { published: true } } },
  });

// Файлы моделей и озвучки общие для всех языков; тексты — отдельно на каждый язык.
const assetUrl = (path: string | null) =>
  path && !/^https?:\/\//.test(path) && process.env.ASSET_BASE_URL ? `${process.env.ASSET_BASE_URL.replace(/\/$/, "")}${path}` : path;

// Форма ответа совпадает с тем, что ждёт 3D-плеер (entities/exercise во фронте):
// visual, locked, durationSec, а из текста — title, description, steps, cues, machineTranslated, unlockNote.
function view(e: Row, locale: Locale) {
  const t = e.translations.find((x) => x.locale === locale);
  return {
    id: e.id,
    locale,
    durationSec: e.durationSec,
    // Какую процедурную сцену рисует плеер: "hammock" | "mannequin". null — сцены нет.
    visual: e.visual,
    locked: e.locked,
    // 3D есть, если задана процедурная сцена или файл модели. Иначе фронт честно показывает, что 3D ещё не готово.
    has3d: e.visual !== null || e.modelUrl !== null,
    modelUrl: assetUrl(e.modelUrl),
    animationName: e.animationName,
    // Если текста на выбранном языке нет, другой язык незаметно не подставляем.
    available: Boolean(t),
    availableLocales: e.translations.map((x) => x.locale).sort(),
    title: t?.title ?? null,
    description: t?.description ?? null,
    steps: (t?.instructions as string[] | undefined) ?? [],
    cues: (t?.breathingCues as Cue[] | undefined) ?? [],
    // true — черновик машинного перевода; показывать с пометкой.
    machineTranslated: t?.machineTranslated ?? false,
    unlockNote: t?.unlockNote ?? null,
    audioUrl: assetUrl(t?.audioUrl ?? null),
    contraindications: t?.contraindications ?? null,
    // false = демонстрационный пример, не проверенный специалистом.
    reviewed: t?.reviewed ?? false,
  };
}

export async function listExercises(locale: Locale) {
  return { items: (await load()).map((e) => view(e, locale)) };
}

export async function getExercise(id: string, locale: Locale) {
  const [exercise] = await load(id);
  if (!exercise) throw new AppError("NOT_FOUND");
  return view(exercise, locale);
}
