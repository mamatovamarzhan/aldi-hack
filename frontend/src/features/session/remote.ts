// Server side of the patient session: conversation, card, sending to the doctor.
import { api, ApiError, newId } from '@/shared/api/client';
import { FIELDS, type Card, type CardField, type FieldId } from './card';

type ServerField = { value: string | null; quote: string | null; quoteVerified: boolean; editedByPatient: boolean };
type ServerCard = { version: number; sourceLocale: string; fields: Record<string, ServerField>; doctorQuestions: string[] };
type ServerMessage = { id: string; role: 'patient' | 'assistant'; text: string };
type ServerIntake = {
  id: string;
  status: 'IN_PROGRESS' | 'READY' | 'SHARED' | 'REVIEWED';
  urgent: boolean;
  createdAt: string;
  messages: ServerMessage[];
  card: ServerCard | null;
  shares: { sharedAt: string; cardVersion: number }[];
};
export type IntakeSummary = { id: string; status: ServerIntake['status']; urgent: boolean; version: number; createdAt: string };

export const CONSENT_VERSION = 'v1';
const UI_LOCALE = 'ru';

function toField(f: ServerField | undefined): CardField {
  if (!f) return { value: null, quote: null, edited: false, uncertain: false };
  return {
    value: f.value,
    quote: f.quote,
    edited: f.editedByPatient,
    // «Проверьте»: the model gave a quote that is not literally in the patient's words.
    uncertain: f.value !== null && !f.editedByPatient && !f.quoteVerified,
  };
}

function toCard(intake: ServerIntake): Card {
  const fields = Object.fromEntries(FIELDS.map(f => [f.id, toField(intake.card?.fields[f.id])])) as Record<FieldId, CardField>;
  const dialogue = intake.messages.some(m => m.role === 'assistant');
  const lines = intake.messages.map(m => (dialogue ? `${m.role === 'patient' ? 'Вы' : 'Aldi'}: ${m.text}` : m.text));
  const version = intake.card?.version ?? 0;
  const sent = intake.shares.find(s => s.cardVersion === version);
  return {
    intakeId: intake.id,
    version,
    sourceLocale: intake.card?.sourceLocale ?? UI_LOCALE,
    transcript: lines.join('\n'),
    fields,
    questions: intake.card?.doctorQuestions ?? [],
    urgent: intake.urgent,
    sentAt: sent?.sharedAt ?? null,
    changedAfterSend: !sent && intake.shares.length > 0,
    createdAt: intake.createdAt,
  };
}

const createIntake = () =>
  api<{ id: string }>('POST', '/api/intakes', { locale: UI_LOCALE, consentVersion: CONSENT_VERSION, consent: true, country: 'KZ' }, { 'Idempotency-Key': newId() });

const getIntake = (id: string) => api<ServerIntake>('GET', `/api/intakes/${id}`);
export const fetchCard = async (intakeId: string): Promise<Card> => toCard(await getIntake(intakeId));

// ---------- What the patient has right now (home screen, «Моя карточка») ----------

export type Overview = {
  /** Unfinished text conversation that already has messages. */
  unfinished: { intakeId: string } | null;
  /** Latest ready card. */
  card: Card | null;
};

export async function loadOverview(): Promise<Overview> {
  const { items } = await api<{ items: IntakeSummary[] }>('GET', '/api/intakes');
  const withCard = items.find(i => i.version > 0);
  const open = items.find(i => i.status === 'IN_PROGRESS');
  const [card, openIntake] = await Promise.all([
    withCard ? fetchCard(withCard.id) : null,
    // Only offer to continue a conversation in which something was actually said.
    open && (!withCard || open.createdAt > withCard.createdAt) ? getIntake(open.id) : null,
  ]);
  return { card, unfinished: openIntake && openIntake.messages.length > 0 ? { intakeId: openIntake.id } : null };
}

// ---------- Text chat ----------

export type ChatMessage = { id: string; role: 'patient' | 'assistant'; text: string };
export type ChatState = { intakeId: string; messages: ChatMessage[]; urgent: boolean };

export async function resumeChat(intakeId: string): Promise<ChatState | null> {
  const intake = await getIntake(intakeId);
  if (intake.status !== 'IN_PROGRESS') return null;
  return { intakeId, messages: intake.messages, urgent: intake.urgent };
}

export const startChat = async (): Promise<string> => (await createIntake()).id;

/** `clientMessageId` makes a retry safe: the server never stores the same message twice. */
export function sendChatMessage(intakeId: string, text: string, clientMessageId: string) {
  return api<{ message: ChatMessage; assistantMessage: ChatMessage; urgent: boolean }>('POST', `/api/intakes/${intakeId}/messages`, { message: text, clientMessageId });
}

export async function completeChat(intakeId: string): Promise<Card> {
  await api('POST', `/api/intakes/${intakeId}/complete`, { expectedVersion: 0 });
  return fetchCard(intakeId);
}

// ---------- Card ----------

export async function saveField(card: Card, id: FieldId, value: string): Promise<Card> {
  if (!card.intakeId) return card;
  await api('PATCH', `/api/intakes/${card.intakeId}/card`, { expectedVersion: card.version, changes: { fields: { [id]: value.trim() || null } } });
  return fetchCard(card.intakeId);
}

/** Called only after the patient confirmed the recipient: that confirmation is the consent to share this version. */
export async function sendToDoctor(card: Card, doctorId: string): Promise<Card> {
  if (!card.intakeId) return card;
  await api('POST', `/api/intakes/${card.intakeId}/share`, { cardVersion: card.version, doctorId, consent: true });
  return fetchCard(card.intakeId);
}

export async function removeIntake(card: Card) {
  if (card.intakeId) await api('DELETE', `/api/intakes/${card.intakeId}`);
}

export type CardTranslation = { fields: Record<string, { value: string | null; quoteTranslation: string | null }>; doctorQuestions: string[] };

/** Translation into the interface language, only when the conversation was in another language. Quotes stay original. */
export async function fetchTranslation(card: Card): Promise<CardTranslation | null> {
  if (!card.intakeId || card.sourceLocale === UI_LOCALE) return null;
  return api<CardTranslation>('POST', `/api/intakes/${card.intakeId}/translations`, { targetLocale: UI_LOCALE });
}

// ---------- Voice ----------

export type VoiceSession = { intakeId: string; sessionUrl: string; dynamicVariables: Record<string, string> };

export async function startVoice(): Promise<VoiceSession> {
  const { id } = await createIntake();
  const session = await api<{ sessionUrl: string; dynamicVariables: Record<string, string> }>('POST', '/api/voice/session', { intakeId: id });
  return { intakeId: id, ...session };
}

/** How many card rows the agent has filled so far (live preview during the call). */
export async function previewCount(intakeId: string): Promise<number> {
  const intake = await api<{ preview: Record<string, unknown> }>('GET', `/api/intakes/${intakeId}`);
  return Object.keys(intake.preview ?? {}).length;
}

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** After the call the server takes the transcript from the voice provider; it can lag a few seconds. */
export async function finishVoice(intakeId: string, conversationId: string): Promise<Card> {
  for (let attempt = 0; ; attempt++) {
    try {
      await api('POST', `/api/intakes/${intakeId}/complete`, { expectedVersion: 0, conversationId });
      return fetchCard(intakeId);
    } catch (error) {
      const retriable = error instanceof ApiError && error.code === 'TRANSCRIPT_NOT_READY';
      if (!retriable || attempt >= 14) throw error;
      await pause(2000);
    }
  }
}
