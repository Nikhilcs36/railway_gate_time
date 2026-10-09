import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Test-only MSW server. Imported from `src/test/setup.ts`. */
export const server = setupServer(...handlers);