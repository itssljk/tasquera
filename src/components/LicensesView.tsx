import { motion } from 'framer-motion'
import { LogoMark } from './icons'
import { APP_NAME, APP_VERSION } from '../constants'
import notices from '../../THIRD_PARTY_NOTICES.md?raw'

export default function LicensesView({ onBack }: { onBack?: () => void }) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.location.hash = '#/settings'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl py-2"
    >
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-paper-100 hover:text-ink-900"
        >
          ← Back to Settings
        </button>
        <span className="rounded-md bg-paper-200 px-2 py-0.5 font-mono text-[11px] font-medium text-pine-500">
          v{APP_VERSION}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <LogoMark className="size-8" />
        <div>
          <h1 className="font-sans text-[26px] font-bold leading-none tracking-tight text-ink-900">
            Open Source Licenses
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-500">
            {APP_NAME} v{APP_VERSION} · Third-party software bundled with this app
          </p>
        </div>
      </div>

      <p className="mt-6 text-[13.5px] leading-relaxed text-ink-500">
        {APP_NAME} is built with open-source software and fonts. Their license texts are reproduced below, as required by the MIT, ISC, Apache-2.0, 0BSD, and SIL Open Font licenses.
      </p>

      <pre className="mt-5 max-h-[70vh] overflow-auto rounded-2xl border border-paper-200/80 bg-paper-100/40 p-5 text-[12px] leading-relaxed text-ink-700 whitespace-pre-wrap">
        {notices}
      </pre>
    </motion.div>
  )
}
