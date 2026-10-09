import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Browser MSW worker – intercepts /api/* in the dev server so the app works without a backend. */
export const worker = setupWorker(...handlers);