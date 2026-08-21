import { motion } from 'framer-motion'
import { LogoMark } from './icons'
import { APP_NAME, APP_VERSION_DISPLAY, LAST_LEGAL_UPDATE } from '../constants'

export default function TosView({ onBack }: { onBack?: () => void }) {
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
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-body font-medium text-ink-500 transition-colors hover:bg-paper-100 hover:text-ink-900"
        >
          ← Back to Settings
        </button>
        <span className="rounded-md bg-paper-200 px-2 py-0.5 font-mono text-caption font-medium text-pine-500">
          v{APP_VERSION_DISPLAY}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <LogoMark className="size-8" />
        <div>
          <h1 className="font-sans text-display font-bold leading-none tracking-tight text-ink-900">
            Terms of Service
          </h1>
          <p className="mt-1.5 text-small text-ink-500">
            {APP_NAME} v{APP_VERSION_DISPLAY} · Effective {LAST_LEGAL_UPDATE}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8 text-body-lg leading-relaxed text-ink-700">
        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using {APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree with any portion of these terms, please discontinue using the application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">2. Service Description & Local-First Philosophy</h2>
          <p>
            {APP_NAME} is a calm, focused productivity and task management system designed to help you organize your work, boards, and schedules efficiently.
          </p>
          <p>
            {APP_NAME} operates primarily as a <strong>local-first application</strong>. Your tasks, collections, subtasks, notes, and preferences are stored directly within your browser&apos;s local storage (on the web), or within the app&apos;s private storage on your device (in the Android app). Optional folder sync writes your data only to a folder you explicitly choose.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">3. User Ownership & Data Retention</h2>
          <p>
            You retain complete ownership of all content, task descriptions, and data created using {APP_NAME}. Because data is retained locally on your device, maintaining backups (or managing browser data clearing) is under your sole control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">4. Acceptable Use</h2>
          <p>
            You agree to use {APP_NAME} only for lawful purposes. You shall not attempt to reverse engineer, tamper with, or misuse any underlying application scripts or infrastructure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">5. Disclaimer of Warranties</h2>
          <p>
            {APP_NAME} is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied. We do not guarantee uninterrupted operational availability or data permanence in client local environments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">6. Modifications to Terms</h2>
          <p>
            We reserve the right to revise or update these terms at any time. Continued use of {APP_NAME} following any updates constitutes acceptance of the modified Terms of Service.
          </p>
        </section>

        <div className="pt-4 border-t border-paper-200/60 flex items-center justify-between text-body text-ink-500">
          <span>Questions about our Terms?</span>
          <a
            href="https://discord.gg/Kfn4V2nF3N"
            target="_blank"
            rel="noreferrer"
            className="text-pine-500 transition-colors hover:text-pine-400 hover:underline"
          >
            Join Discord →
          </a>
        </div>
      </div>
    </motion.div>
  )
}
