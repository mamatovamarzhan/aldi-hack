import { createFileRoute } from "@tanstack/react-router";

import { SkyBackground } from "@/shared/ui/sky/SkyBackground";
import { UrgentBanner } from "@/shared/ui/patient/UrgentBanner";
import { Button } from "@/components/ui/button";
import { LayoutGroup } from "motion/react";

export const Route = createFileRoute("/styleguide")({
  head: () => ({
    meta: [
      { title: "Aldi" },
      { name: "description", content: "Aldi" },
      { property: "og:title", content: "Aldi" },
      { property: "og:description", content: "Aldi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Styleguide,
});

function Swatch({ name, cls }: { name: string; cls: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full border ${cls}`} />
      <span className="text-sm text-muted-foreground">{name}</span>
    </div>
  );
}

function Styleguide() {
  return (
    <div>
      {/* PATIENT */}
      <section className="theme-patient relative min-h-screen px-6 py-12">
        <SkyBackground variant="full" />
        <LayoutGroup><div className="container-patient flex flex-col items-center gap-6">
          <div className="card-patient flex w-full flex-wrap justify-center gap-2 p-3">
            <span className="rounded-full bg-sky-light px-4 py-1.5 text-sm font-bold text-foreground">
              Метка неба
            </span>
            <span className="rounded-full bg-meadow-light px-4 py-1.5 text-sm font-bold text-foreground">
              Метка луга
            </span>
            <span className="rounded-full bg-lilac-mist px-4 py-1.5 text-sm font-bold text-foreground">
              Метка сирени
            </span>
          </div>

          <div className="card-patient w-full space-y-3 p-5">
            <div>
              <p className="text-sm text-text-faint">Цитата</p>
              <p className="italic text-quote">«пример цитаты»</p>
            </div>
            <div>
              <p className="text-sm text-text-faint">Пусто</p>
              <p className="text-missing">Не указано</p>
            </div>
            <span className="inline-block rounded-full border border-warn px-3 py-1 text-sm font-bold text-uncertain-foreground">
              ⚠ Проверьте
            </span>
          </div>

          <UrgentBanner />
          <Button variant="hangup" size="patient" className="w-full">Завершить</Button>

          <div className="sheet-bottom w-full p-5 text-center text-sm text-text-muted">
            Нижняя шторка — скругление 28px сверху
          </div>

          <div className="card-patient grid w-full grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Swatch name="Фон #FBF9F4" cls="bg-background" />
            <Swatch name="Панель #F3EFFA" cls="bg-panel" />
            <Swatch name="Поверхность #FFFFFF" cls="bg-surface" />
            <Swatch name="Сирень #7A64B8" cls="bg-primary" />
            <Swatch name="Нажатый #6550A3" cls="bg-primary-pressed" />
            <Swatch name="Оттенок #EDE6FA" cls="bg-primary-tint" />
            <Swatch name="Дымка #DCD0F5" cls="bg-lilac-mist" />
            <Swatch name="Небо светлое #BFE0F5" cls="bg-sky-light" />
            <Swatch name="Небо #8EC5E8" cls="bg-sky-mid" />
            <Swatch name="Небо глубокое #2F6A98" cls="bg-sky-deep" />
            <Swatch name="Луг светлый #CFE6D3" cls="bg-meadow-light" />
            <Swatch name="Шалфей #A9CBB0" cls="bg-sage" />
            <Swatch name="Луг #8DBF9A" cls="bg-meadow" />
            <Swatch name="Луг глубокий #2F7A5B" cls="bg-meadow-deep" />
            <Swatch name="Текст #2A2438" cls="bg-foreground" />
            <Swatch name="Приглушённый #6E6880" cls="bg-text-muted" />
            <Swatch name="Слабый #A39DB3" cls="bg-text-faint" />
            <Swatch name="Рамка #E7E2F0" cls="bg-border" />
            <Swatch name="Успех #2F7A5B" cls="bg-success" />
            <Swatch name="Внимание #B8860B" cls="bg-warn" />
            <Swatch name="Опасность #C9393F" cls="bg-danger" />
            <Swatch name="Фон опасности #FDECEC" cls="bg-danger-bg" />
          </div>
        </div></LayoutGroup>
      </section>

      {/* DOCTOR */}
      <section className="theme-doctor relative min-h-screen px-8 py-10">
        <div className="mx-auto max-w-[210mm] space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Врач</p>
          <h2 className="text-lg font-semibold">Заголовок раздела</h2>
          <table className="w-full border-collapse border text-left">
            <thead className="bg-secondary">
              <tr>
                <th className="border px-2 py-1 font-medium">Поле</th>
                <th className="border px-2 py-1 font-medium">Значение</th>
                <th className="border px-2 py-1 font-medium">Цитата</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1">Пример</td>
                <td className="border px-2 py-1">Значение</td>
                <td className="border px-2 py-1 font-mono text-xs">«пример цитаты»</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Пример</td>
                <td className="border px-2 py-1 text-missing">Не указано</td>
                <td className="border px-2 py-1 text-missing">—</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Пример</td>
                <td className="border px-2 py-1">
                  <span className="border border-foreground px-1 font-mono text-xs">⚠ Проверьте</span>
                </td>
                <td className="border px-2 py-1 font-mono text-xs">«пример цитаты»</td>
              </tr>
            </tbody>
          </table>
          <button className="no-print border border-foreground bg-primary px-3 py-1.5 text-primary-foreground">
            Печать
          </button>
        </div>
      </section>
    </div>
  );
}
