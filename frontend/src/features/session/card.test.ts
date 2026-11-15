import { describe, expect, it } from 'vitest';
import { cardFromText, doctorPhrase, displayValue, editField, filledCount, FIELD_COUNT } from './card';

describe('card rules', () => {
  it('has 8 rows', () => {
    expect(FIELD_COUNT).toBe(8);
  });
  it('shows «Не указано» for anything the patient did not say', () => {
    const card = cardFromText('  мои слова  ');
    expect(displayValue(card.fields.concern)).toBe('Не указано');
    expect(filledCount(card)).toBe(0);
    expect(card.transcript).toBe('мои слова');
  });
  it('marks a row edited by the patient', () => {
    const card = editField(cardFromText('x'), 'onset', ' две недели ');
    expect(card.fields.onset).toMatchObject({ value: 'две недели', edited: true });
  });
  it('builds the doctor phrase only from filled rows, else «Не указано»', () => {
    const empty = cardFromText('x');
    expect(doctorPhrase(empty)).toBe('Не указано');
    const filled = editField(editField(empty, 'concern', 'Тянет внизу живота'), 'onset', 'Две недели назад.');
    expect(doctorPhrase(filled)).toBe('Тянет внизу живота. Две недели назад.');
  });
});
