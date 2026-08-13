import { useResolvedImages } from '../lib/useResolvedImages'

export function ImageThumbs({
  refs,
  onPreview,
  imgClassName = 'size-16',
  gapClassName = 'gap-2',
}: {
  refs: string[]
  onPreview: (src: string) => void
  imgClassName?: string
  gapClassName?: string
}) {
  const urls = useResolvedImages(refs)
  if (refs.length === 0) return null

  return (
    <div className={`flex flex-wrap ${gapClassName}`}>
      {refs.map((ref, idx) => (
        <img
          key={idx}
          src={urls[ref] ?? ref}
          alt={`Attachment ${idx + 1}`}
          onClick={(e) => {
            e.stopPropagation()
            onPreview(urls[ref] ?? ref)
          }}
          className={`${imgClassName} object-cover rounded-lg border border-paper-300 shadow-2xs cursor-pointer hover:scale-105 transition-transform`}
        />
      ))}
    </div>
  )
}
