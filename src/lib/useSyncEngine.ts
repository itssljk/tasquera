import { useEffect, useRef, useState } from 'react'
import type { Collection, Task, Tombstone } from '../types'
import {
  buildSyncPayload,
  checkNativeStorageAccess,
  clearSyncDirectoryHandle,
  deleteSyncConflictCopies,
  ensureNativePermissions,
  getStoredDirectoryHandle,
  hasNativeWriteAccess,
  isFileSystemAccessSupported,
  isNativePlatform,
  pickSyncDirectory,
  readConflictCopies,
  readSyncFromDirectory,
  writeSyncToDirectory,
  type SyncHandle,
} from './sync'
import { idbKeyval } from './idb'

interface UseSyncEngineProps {
  tasks: Task[]
  collections: Collection[]
  tombstones: Tombstone[]
  mergeState: (remoteTasks: Task[], remoteCollections: Collection[], remoteTombstones?: Tombstone[]) => void
}

export function useSyncEngine({ tasks, collections, tombstones, mergeState }: UseSyncEngineProps) {
  const [syncDirHandle, setSyncDirHandle] = useState<SyncHandle | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncNeedsPermission, setSyncNeedsPermission] = useState(false)
  const [showStorageOnboarding, setShowStorageOnboarding] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [lastSyncSizeBytes, setLastSyncSizeBytes] = useState<number | null>(null)
  const [syncResolveMsg, setSyncResolveMsg] = useState<string | null>(null)

  const isFileSystemSupported = isFileSystemAccessSupported()

  // Load stored sync directory handle on mount
  useEffect(() => {
    if (!isFileSystemSupported) return
    let cancelled = false
    ;(async () => {
      if (isNativePlatform()) {
        const ok = await hasNativeWriteAccess()
        if (cancelled) return
        setSyncNeedsPermission(!ok)
        if (ok) {
          const handle = await getStoredDirectoryHandle()
          if (!cancelled) setSyncDirHandle(handle)
        } else {
          const { sdkInt } = await checkNativeStorageAccess()
          if (cancelled) return
          if (sdkInt >= 30) {
            let seen = false
            try {
              seen = !!(await idbKeyval.get<boolean>('tasquera_storage_onboarding_seen'))
            } catch {
              // Ignore storage errors
            }
            if (!seen) setShowStorageOnboarding(true)
          }
        }
      } else {
        const handle = await getStoredDirectoryHandle()
        if (!cancelled && handle) setSyncDirHandle(handle)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isFileSystemSupported])

  // Re-check native storage access when foregrounded
  useEffect(() => {
    if (!isNativePlatform()) return
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      hasNativeWriteAccess().then(async (ok) => {
        if (ok) {
          setSyncNeedsPermission(false)
          setShowStorageOnboarding(false)
          const handle = await getStoredDirectoryHandle()
          if (handle) setSyncDirHandle(handle)
        } else {
          setSyncNeedsPermission(true)
        }
      })
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // Perform background sync write when local store state changes
  const lastStateJsonRef = useRef<string>('')
  useEffect(() => {
    if (!syncDirHandle || syncNeedsPermission) return
    const signature = JSON.stringify({
      tasks,
      collections,
      tombstones,
    })
    if (signature === lastStateJsonRef.current) return
    lastStateJsonRef.current = signature

    buildSyncPayload(tasks, collections, tombstones).then((payload) => {
      setLastSyncSizeBytes(JSON.stringify(payload).length)
      writeSyncToDirectory(syncDirHandle, payload).then(async (ok) => {
        if (ok) {
          setLastSyncTime(Date.now())
          setSyncError(null)
          setSyncNeedsPermission(false)
        } else if (isNativePlatform()) {
          const access = await hasNativeWriteAccess()
          if (!access) {
            setSyncNeedsPermission(true)
            setSyncDirHandle(null)
            setSyncError(
              'Storage access is required to sync. Tap "Grant access" below to allow Tasquera to read and write the Documents/Tsqsync folder.',
            )
          } else {
            setSyncError('Could not write to local sync folder. Please check the Documents/Tsqsync folder and try again.')
          }
        } else {
          setSyncError('Could not write to local sync folder. Please re-select the folder or check permissions.')
        }
      })
    })
  }, [tasks, collections, tombstones, syncDirHandle, syncNeedsPermission])

  // Periodic polling watcher for remote Syncthing updates (every 5s)
  const mergeStateRef = useRef(mergeState)
  mergeStateRef.current = mergeState

  useEffect(() => {
    if (!syncDirHandle || syncNeedsPermission) return
    const interval = setInterval(async () => {
      const payload = await readSyncFromDirectory(syncDirHandle)
      if (payload && Array.isArray(payload.tasks)) {
        mergeStateRef.current(payload.tasks, payload.collections || [], payload.tombstones || [])
        setLastSyncTime(Date.now())

        const conflicts = await readConflictCopies(syncDirHandle)
        if (conflicts.length > 0) {
          for (const c of conflicts) {
            mergeStateRef.current(c.tasks, c.collections || [], c.tombstones || [])
          }
          const deleted = await deleteSyncConflictCopies(syncDirHandle)
          if (deleted > 0) {
            setSyncResolveMsg(
              `Merged ${conflicts.length} conflicting sync ${conflicts.length === 1 ? 'copy' : 'copies'}: edits from both devices were combined and the duplicates cleaned up.`,
            )
            window.setTimeout(() => setSyncResolveMsg(null), 8000)
          }
        }
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [syncDirHandle, syncNeedsPermission])

  const handleSelectSyncFolder = async () => {
    setSyncError(null)
    const handle = await pickSyncDirectory()
    if (handle) {
      setSyncNeedsPermission(false)
      setSyncDirHandle(handle)
      const payload = await readSyncFromDirectory(handle)
      if (payload && Array.isArray(payload.tasks)) {
        mergeStateRef.current(payload.tasks, payload.collections || [], payload.tombstones || [])
      } else {
        const initialPayload = await buildSyncPayload(tasks, collections, tombstones)
        setLastSyncSizeBytes(JSON.stringify(initialPayload).length)
        await writeSyncToDirectory(handle, initialPayload)
      }
      setLastSyncTime(Date.now())
    } else if (isNativePlatform()) {
      setSyncNeedsPermission(true)
      setSyncError('Allow "All files access" in Settings, then return here. Tasquera will reconnect automatically.')
    }
  }

  const handleDisconnectSyncFolder = async () => {
    await clearSyncDirectoryHandle()
    setSyncDirHandle(null)
    setSyncNeedsPermission(false)
    setSyncError(null)
  }

  const handleStorageOnboardingGrant = async () => {
    const ok = await ensureNativePermissions()
    if (ok) {
      setShowStorageOnboarding(false)
      setSyncNeedsPermission(false)
      const handle = await getStoredDirectoryHandle()
      if (handle) setSyncDirHandle(handle)
    }
  }

  const handleStorageOnboardingNotNow = async () => {
    setShowStorageOnboarding(false)
    await idbKeyval.set('tasquera_storage_onboarding_seen', true)
  }

  return {
    syncDirHandle,
    syncError,
    syncNeedsPermission,
    showStorageOnboarding,
    lastSyncTime,
    lastSyncSizeBytes,
    syncResolveMsg,
    isFileSystemSupported,
    handleSelectSyncFolder,
    handleDisconnectSyncFolder,
    handleStorageOnboardingGrant,
    handleStorageOnboardingNotNow,
  }
}
