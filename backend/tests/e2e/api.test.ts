// Сквозные проверки по критериям приёмки из ALDI_TECH_PLAN.md (§10, §12.6, §16).
// Нужен запущенный сервер с заглушками внешних сервисов и засеянной базой:
//   npm run db:dev                      (в отдельном терминале)
//   npx prisma migrate deploy && npm run seed
//   AI_MODE=fake FAKE_NOTIFY_FAIL=true TOOL_SECRET=test-tool CORS_ORIGINS=http://app.test npx next dev -p 3987
//   npm run test:e2e
import { beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE ?? "http://localhost:3987";
const ORIGIN = "http://app.test";
const PASSWORD = process.env.SEED_PASSWORD ?? "aldi-demo-2026";
const TOOL = { "X-Tool-Secret": "test-tool", "Content-Type": "application/json" };

type Res = { status: number; data: any; error: any; headers: Headers };

function client() {
  let cookie = "";
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> => {
    const res = await fetch(BASE + path, {
      method,
      headers: { Origin: ORIGIN, "Content-Type": "application/json", ...(cookie && { Cookie: cookie }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json.data, error: json.error, headers: res.headers };
  };
  return {
    get: (p: string, h?: Record<string, string>) => call("GET", p, undefined, h),
    post: (p: string, b?: unknown, h?: Record<string, string>) => call("POST", p, b ?? {}, h),
    patch: (p: string, b: unknown) => call("PATCH", p, b),
    del: (p: string) => call("DELETE", p),
    cookie: () => cookie,
    login: (login: string, password = PASSWORD) => call("POST", "/api/auth/login", { login, password }),
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);
const doctor = client();
const otherDoctor = client();
const mom = client();
const otherMom = client();
let doctorId = "";
let momLogin = "";

async function newPatient(c: ReturnType<typeof client>, name: string) {
  const created = await doctor.post("/api/doctor/patients", { displayName: name, locale: "ru" });
  expect(created.status).toBe(200);
  const login = `mom-${uid()}`;
  const accepted = await c.post("/api/auth/invitations/accept", { token: created.data.invitation.token, login, password: "long-password-1" });
  expect(accepted.status).toBe(200);
  return { login, patientId: created.data.patient.id as string, token: created.data.invitation.token as string };
}

async function readyIntake(c: ReturnType<typeof client>, text = "После родов подтекает, когда чихаю.") {
  const intake = await c.post("/api/intakes", { locale: "ru", consentVersion: "v1", consent: true, country: "KZ" });
  await c.post(`/api/intakes/${intake.data.id}/messages`, { message: text, clientMessageId: uid() });
  const done = await c.post(`/api/intakes/${intake.data.id}/complete`, { expectedVersion: 0 });
  expect(done.status).toBe(200);
  return intake.data.id as string;
}

beforeAll(async () => {
  expect((await fetch(`${BASE}/api/health`)).status).toBe(200);
  expect((await doctor.login("doctor.demo")).status).toBe(200);
  expect((await otherDoctor.login("doctor2.demo")).status).toBe(200);
  doctorId = (await doctor.get("/api/auth/me")).data.doctor.id;
  momLogin = (await newPatient(mom, "Тестовая пациентка (вымышленная)")).login;
  await newPatient(otherMom, "Другая пациентка (вымышленная)");
});

describe("вход и роли", () => {
  it("неверный логин и неверный пароль дают одинаковый ответ", async () => {
    const a = await client().login("no-such-user", "x");
    const b = await client().login("doctor.demo", "wrong-password");
    expect([a.status, a.error.code, a.error.message]).toEqual([401, "INVALID_CREDENTIALS", b.error.message]);
    expect(b.status).toBe(401);
  });

  it("сессия — HttpOnly-cookie, токена в теле ответа нет", async () => {
    const c = client();
    const res = await c.login("doctor.demo");
    expect(res.headers.get("set-cookie")).toMatch(/aldi_session=.+HttpOnly/);
    expect(res.data.token).toBeUndefined();
    expect(res.data.user.role).toBe("DOCTOR");
  });

  it("без сессии — 401, пациентка в кабинет врача — 403, врач в разговоры пациентки — 403", async () => {
    expect((await client().get("/api/auth/me")).status).toBe(401);
    expect((await mom.get("/api/doctor/patients")).status).toBe(403);
    expect((await doctor.post("/api/intakes", { locale: "ru", consentVersion: "v1", consent: true })).status).toBe(403);
  });

  it("изменяющий запрос с cookie без Origin или с чужого сайта отклоняется (CSRF)", async () => {
    for (const headers of [{}, { Origin: "http://evil.test" }] as Record<string, string>[]) {
      const res = await fetch(`${BASE}/api/intakes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: mom.cookie(), ...headers },
        body: JSON.stringify({ locale: "ru", consentVersion: "v1", consent: true }),
      });
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("CSRF_REJECTED");
    }
  });

  it("текст ошибки приходит на языке запроса, код не меняется", async () => {
    const en = await client().get("/api/auth/me", { "Accept-Language": "en" });
    const kk = await client().get("/api/auth/me", { "Accept-Language": "kk-KZ" });
    expect(en.error).toEqual({ code: "UNAUTHENTICATED", message: "Please sign in." });
    expect(kk.error.code).toBe("UNAUTHENTICATED");
    expect(kk.error.message).not.toBe(en.error.message);
  });

  it("подмена роли или пациентки в теле запроса не помогает", async () => {
    const res = await mom.post("/api/intakes", { locale: "ru", consentVersion: "v1", consent: true, patientId: "x", role: "DOCTOR" });
    expect([res.status, res.error.code]).toEqual([400, "INVALID_INPUT"]);
  });
});

describe("приглашения", () => {
  it("приглашение одноразовое", async () => {
    const created = await doctor.post("/api/doctor/patients", { displayName: "Одноразовая (вымышленная)", locale: "kk" });
    const token = created.data.invitation.token;
    const first = await client().post("/api/auth/invitations/accept", { token, login: `m-${uid()}`, password: "long-password-1" });
    const second = await client().post("/api/auth/invitations/accept", { token, login: `m-${uid()}`, password: "long-password-1" });
    expect(first.status).toBe(200);
    expect(first.data.user).toMatchObject({ role: "PATIENT", locale: "kk" });
    expect([second.status, second.error.code]).toEqual([400, "INVITATION_INVALID"]);
  });

  it("короткий пароль и занятый логин отклоняются", async () => {
    const created = await doctor.post("/api/doctor/patients", { displayName: "Проверка (вымышленная)", locale: "ru" });
    const token = created.data.invitation.token;
    expect((await client().post("/api/auth/invitations/accept", { token, login: `m-${uid()}`, password: "short" })).status).toBe(400);
    const taken = await client().post("/api/auth/invitations/accept", { token, login: momLogin, password: "long-password-1" });
    expect([taken.status, taken.error.code]).toEqual([409, "LOGIN_TAKEN"]);
  });

  it("повторное приглашение отзывает старое, меняет пароль и закрывает старые сессии", async () => {
    const c = client();
    const p = await newPatient(c, "Восстановление (вымышленная)");
    expect((await c.get("/api/auth/me")).status).toBe(200);
    const again = await doctor.post(`/api/doctor/patients/${p.patientId}/invitations`);
    const stale = await client().post("/api/auth/invitations/accept", { token: p.token, login: p.login, password: "new-password-22" });
    expect(stale.status).toBe(400);
    const fresh = await client().post("/api/auth/invitations/accept", { token: again.data.invitation.token, login: p.login, password: "new-password-22" });
    expect(fresh.status).toBe(200);
    expect((await c.get("/api/auth/me")).status).toBe(401);
    expect((await client().login(p.login, "long-password-1")).status).toBe(401);
    expect((await client().login(p.login, "new-password-22")).status).toBe(200);
  });

  it("врач видит профиль добавленной пациентки, врач другой клиники — нет", async () => {
    const list = await doctor.get("/api/doctor/patients?search=Тестовая");
    expect(list.data.items.length).toBeGreaterThan(0);
    const id = list.data.items[0].id;
    expect((await doctor.get(`/api/doctor/patients/${id}`)).data.sharedCards).toEqual([]);
    expect((await otherDoctor.get(`/api/doctor/patients/${id}`)).status).toBe(404);
    expect((await otherDoctor.patch(`/api/doctor/patients/${id}`, { displayName: "x" })).status).toBe(404);
    expect((await otherDoctor.post(`/api/doctor/patients/${id}/invitations`)).status).toBe(404);
  });

  it("пациентка видит, какому врачу может отправить карточку", async () => {
    const me = await mom.get("/api/auth/me");
    expect(me.data.doctors.map((d: any) => d.id)).toEqual([doctorId]);
  });
});

describe("разговор и карточка", () => {
  let id = "";

  it("без согласия и с неподдерживаемым языком разговор не создаётся", async () => {
    const noConsent = await mom.post("/api/intakes", { locale: "ru", consentVersion: "v1", consent: false });
    const badLocale = await mom.post("/api/intakes", { locale: "de", consentVersion: "v1", consent: true });
    expect([noConsent.status, noConsent.error.code]).toEqual([400, "CONSENT_REQUIRED"]);
    expect([badLocale.status, badLocale.error.code]).toEqual([400, "UNSUPPORTED_LOCALE"]);
  });

  it("повтор создания с тем же Idempotency-Key возвращает тот же разговор", async () => {
    const key = { "Idempotency-Key": uid() };
    const body = { locale: "ru", consentVersion: "v1", consent: true, country: "kz" };
    const a = await mom.post("/api/intakes", body, key);
    const b = await mom.post("/api/intakes", body, key);
    expect(a.data).toEqual({ id: b.data.id, status: "IN_PROGRESS" });
    id = a.data.id;
  });

  it("текстовый диалог: ответ помощницы; повтор с тем же clientMessageId не создаёт дублей", async () => {
    const body = { message: "После родов подтекает, когда чихаю.", clientMessageId: uid() };
    const a = await mom.post(`/api/intakes/${id}/messages`, body);
    const b = await mom.post(`/api/intakes/${id}/messages`, body);
    expect(a.status).toBe(200);
    expect(a.data.assistantMessage.role).toBe("assistant");
    expect(b.data.message.id).toBe(a.data.message.id);
    expect(b.data.assistantMessage.id).toBe(a.data.assistantMessage.id);
    expect((await mom.get(`/api/intakes/${id}`)).data.messages).toHaveLength(2);
  });

  it("чужая пациентка не может открыть, дополнить, завершить или удалить разговор", async () => {
    expect((await otherMom.get(`/api/intakes/${id}`)).status).toBe(404);
    expect((await otherMom.post(`/api/intakes/${id}/messages`, { message: "x", clientMessageId: uid() })).status).toBe(404);
    expect((await otherMom.post(`/api/intakes/${id}/complete`, { expectedVersion: 0 })).status).toBe(404);
    expect((await otherMom.post(`/api/voice/session`, { intakeId: id })).status).toBe(404);
    expect((await otherMom.del(`/api/intakes/${id}`)).status).toBe(404);
  });

  it("завершение формирует черновик и ничего не отправляет врачу", async () => {
    const done = await mom.post(`/api/intakes/${id}/complete`, { expectedVersion: 0 });
    expect(done.data).toMatchObject({ status: "READY", processingStatus: "DONE" });
    expect(done.data.card.version).toBe(1);
    expect((await doctor.get("/api/doctor/intakes")).data.items.map((i: any) => i.intakeId)).not.toContain(id);
    expect((await doctor.get(`/api/doctor/intakes/${id}`)).status).toBe(404);
    expect((await doctor.post(`/api/intakes/${id}/translations`, { targetLocale: "en" })).status).toBe(404);
  });

  it("цитаты: слова пациентки подтверждены, выдуманные и слова помощницы — нет", async () => {
    const { fields } = (await mom.get(`/api/intakes/${id}`)).data.card;
    expect(fields.complaint).toMatchObject({ quoteVerified: true, editedByPatient: false });
    expect(fields.frequency.quoteVerified).toBe(false);
    expect(fields.impact.quoteVerified).toBe(false);
    expect(fields.triggers).toMatchObject({ value: null, quote: null });
  });

  it("повторный complete возвращает ту же карточку; после завершения писать нельзя", async () => {
    const again = await mom.post(`/api/intakes/${id}/complete`, { expectedVersion: 0 });
    expect(again.data.card.version).toBe(1);
    const late = await mom.post(`/api/intakes/${id}/messages`, { message: "ещё", clientMessageId: uid() });
    expect([late.status, late.error.code]).toEqual([409, "INTAKE_CLOSED"]);
  });

  it("правка создаёт новую версию; исправленное поле помечено и не считается подтверждённой цитатой", async () => {
    const edited = await mom.patch(`/api/intakes/${id}/card`, { expectedVersion: 1, changes: { fields: { complaint: "подтекание при чихании" } } });
    expect(edited.data.card.version).toBe(2);
    expect(edited.data.card.fields.complaint).toMatchObject({ value: "подтекание при чихании", editedByPatient: true, quoteVerified: false });
    const stale = await mom.patch(`/api/intakes/${id}/card`, { expectedVersion: 1, changes: { fields: { complaint: "x" } } });
    expect([stale.status, stale.error.code]).toEqual([409, "VERSION_CONFLICT"]);
    const unknown = await mom.patch(`/api/intakes/${id}/card`, { expectedVersion: 2, changes: { fields: { diagnosis: "x" } } });
    expect(unknown.status).toBe(400);
  });

  it("отправка: нужно отдельное согласие, актуальная версия и связанный врач", async () => {
    const otherDoctorId = (await otherDoctor.get("/api/auth/me")).data.doctor.id;
    const noConsent = await mom.post(`/api/intakes/${id}/share`, { cardVersion: 2, doctorId, consent: false });
    const oldVersion = await mom.post(`/api/intakes/${id}/share`, { cardVersion: 1, doctorId, consent: true });
    const stranger = await mom.post(`/api/intakes/${id}/share`, { cardVersion: 2, doctorId: otherDoctorId, consent: true });
    expect([noConsent.status, noConsent.error.code]).toEqual([400, "CONSENT_REQUIRED"]);
    expect([oldVersion.status, oldVersion.error.code]).toEqual([409, "VERSION_CONFLICT"]);
    expect([stranger.status, stranger.error.code]).toEqual([403, "FORBIDDEN"]);
    expect((await doctor.get("/api/doctor/intakes")).data.items.map((i: any) => i.intakeId)).not.toContain(id);
  });

  it("после отправки карточку видит только выбранный врач; повтор не создаёт дубль; сбой уведомления отправку не отменяет", async () => {
    const [a, b] = await Promise.all([
      mom.post(`/api/intakes/${id}/share`, { cardVersion: 2, doctorId, consent: true }),
      mom.post(`/api/intakes/${id}/share`, { cardVersion: 2, doctorId, consent: true }),
    ]);
    const c = await mom.post(`/api/intakes/${id}/share`, { cardVersion: 2, doctorId, consent: true });
    expect(a.status).toBe(200);
    expect(new Set([a.data.shareId, b.data.shareId, c.data.shareId]).size).toBe(1);
    expect(c.data).toMatchObject({ status: "SHARED", notification: "FAILED" });

    const list = await doctor.get("/api/doctor/intakes");
    expect(list.data.items.filter((i: any) => i.intakeId === id)).toHaveLength(1);
    const seen = await doctor.get(`/api/doctor/intakes/${id}`);
    expect(seen.data.card.version).toBe(2);
    expect(seen.data.card.fields.complaint.editedByPatient).toBe(true);
    expect(seen.data.messages).toBeUndefined();
    expect((await otherDoctor.get(`/api/doctor/intakes/${id}`)).status).toBe(404);
    expect((await otherDoctor.get("/api/doctor/intakes")).data.items.map((i: any) => i.intakeId)).not.toContain(id);
    expect((await otherDoctor.patch(`/api/doctor/intakes/${id}`, { reviewed: true })).status).toBe(404);
  });

  it("правка после отправки — новый черновик; врач по-прежнему видит отправленную версию", async () => {
    const edited = await mom.patch(`/api/intakes/${id}/card`, { expectedVersion: 2, changes: { doctorQuestions: ["Нужно ли обследование?"] } });
    expect(edited.data.card.version).toBe(3);
    const seen = await doctor.get(`/api/doctor/intakes/${id}`);
    expect(seen.data.card.version).toBe(2);
    expect(seen.data.newerDraftExists).toBe(true);
  });

  it("перевод помечен как машинный и привязан к версии; оригинальные цитаты не меняются", async () => {
    const before = (await mom.get(`/api/intakes/${id}`)).data.card;
    const forMom = await mom.post(`/api/intakes/${id}/translations`, { targetLocale: "en" });
    expect(forMom.data).toMatchObject({ cardVersion: 3, locale: "en", sourceLocale: "ru", machineTranslated: true });
    expect(forMom.data.fields.complaint.quoteVerified).toBeUndefined();
    const forDoctor = await doctor.post(`/api/intakes/${id}/translations`, { targetLocale: "kk" });
    expect(forDoctor.data.cardVersion).toBe(2);
    expect((await mom.post(`/api/intakes/${id}/translations`, { targetLocale: "ru" })).status).toBe(400);
    expect((await mom.post(`/api/intakes/${id}/translations`, { targetLocale: "fr" })).error.code).toBe("UNSUPPORTED_LOCALE");
    expect((await mom.get(`/api/intakes/${id}`)).data.card).toEqual(before);
  });

  it("врач отмечает карточку просмотренной", async () => {
    const res = await doctor.patch(`/api/doctor/intakes/${id}`, { reviewed: true });
    expect(res.data.status).toBe("REVIEWED");
    expect((await doctor.get(`/api/doctor/patients?search=Тестовая`)).status).toBe(200);
  });

  it("удаление убирает разговор у пациентки и карточку у врача", async () => {
    const res = await mom.del(`/api/intakes/${id}`);
    expect(res.data.deleted).toBe(true);
    expect((await mom.get(`/api/intakes/${id}`)).status).toBe(404);
    expect((await doctor.get(`/api/doctor/intakes/${id}`)).status).toBe(404);
  });
});

describe("срочность и сбои", () => {
  it("опасное сообщение: заготовленный ответ и флаг срочности; врач до отправки ничего не видит", async () => {
    const intake = await mom.post("/api/intakes", { locale: "en", consentVersion: "v1", consent: true });
    const res = await mom.post(`/api/intakes/${intake.data.id}/messages`, { message: "Прокладка промокает за час", clientMessageId: uid() });
    expect(res.data).toMatchObject({ urgent: true, urgentReason: "bleeding" });
    expect(res.data.assistantMessage.text).toMatch(/emergency services/);
    expect((await doctor.get(`/api/doctor/intakes/${intake.data.id}`)).status).toBe(404);
    // Срочность — отдельный признак: статус разговора не меняется.
    expect((await mom.get(`/api/intakes/${intake.data.id}`)).data).toMatchObject({ status: "IN_PROGRESS", urgent: true });
  });

  it("сбой модели: разговор сохранён, обработку можно повторить", async () => {
    const intake = await mom.post("/api/intakes", { locale: "ru", consentVersion: "v1", consent: true });
    await mom.post(`/api/intakes/${intake.data.id}/messages`, { message: "__LLM_FAIL__ болит спина", clientMessageId: uid() });
    const failed = await mom.post(`/api/intakes/${intake.data.id}/complete`, { expectedVersion: 0 });
    expect([failed.status, failed.error.code]).toEqual([503, "LLM_UNAVAILABLE"]);
    const state = (await mom.get(`/api/intakes/${intake.data.id}`)).data;
    expect(state).toMatchObject({ status: "IN_PROGRESS", processingStatus: "FAILED", card: null });
    expect(state.messages).toHaveLength(2);
  });

  it("пустой разговор завершить нельзя", async () => {
    const intake = await mom.post("/api/intakes", { locale: "ru", consentVersion: "v1", consent: true });
    const res = await mom.post(`/api/intakes/${intake.data.id}/complete`, { expectedVersion: 0 });
    expect([res.status, res.error.code]).toEqual([409, "EMPTY_CONVERSATION"]);
  });
});

describe("голос и инструменты агента", () => {
  let id = "";
  let vars: { intake_id: string; session_token: string; locale: string };
  const tool = (path: string, body: unknown, headers = TOOL) =>
    fetch(`${BASE}/api/tools/${path}`, { method: "POST", headers, body: JSON.stringify(body) });

  it("сеанс привязан к разговору; ключ провайдера во фронт не попадает", async () => {
    id = (await mom.post("/api/intakes", { locale: "uz", consentVersion: "v1", consent: true })).data.id;
    const res = await mom.post("/api/voice/session", { intakeId: id });
    expect(res.status).toBe(200);
    vars = res.data.dynamicVariables;
    expect(vars).toMatchObject({ intake_id: id, locale: "uz" });
    expect(Object.keys(res.data).sort()).toEqual(["dynamicVariables", "sessionUrl"]);
  });

  it("инструменты: без секрета — 401, с чужим токеном сеанса — 404, неизвестное поле — 400", async () => {
    const ok = { intake_id: id, session_token: vars.session_token, field: "complaint", value: "подтекание", quote: "подтекает" };
    expect((await tool("update-intake", ok, { "Content-Type": "application/json" } as any)).status).toBe(401);
    expect((await tool("update-intake", { ...ok, session_token: "wrong-token" })).status).toBe(404);
    expect((await tool("flag-urgent", { intake_id: id, session_token: "wrong-token", reason: "x" })).status).toBe(404);
    expect((await tool("update-intake", { ...ok, field: "diagnosis" })).status).toBe(400);
    expect((await tool("update-intake", ok)).status).toBe(200);
    expect((await mom.get(`/api/intakes/${id}`)).data.preview.complaint.value).toBe("подтекание");
  });

  it("флаг срочности от агента виден пациентке", async () => {
    expect((await tool("flag-urgent", { intake_id: id, session_token: vars.session_token, reason: "bleeding" })).status).toBe(200);
    expect((await mom.get(`/api/intakes/${id}`)).data).toMatchObject({ urgent: true, urgentReason: "bleeding" });
  });

  it("транскрипт берётся у провайдера; чужой разговор не принимается", async () => {
    const foreign = await mom.post(`/api/intakes/${id}/complete`, { expectedVersion: 0, conversationId: "fake:another-intake" });
    expect([foreign.status, foreign.error.code]).toEqual([403, "FORBIDDEN"]);
    const done = await mom.post(`/api/intakes/${id}/complete`, { expectedVersion: 0, conversationId: `fake:${id}` });
    expect(done.data.status).toBe("READY");
    expect(done.data.card.fields.complaint.quoteVerified).toBe(true);
    expect((await mom.get(`/api/intakes/${id}`)).data.messages).toHaveLength(2);
  });

  it("опоздавшее обновление превью не меняет готовую карточку", async () => {
    const before = (await mom.get(`/api/intakes/${id}`)).data.card;
    const late = await tool("update-intake", { intake_id: id, session_token: vars.session_token, field: "complaint", value: "другое", quote: "другое" });
    expect((await late.json()).data.ignored).toBe(true);
    expect((await mom.get(`/api/intakes/${id}`)).data.card).toEqual(before);
  });
});

describe("упражнения", () => {
  it("каталог из репозитория 3D: сцена, блокировка, шаги и подсказки с фазами", async () => {
    const ru = await mom.get("/api/exercises?locale=ru");
    expect(ru.data.items.map((e: any) => [e.id, e.visual, e.locked])).toEqual([
      ["pf-slow", "hammock", false],
      ["pelvic-tilt", "mannequin", false],
      ["bridge", "mannequin", true],
    ]);
    const first = ru.data.items[0];
    expect(first).toMatchObject({ available: true, has3d: true, durationSec: 80, reviewed: false, machineTranslated: true, modelUrl: null });
    expect(first.steps.length).toBeGreaterThan(0);
    expect(first.cues[0]).toEqual({ atSec: 0, phase: "inhale", text: "Вдох" });
    expect(ru.data.items[2].unlockNote).toMatch(/Откроется/);
  });

  it("тексты отдаются на выбранном языке; казахский не помечен как машинный перевод", async () => {
    const kk = await mom.get("/api/exercises/pf-slow?locale=kk");
    const en = await mom.get("/api/exercises/pf-slow?locale=en");
    expect(kk.data).toMatchObject({ available: true, machineTranslated: false, availableLocales: ["en", "kk", "ru", "uz"] });
    expect(en.data.machineTranslated).toBe(true);
    expect(kk.data.title).not.toBe(en.data.title);
    // Тайминги и фазы одинаковы на всех языках, отличается только текст.
    const timing = (d: any) => d.cues.map((c: any) => [c.atSec, c.phase]);
    expect(timing(kk.data)).toEqual(timing(en.data));
  });

  it("неподдерживаемый язык и неизвестное упражнение", async () => {
    expect((await mom.get("/api/exercises?locale=de")).error.code).toBe("UNSUPPORTED_LOCALE");
    expect((await mom.get("/api/exercises/nope?locale=ru")).status).toBe(404);
    expect((await client().get("/api/exercises?locale=ru")).status).toBe(401);
  });
});

describe("сессии", () => {
  it("смена языка сохраняется; выход закрывает сессию", async () => {
    const c = client();
    await newPatient(c, "Выход (вымышленная)");
    expect((await c.patch("/api/auth/me", { locale: "en" })).data.locale).toBe("en");
    expect((await c.get("/api/auth/me")).data.user.locale).toBe("en");
    const stolen = c.cookie();
    await c.post("/api/auth/logout");
    const res = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: stolen } });
    expect(res.status).toBe(401);
  });

  it("запрос восстановления пароля отвечает одинаково для любого логина", async () => {
    const a = await client().post("/api/auth/password-reset", { login: "doctor.demo" });
    const b = await client().post("/api/auth/password-reset", { login: "no-such-user" });
    expect(a.data).toEqual(b.data);
  });

  it("после пяти неверных попыток вход для этого логина временно блокируется", async () => {
    const login = `locked-${uid()}`;
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await client().login(login, "wrong")).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });
});
