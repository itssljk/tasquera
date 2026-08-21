import { Capacitor, registerPlugin } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { idbKeyval } from './idb'
import type { Collection, Task, Tombstone } from '../types'

interface StoragePermissionPlugin {
  check(): Promise<{ sdkInt: number; allFilesAccessGranted: boolean }>
  requestAllFilesAccess(): Promise<void>
}

const StoragePermission = registerPlugin<StoragePermissionPlugin>('StoragePermission')

export interface SyncPayload {
  version: 2
  timestamp: number
  tasks: Task[]
  collections: Collection[]
  tombstones?: Tombstone[]
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

/** Build the payload to persist to the sync folder. */
export async function buildSyncPayload(
  tasks: Task[],
  collections: Collection[],
  tombstones: Tombstone[],
): Promise<SyncPayload> {
  return { version: 2, timestamp: Date.now(), tasks, collections, tombstones }
}

/**
 * Check whether the app can actually read/write the sync folder natively.
 *
 * On Android 11+ (API 30+) the Capacitor Filesystem plugin maps
 * Directory.Documents to a direct path under shared storage, which requires
 * the special "All files access" permission (MANAGE_EXTERNAL_STORAGE). That
 * permission can't be requested through the normal runtime dialog, so we use
 * the custom StoragePermission native plugin to check it.
 */
export async function hasNativeWriteAccess(): Promise<boolean> {
  if (!isNativePlatform()) return true
  const { sdkInt, allFilesAccessGranted } = await checkNativeStorageAccess()
  if (sdkInt >= 30) return allFilesAccessGranted
  // Below Android 11 the legacy READ/WRITE_EXTERNAL_STORAGE runtime
  // permissions govern access to public Documents.
  try {
    const status = await Filesystem.checkPermissions()
    return status.publicStorage === 'granted'
  } catch {
    return false
  }
}

export async function checkNativeStorageAccess(): Promise<{ sdkInt: number; allFilesAccessGranted: boolean }> {
  try {
    return await StoragePermission.check()
  } catch (err) {
    console.warn('StoragePermission plugin unavailable, assuming access granted:', err)
    return { sdkInt: 0, allFilesAccessGranted: true }
  }
}

/** Open the system "All files access" settings screen (Android 11+ only). */
export async function openNativeStorageAccessSettings(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await StoragePermission.requestAllFilesAccess()
  } catch (err) {
    console.warn('Could not open storage permission settings:', err)
  }
}

/**
 * Request native storage access. On Android 11+ this opens the system
 * "All files access" settings screen (the user must toggle it there, then
 * return to the app). Returns true only if access is already granted.
 */
export async function ensureNativePermissions(): Promise<boolean> {
  if (!isNativePlatform()) return true
  const { sdkInt, allFilesAccessGranted } = await checkNativeStorageAccess()
  if (sdkInt >= 30) {
    if (allFilesAccessGranted) return true
    await openNativeStorageAccessSettings()
    return false
  }
  try {
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage === 'granted') return true
    const res = await Filesystem.requestPermissions().catch(() => null)
    return res?.publicStorage === 'granted'
  } catch (err) {
    console.warn('Could not check or request filesystem permissions:', err)
    return false
  }
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
    return hasNativeWriteAccess()
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
    const granted = await ensureNativePermissions()
    if (!granted) return null
    try {
      await Filesystem.mkdir({
        path: SYNC_DIR,
        directory: Directory.Documents,
        recursive: true,
      })
    } catch {
      // Folder might already exist, or creation failed. The write path below
      // will surface any real permission errors.
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

function parseSyncPayload(raw: string): SyncPayload | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === 2 && Array.isArray(parsed.tasks)) {
      return parsed as SyncPayload
    }
  } catch {
    // Invalid JSON: treat as unreadable.
  }
  return null
}

