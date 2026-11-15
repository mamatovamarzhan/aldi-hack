// Server side of the patient session: conversation, card, sending to the doctor.
import { api, ApiError, newId } from '@/shared/api/client';
import { FIELDS, type Card, type CardField, type FieldId } from './card';

type ServerField = { value: string | null; quote: string | null; quoteVerified: boolean; editedByPatient: boolean };
type ServerCard = { version: number; fields: Record<string, ServerField>; doctorQuestions: string[] };
type ServerIntake = {
  id: string;
  urgent: boolean;
  createdAt: string;
  messages: { role: 'patient' | 'assistant'; text: string }[];
  card: ServerCard | null;
  shares: { sharedAt: string; cardVersion: number }[];
};

const CONSENT_VERSION = 'v1';

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

function toCard(intake: ServerIntake, source: Card['source']): Card {
  const fields = Object.fromEntries(FIELDS.map(f => [f.id, toField(intake.card?.fields[f.id])])) as Record<FieldId, CardField>;
  const lines = intake.messages.map(m => (source === 'voice' ? `${m.role === 'patient' ? 'Вы' : 'Aldi'}: ${m.text}` : m.role === 'patient' ? m.text : null));
  return {
    intakeId: intake.id,
    version: intake.card?.version ?? 0,
    source,
    transcript: lines.filter(Boolean).join('\n'),
    fields,
    questions: intake.card?.doctorQuestions ?? [],
    urgent: intake.urgent,
    // Sent means: the current version of the card is the one the doctor has.
    sentAt: intake.shares.find(s => s.cardVersion === intake.card?.version)?.sharedAt ?? null,
    createdAt: intake.createdAt,
  };
}

const createIntake = () =>
  api<{ id: string }>('POST', '/api/intakes', { locale: 'ru', consentVersion: CONSENT_VERSION, consent: true, country: 'KZ' }, { 'Idempotency-Key': newId() });

export async function fetchCard(intakeId: string, source: Card['source']): Promise<Card> {
  return toCard(await api<ServerIntake>('GET', `/api/intakes/${intakeId}`), source);
}

/** Text mode: the patient's own words become one message, then the card is built. */
export async function buildCardFromText(text: string): Promise<Card> {
  const { id } = await createIntake();
  await api('POST', `/api/intakes/${id}/messages`, { message: text.trim(), clientMessageId: newId() });
  await api('POST', `/api/intakes/${id}/complete`, { expectedVersion: 0 });
  return fetchCard(id, 'text');
}

export async function saveField(card: Card, id: FieldId, value: string): Promise<Card> {
  if (!card.intakeId) return card;
  await api('PATCH', `/api/intakes/${card.intakeId}/card`, { expectedVersion: card.version, changes: { fields: { [id]: value.trim() || null } } });
  return fetchCard(card.intakeId, card.source);
}

/** The tap on «Отправить врачу» is the separate consent to share this exact version. */
export async function sendToDoctor(card: Card, doctorId: string): Promise<Card> {
  if (!card.intakeId) return card;
  await api('POST', `/api/intakes/${card.intakeId}/share`, { cardVersion: card.version, doctorId, consent: true });
  return fetchCard(card.intakeId, card.source);
}

export async function removeIntake(card: Card) {
  if (card.intakeId) await api('DELETE', `/api/intakes/${card.intakeId}`);
}

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
      return fetchCard(intakeId, 'voice');
    } catch (error) {
      const retriable = error instanceof ApiError && error.code === 'TRANSCRIPT_NOT_READY';
      if (!retriable || attempt >= 14) throw error;
      await pause(2000);
    }
  }
}
