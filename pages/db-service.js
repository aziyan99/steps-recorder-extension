/**
 * Database Service for Steps Recorder Extension
 * Encapsulates client-side persistent storage using browser IndexedDB.
 * Maintains privacy by running entirely local and offline.
 * 
 * @module db-service
 */

const DB_NAME = 'StepsRecorderDB';
const DB_VERSION = 1;
const STORE_NAME = 'guides';

/**
 * Opens connection to the IndexedDB database.
 * Creates the database schema if opening for the first time.
 * 
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database failed to open:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      }
    };
  });
}

/**
 * Saves or updates a Guide record in the database.
 * 
 * @param {Object} guide - The complete Guide object structure.
 * @param {string} guide.id - Unique identifier of the guide.
 * @param {string} guide.title - User-defined title.
 * @param {number} guide.createdAt - Millisecond timestamp of guide creation.
 * @param {number} guide.lastModified - Millisecond timestamp of last edit.
 * @param {number} guide.stepCount - Number of steps in the guide.
 * @param {Array<Object>} guide.steps - Steps array.
 * @returns {Promise<string>} Resolves with the saved guide ID.
 */
export function saveGuide(guide) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(guide);

      request.onsuccess = () => {
        resolve(guide.id);
      };

      request.onerror = (event) => {
        console.error('Failed to put guide in store:', event.target.error);
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Retrieves a complete Guide object by ID.
 * 
 * @param {string} id - The Guide primary key identifier.
 * @returns {Promise<Object|null>} The guide record, or null if not found.
 */
export function getGuide(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = (event) => {
        resolve(event.target.result || null);
      };

      request.onerror = (event) => {
        console.error('Failed to read guide:', event.target.error);
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Retrieves all saved guides from IndexedDB sorted by lastModified descending.
 * Excludes the heavy 'steps' array (images) to optimize loading performance.
 * 
 * @returns {Promise<Array<Object>>} List of guide metadata objects.
 */
export function getAllGuides() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('lastModified');
      
      const list = [];
      const request = index.openCursor(null, 'prev'); // Sort lastModified descending

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const { id, title, createdAt, lastModified, stepCount } = cursor.value;
          list.push({ id, title, createdAt, lastModified, stepCount });
          cursor.continue();
        } else {
          resolve(list);
        }
      };

      request.onerror = (event) => {
        console.error('Failed to open cursor on guides:', event.target.error);
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Deletes a Guide record by ID.
 * 
 * @param {string} id - Target Guide ID to remove.
 * @returns {Promise<void>}
 */
export function deleteGuide(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Failed to delete guide record:', event.target.error);
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Reads the active guide session ID.
 * 
 * @returns {string|null} The active session identifier.
 */
export function getActiveSessionId() {
  return localStorage.getItem('active_session_id');
}

/**
 * Sets the active guide session ID.
 * 
 * @param {string} id - The guide ID to set as active session.
 */
export function setActiveSessionId(id) {
  if (id) {
    localStorage.setItem('active_session_id', id);
  } else {
    localStorage.removeItem('active_session_id');
  }
}

/**
 * Estimates database storage usage and quota limitations.
 * 
 * @returns {Promise<{usage: number, quota: number, percentUsed: number, isLowSpace: boolean}>}
 */
export async function checkStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 1;
    const percentUsed = (usage / quota) * 100;
    const isLowSpace = (quota - usage) < (50 * 1024 * 1024); // Low if < 50MB left
    return { usage, quota, percentUsed, isLowSpace };
  }
  return { usage: 0, quota: 0, percentUsed: 0, isLowSpace: false };
}
