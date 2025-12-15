import { createContext } from 'react';

export type User = Record<string, unknown>;

export const UserContext = createContext<User | null>(null);

