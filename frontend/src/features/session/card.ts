// Pure card rules: no React, no storage. Every value must come from the patient's own words.
export const FIELD_COUNT = 8;
export const MISSING = 'Не указано';

/** Card rows. Ids are the backend's card fields (docs/API_CONTRACTS.md); labels are working names. */
export const FIELDS = [
  { id: 'complaint', label: 'Что беспокоит' },
  { id: 'time_since_birth', label: 'Сколько прошло после родов' },
  { id: 'triggers', label: 'Когда это возникает' },
  { id: 'frequency', label: 'Как часто' },
  { id: 'impact', label: 'Как мешает в обычной жизни' },
  { id: 'tried_or_told', label: 'Что уже пробовали и говорили ли врачу' },
  { id: 'birth_info', label: 'Как прошли роды' },
  { id: 'own_question', label: 'Что хочется спросить у врача' },
] as const;

export type FieldId = (typeof FIELDS)[number]['id'];
export type CardField = { value: string | null; quote: string | null; edited: boolean; uncertain: boolean };
export type Card = {
  /** Server-side conversation this card belongs to; null only for a card that was never saved. */
  intakeId: string | null;
  /** Card version on the server; every edit creates a new one. */
  version: number;
  source: 'text' | 'voice';
  transcript: string;
  fields: Record<FieldId, CardField>;
  questions: string[];
  urgent: boolean;
  sentAt: string | null;
  createdAt: string;
};

const emptyField = (): CardField => ({ value: null, quote: null, edited: false, uncertain: false });

/** A card from free text. Rows stay empty until something extracts them from the patient's words. */
export function cardFromText(text: string, now = new Date()): Card {
  const fields = Object.fromEntries(FIELDS.map(f => [f.id, emptyField()])) as Record<FieldId, CardField>;
  return { intakeId: null, version: 0, source: 'text', transcript: text.trim(), fields, questions: [], urgent: false, sentAt: null, createdAt: now.toISOString() };
}

export function editField(card: Card, id: FieldId, value: string): Card {
  const trimmed = value.trim();
  return { ...card, fields: { ...card.fields, [id]: { ...card.fields[id], value: trimmed || null, edited: true, uncertain: false } } };
}

export function displayValue(field: CardField): string {
  return field.value ?? MISSING;
}

export function filledCount(card: Card): number {
  return FIELDS.filter(f => card.fields[f.id].value !== null).length;
}

/** Phrase for the doctor, built only from the patient's own filled lines. */
export function doctorPhrase(card: Card): string {
  const parts = FIELDS.map(f => card.fields[f.id].value).filter((v): v is string => Boolean(v));
  return parts.length ? parts.map(p => p.replace(/[.\s]+$/, '')).join('. ') + '.' : MISSING;
}

export function markSent(card: Card, now = new Date()): Card {
  return { ...card, sentAt: now.toISOString() };
}
