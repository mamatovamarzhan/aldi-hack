import { api } from '@/shared/api/client';
import type { Exercise } from './types';

const LOCALE = 'ru';

export const listExercises = () => api<{ items: Exercise[] }>('GET', `/api/exercises?locale=${LOCALE}`).then(r => r.items);
export const getExercise = (id: string) => api<Exercise>('GET', `/api/exercises/${encodeURIComponent(id)}?locale=${LOCALE}`);
