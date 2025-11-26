import 'fake-indexeddb/auto';
import { vi, beforeEach, afterEach } from 'vitest';

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

globalThis.marked = {
    parse: (text) => text
};

globalThis.lucide = {
    createIcons: () => {}
};

globalThis.Prism = {
    highlightElement: () => {}
};

vi.mock('lucide', () => ({
    createIcons: () => {}
}));

beforeEach(() => {
    const databases = indexedDB._databases;
    if (databases) {
        Object.keys(databases).forEach(dbName => {
            indexedDB.deleteDatabase(dbName);
        });
    }
});

afterEach(() => {
    vi.clearAllMocks();
});
