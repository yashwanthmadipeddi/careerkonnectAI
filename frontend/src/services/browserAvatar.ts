const DB_NAME = 'careerkonnect-browser-media';
const STORE_NAME = 'avatars';
const DB_VERSION = 1;

const objectUrls = new Map<string, string>();

const removedKey = (userId: string) =>
  `careerkonnect-avatar-removed:${userId}`;

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Unable to open browser storage.'));
  });

export const saveBrowserAvatar = async (
  userId: string,
  file: Blob
): Promise<void> => {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      userId,
      blob: file,
      updatedAt: Date.now(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error('Unable to save browser photo.'));
  });

  db.close();
  localStorage.removeItem(removedKey(userId));

  const oldUrl = objectUrls.get(userId);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  objectUrls.delete(userId);
};

export const getBrowserAvatar = async (
  userId: string
): Promise<string | null> => {
  if (isBrowserAvatarRemoved(userId)) return null;

  const db = await openDatabase();

  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(userId);

    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () =>
      reject(request.error || new Error('Unable to read browser photo.'));
  });

  db.close();

  if (!blob) return null;

  const oldUrl = objectUrls.get(userId);
  if (oldUrl) URL.revokeObjectURL(oldUrl);

  const url = URL.createObjectURL(blob);
  objectUrls.set(userId, url);
  return url;
};

export const removeBrowserAvatar = async (
  userId: string
): Promise<void> => {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error('Unable to remove browser photo.'));
  });

  db.close();
  localStorage.setItem(removedKey(userId), '1');

  const oldUrl = objectUrls.get(userId);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  objectUrls.delete(userId);
};

export const isBrowserAvatarRemoved = (userId: string): boolean =>
  localStorage.getItem(removedKey(userId)) === '1';
