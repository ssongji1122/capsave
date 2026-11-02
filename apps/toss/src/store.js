const DATABASE_NAME = 'scrave-toss-capture-pilot';
const DATABASE_VERSION = 1;
const STORE_NAME = 'captures';
let databasePromise;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); databasePromise = undefined; };
        resolve(request.result);
      };
      request.onerror = () => { databasePromise = undefined; reject(request.error); };
      request.onblocked = () => {
        databasePromise = undefined;
        reject(new Error('다른 창을 닫은 뒤 다시 열어 주세요.'));
      };
    });
  }
  return databasePromise;
}

async function transaction(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(request.error || tx.error || new Error('저장하지 못했습니다. 다시 시도해 주세요.'));
    tx.onerror = () => reject(request.error || tx.error || new Error('저장하지 못했습니다. 다시 시도해 주세요.'));
  });
}

export async function listCaptures() {
  const captures = await transaction('readonly', store => store.getAll());
  return captures.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveCapture(capture, { create = false } = {}) {
  await transaction('readwrite', store => create ? store.add(capture) : store.put(capture));
}
