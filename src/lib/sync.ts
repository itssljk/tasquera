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

const SYNC_FILE_NAME = 'tasquera-sync.json'

export function isFileSystemAccessSupported(): boolean {
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

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await idbKeyval.get<FileSystemDirectoryHandle>('tasquera_sync_dir_handle')
    if (!handle) return null
    return handle
  } catch (err) {
    console.error('Error retrieving directory handle from IndexedDB', err)
    return null
  }
}

export async function verifyPermission(dirHandle: FileSystemDirectoryHandle, readWrite = true): Promise<boolean> {
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

export async function pickSyncDirectory(): Promise<FileSystemDirectoryHandle | null> {
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

export async function readSyncFromDirectory(dirHandle: FileSystemDirectoryHandle): Promise<SyncPayload | null> {
  try {
    const hasPermission = await verifyPermission(dirHandle, false)
    if (!hasPermission) return null

    // Get or check tasquera-sync.json inside selected folder
    const fileHandle = await dirHandle.getFileHandle(SYNC_FILE_NAME, { create: false })
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

export async function writeSyncToDirectory(dirHandle: FileSystemDirectoryHandle, payload: SyncPayload): Promise<boolean> {
  try {
    const hasPermission = await verifyPermission(dirHandle, true)
    if (!hasPermission) return false

    // Create or open tasquera-sync.json inside selected folder
    const fileHandle = await dirHandle.getFileHandle(SYNC_FILE_NAME, { create: true })
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
  await idbKeyval.del('tasquera_sync_dir_handle')
}
