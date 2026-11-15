import { api } from '@/shared/api/client';

export type SharedRow = {
  intakeId: string;
  sharedAt: string;
  status: 'SHARED' | 'REVIEWED';
  urgent: boolean;
  patient: { id: string; displayName: string };
  summary: string | null;
};

export type SharedField = { value: string | null; quote: string | null; quoteVerified: boolean; editedByPatient: boolean };

export type SharedCard = {
  intakeId: string;
  sharedAt: string;
  status: 'SHARED' | 'REVIEWED';
  urgent: boolean;
  patient: { id: string; displayName: string };
  card: { version: number; fields: Record<string, SharedField>; doctorQuestions: string[] };
  newerDraftExists: boolean;
};

export const listShared = () => api<{ items: SharedRow[] }>('GET', '/api/doctor/intakes?pageSize=100').then(r => r.items);
export const getShared = (intakeId: string) => api<SharedCard>('GET', `/api/doctor/intakes/${intakeId}`);
export const markReviewed = (intakeId: string) => api<SharedCard>('PATCH', `/api/doctor/intakes/${intakeId}`, { reviewed: true });
