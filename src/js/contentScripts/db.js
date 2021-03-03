import { openDB } from 'idb';

const DB_NAME = 'recall';
const REQUESTS_STORE = 'requests';


const generateStoreApi = (dbName, storeName) => {
    const dbPromise = openDB(dbName, 1, {
        upgrade(db) {
            db.createObjectStore(storeName);
        },
    });

    return {
        get: async (key) => {
            return (await dbPromise).get(storeName, key);
        },
        set: async (key, val) => {
            return (await dbPromise).put(storeName, val, key);
        },
        del: async (key) => {
            return (await dbPromise).delete(storeName, key);
        },
        clear: async () => {
            return (await dbPromise).clear(storeName);
        },
        keys: async () => {
            return (await dbPromise).getAllKeys(storeName);
        },
        getAll: async () => {
            const start = Date.now();
            return (await dbPromise).getAll(storeName).then(res => {
                console.debug(`RECALL - indexeddb latency - getall: ${Date.now() - start}`)
                return res;
            });
        },
    }
};

export const requestsStore = generateStoreApi(DB_NAME, REQUESTS_STORE);