/** Read a single named JSON payload file from the sync folder (native or web). */
async function readSyncPayloadFile(dirHandle: SyncHandle | null, fileName: string): Promise<SyncPayload | null> {
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    if (!(await hasNativeWriteAccess())) return null
    try {
      const res = await Filesystem.readFile({
        path: `${SYNC_DIR}/${fileName}`,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
      const raw = typeof res.data === 'string' ? res.data : await (res.data as Blob).text()
      return parseSyncPayload(raw)
    } catch (err: any) {
      // A missing file is expected before the first write; log real failures only.
      const msg = err?.message ?? ''
      if (!msg.includes('No such file') && !msg.includes('ENOENT') && !msg.includes('not exist')) {
        console.error(`Failed reading ${fileName} natively via Capacitor Filesystem`, err)
      }
      return null
    }
  }

  if (!dirHandle) return null
  try {
    const hasPermission = await verifyPermission(dirHandle, false)
    if (!hasPermission) return null
    const fileHandle = await (dirHandle as FileSystemDirectoryHandle).getFileHandle(fileName, { create: false })
    const file = await fileHandle.getFile()
    return parseSyncPayload(await file.text())
  } catch (err: any) {
    // If the file doesn't exist yet in the folder, return null silently
    if (err.name !== 'NotFoundError') {
      console.error(`Failed reading ${fileName} from directory handle`, err)
    }
    return null
  }
}

export async function readSyncFromDirectory(dirHandle?: SyncHandle | null): Promise<SyncPayload | null> {
  const main = await readSyncPayloadFile(dirHandle ?? null, SYNC_FILE_NAME)
  if (main) return main
  // Legacy fallback to data.json (native only, kept for older installs)
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    return readSyncPayloadFile(dirHandle ?? null, FALLBACK_SYNC_FILE_NAME)
  }
  return null
}

function isConflictFileName(name: string): boolean {
  return name.includes('.sync-conflict-') && name.endsWith('.json')
}

/** List file names present in the sync folder (empty if the folder is missing). */
async function listSyncDirEntries(dirHandle: SyncHandle | null): Promise<string[]> {
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    if (!(await hasNativeWriteAccess())) return []
    try {
      const res = await Filesystem.readdir({
        path: SYNC_DIR,
        directory: Directory.Documents,
      })
      return res.files.map((f) => f.name)
    } catch (err: any) {
      // No Tsqsync folder yet is normal before the first write
      const msg = err?.message ?? ''
      if (msg.includes('No such file') || msg.includes('ENOENT') || msg.includes('not exist')) return []
      console.error('Failed listing sync directory natively:', err)
      return []
    }
  }

  if (!dirHandle) return []
  try {
    const names: string[] = []
    for await (const entry of (dirHandle as FileSystemDirectoryHandle).values()) {
      if (entry.kind === 'file') names.push(entry.name)
    }
    return names
  } catch (err) {
    console.error('Failed listing sync directory:', err)
    return []
  }
}

/**
 * Read every Syncthing conflict copy (tasquera-sync.sync-conflict-*.json) in
 * the sync folder so their edits can be merged instead of lost.
 */
export async function readConflictCopies(dirHandle: SyncHandle | null): Promise<SyncPayload[]> {
  const names = await listSyncDirEntries(dirHandle)
  const payloads: SyncPayload[] = []
  for (const name of names.filter(isConflictFileName)) {
    const payload = await readSyncPayloadFile(dirHandle, name)
    if (payload) payloads.push(payload)
  }
  return payloads
}

/** Delete every Syncthing conflict copy; returns how many were removed. */
export async function deleteSyncConflictCopies(dirHandle: SyncHandle | null): Promise<number> {
  const names = (await listSyncDirEntries(dirHandle)).filter(isConflictFileName)
  if (names.length === 0) return 0

  let deleted = 0
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    if (!(await hasNativeWriteAccess())) return 0
    for (const name of names) {
      try {
        await Filesystem.deleteFile({ path: `${SYNC_DIR}/${name}`, directory: Directory.Documents })
        deleted++
      } catch (err) {
        console.error(`Failed deleting conflict copy ${name}:`, err)
      }
    }
    return deleted
  }

  if (!dirHandle) return 0
  for (const name of names) {
    try {
      await (dirHandle as FileSystemDirectoryHandle).removeEntry(name)
      deleted++
    } catch (err) {
      console.error(`Failed deleting conflict copy ${name}:`, err)
    }
  }
  return deleted
}

export async function writeSyncToDirectory(dirHandle: SyncHandle | null, payload: SyncPayload): Promise<boolean> {
  if (isNativePlatform() || (dirHandle && 'isNative' in dirHandle)) {
    if (!(await hasNativeWriteAccess())) return false
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
