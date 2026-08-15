import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { idbKeyval } from './idb'
import { collectImages } from './attachments'
import type { Collection, Task, Tombstone } from '../types'

export interface SyncPayload {
  version: 2
  timestamp: number
  tasks: Task[]
  collections: Collection[]
  tombstones?: Tombstone[]
  attachments?: Record<string, string>
}

export interface NativeSyncHandle {
  isNative: true
  path: string
}

export type SyncHandle = FileSystemDirectoryHandle | NativeSyncHandle

const SYNC_DIR = 'Tsqsync'
const SYNC_FILE_NAME = 'tasquera-sync.json'
const FALLBACK_SYNC_FILE_NAME = 'data.json'

export const NATIVE_SYNC_HANDLE: NativeSyncHandle = {
  isNative: true,
  path: `Documents/${SYNC_DIR}`,
}

export function isNativePlatform(): boolean {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
}

export function isFileSystemAccessSupported(): boolean {
  if (isNativePlatform()) return true
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Build the payload to persist to the sync folder, including image attachments. */
export async function buildSyncPayload(
  tasks: Task[],
  collections: Collection[],
  tombstones: Tombstone[],
): Promise<SyncPayload> {
  const attachments = await collectImages(tasks.flatMap((t) => t.images ?? []))
  return { version: 2, timestamp: Date.now(), tasks, collections, tombstones, attachments }
}

export async function getStoredDirectoryHandle(): Promise<SyncHandle | null> {
  if (isNativePlatform()) {
    try {
      const disabled = await idbKeyval.get<boolean>('tasquera_native_sync_disabled')
      if (disabled) return null
      return NATIVE_SYNC_HANDLE
    } catch {
      return NATIVE_SYNC_HANDLE
    }
  }

  try {
    const handle = await idbKeyval.get<FileSystemDirectoryHandle>('tasquera_sync_dir_handle')
    if (!handle) return null
    return handle
  } catch (err) {
    console.error('Error retrieving directory handle from IndexedDB', err)
    return null
  }
}

export async function verifyPermission(dirHandle: SyncHandle | null, readWrite = true): Promise<boolean> {
  if (!dirHandle) return false
  if (isNativePlatform() || ('isNative' in dirHandle && dirHandle.isNative)) {
    return true
  }
  const options = { mode: readWrite ? 'readwrite' : 'read' }
  const handle = dirHandle as any
  if (typeof handle.queryPermission === 'function' && (await handle.queryPermission(options)) === 'granted') {
    return true
  }
  // Never call requestPermission() here: it requires a user gesture and is
  // rejected when invoked from a polling interval. Re-selecting the folder
  // (pickSyncDirectory) is how permission is granted.
  return false
}

export async function pickSyncDirectory(): Promise<SyncHandle | null> {
  if (isNativePlatform()) {
    try {
      await Filesystem.mkdir({
        path: SYNC_DIR,
        directory: Directory.Documents,
        recursive: true,
      })
    } catch {
      // Folder might already exist
    }
    await idbKeyval.del('tasquera_native_sync_disabled')
    return NATIVE_SYNC_HANDLE
  }

  if (!isFileSystemAccessSupported()) return null
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    })

    if (handle) {
      await idbKeyval.set('tasquera_sync_dir_handle', handle)
      return handle
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Failed to pick sync directory:', err)
    }
  }
  return null
}

export async function readSyncFromDirectory(dirHandle?: SyncHandle | null): Promise<SyncPayload | null> {
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    try {
      let raw: string | null = null
      try {
        const res = await Filesystem.readFile({
          path: `${SYNC_DIR}/${SYNC_FILE_NAME}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        })
        raw = typeof res.data === 'string' ? res.data : await (res.data as Blob).text()
      } catch {
        // Fallback to data.json if tasquera-sync.json is not present
        try {
          const res = await Filesystem.readFile({
            path: `${SYNC_DIR}/${FALLBACK_SYNC_FILE_NAME}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          })
          raw = typeof res.data === 'string' ? res.data : await (res.data as Blob).text()
        } catch {
          return null
        }
      }

      if (!raw || !raw.trim()) return null
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 2 && Array.isArray(parsed.tasks)) {
        return parsed as SyncPayload
      }
    } catch (err: any) {
      console.error('Failed reading sync file natively via Capacitor Filesystem', err)
    }
    return null
  }

  if (!dirHandle) return null

  try {
    const hasPermission = await verifyPermission(dirHandle, false)
    if (!hasPermission) return null

    // Get or check tasquera-sync.json inside selected folder
    const fileHandle = await (dirHandle as FileSystemDirectoryHandle).getFileHandle(SYNC_FILE_NAME, { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    if (!text.trim()) return null
    const parsed = JSON.parse(text)
    if (parsed && parsed.version === 2 && Array.isArray(parsed.tasks)) {
      return parsed as SyncPayload
    }
  } catch (err: any) {
    // If file doesn't exist yet in the folder, return null silently
    if (err.name !== 'NotFoundError') {
      console.error('Failed reading sync file from directory handle', err)
    }
  }
  return null
}

export async function writeSyncToDirectory(dirHandle: SyncHandle | null, payload: SyncPayload): Promise<boolean> {
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    try {
      try {
        await Filesystem.mkdir({
          path: SYNC_DIR,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch {
        // Folder might already exist
      }

      const data = JSON.stringify(payload, null, 2)
      await Filesystem.writeFile({
        path: `${SYNC_DIR}/${SYNC_FILE_NAME}`,
        data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      return true
    } catch (err) {
      console.error('Failed writing sync file natively via Capacitor Filesystem', err)
      return false
    }
  }

  if (!dirHandle) return false

  try {
    const hasPermission = await verifyPermission(dirHandle, true)
    if (!hasPermission) return false

    // Create or open tasquera-sync.json inside selected folder
    const fileHandle = await (dirHandle as FileSystemDirectoryHandle).getFileHandle(SYNC_FILE_NAME, { create: true })
    const writable = await (fileHandle as any).createWritable()
    await writable.write(JSON.stringify(payload, null, 2))
    await writable.close()
    return true
  } catch (err) {
    console.error('Failed writing sync file to directory handle', err)
    return false
  }
}

export async function clearSyncDirectoryHandle(): Promise<void> {
  if (isNativePlatform()) {
    await idbKeyval.set('tasquera_native_sync_disabled', true)
  } else {
    await idbKeyval.del('tasquera_sync_dir_handle')
  }
}
