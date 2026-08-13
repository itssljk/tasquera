// Small key-value store over IndexedDB, used to persist the sync directory
// handle (survives reloads) and image attachments (off localStorage quota).
const DB_NAME = 'tasquera_sync_db'
const DB_VERSION = 2
const HANDLES_STORE = 'handles'
const IMAGES_STORE = 'images'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(HANDLES_STORE)) db.createObjectStore(HANDLES_STORE)
      if (!db.objectStoreNames.contains(IMAGES_STORE)) db.createObjectStore(IMAGES_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

interface Store {
  get<T>(key: IDBValidKey): Promise<T | undefined>
  set(key: IDBValidKey, val: unknown): Promise<void>
  del(key: IDBValidKey): Promise<void>
}

function makeStore(store: string): Store {
  return {
    async get<T>(key: IDBValidKey): Promise<T | undefined> {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly')
        const request = tx.objectStore(store).get(key)
        request.onsuccess = () => resolve(request.result as T | undefined)
        request.onerror = () => reject(request.error)
      })
    },
    async set(key: IDBValidKey, val: unknown): Promise<void> {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        tx.objectStore(store).put(val, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
    async del(key: IDBValidKey): Promise<void> {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        tx.objectStore(store).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
  }
}

export const idbKeyval = makeStore(HANDLES_STORE)
export const imageStore = makeStore(IMAGES_STORE)
