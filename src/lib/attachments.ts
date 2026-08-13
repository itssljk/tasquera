import { imageStore } from './idb'
import { uid } from './model'

/** A task.images entry is either an inline data:/http(s) URL or an id stored in IndexedDB. */
export function isInlineImage(ref: string): boolean {
  return ref.startsWith('data:') || /^https?:\/\//i.test(ref)
}

/** Store an image and return the id that a task should reference. */
export async function putImage(dataUrl: string): Promise<string> {
  const id = uid()
  await imageStore.set(id, dataUrl)
  return id
}

/** Delete stored images by id (inline refs are ignored). */
export async function deleteImages(refs: string[]): Promise<void> {
  await Promise.all(refs.filter((r) => !isInlineImage(r)).map((id) => imageStore.del(id)))
}

export async function resolveImage(ref: string): Promise<string> {
  if (isInlineImage(ref)) return ref
  const dataUrl = await imageStore.get<string>(ref)
  return dataUrl ?? ref
}

export async function resolveMany(refs: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  await Promise.all(
    refs.map(async (r) => {
      map[r] = await resolveImage(r)
    }),
  )
  return map
}

/** Collect id -> dataUrl for the given refs (for sync/export payloads). */
export async function collectImages(refs: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  await Promise.all(
    refs.filter((r) => !isInlineImage(r)).map(async (id) => {
      const dataUrl = await imageStore.get<string>(id)
      if (dataUrl) map[id] = dataUrl
    }),
  )
  return map
}

/** Persist a map of id -> dataUrl (when merging sync state or importing a backup). */
export async function importImages(images: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(images).map(async ([id, dataUrl]) => {
      if (typeof dataUrl === 'string' && dataUrl) await imageStore.set(id, dataUrl)
    }),
  )
}
