import * as Sentry from '@sentry/react';
import { setDemoUserHeader } from './api/client';

export interface Persona {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}

// Same users as server/src/data/mock.ts.
export const personas: Persona[] = [
  { id: 'u_1001', name: 'Ada Lovelace', email: 'ada@example.com', plan: 'enterprise' },
  { id: 'u_1002', name: 'Grace Hopper', email: 'grace@example.com', plan: 'pro' },
  { id: 'u_1003', name: 'Alan Turing', email: 'alan@example.com', plan: 'free' },
];

export function applyPersona(persona: Persona | null) {
  if (persona) {
    Sentry.setUser({ id: persona.id, username: persona.name, email: persona.email });
    Sentry.setTag('user.plan', persona.plan);
  } else {
    Sentry.setUser(null);
    Sentry.setTag('user.plan', undefined);
  }
  setDemoUserHeader(persona?.id ?? null);
}
