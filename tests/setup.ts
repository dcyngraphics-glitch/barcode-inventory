import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

import { afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

afterEach(() => {
  indexedDB = new IDBFactory();
});