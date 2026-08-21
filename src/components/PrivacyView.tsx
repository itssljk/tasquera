import { motion } from 'framer-motion'
import { LogoMark, ShieldCheckIcon } from './icons'
import { APP_NAME, APP_VERSION_DISPLAY, LAST_LEGAL_UPDATE } from '../constants'

export default function PrivacyView({ onBack }: { onBack?: () => void }) {
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
            Privacy Policy
          </h1>
          <p className="mt-1.5 text-small text-ink-500">
            {APP_NAME} v{APP_VERSION_DISPLAY} · Effective {LAST_LEGAL_UPDATE}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8 text-body-lg leading-relaxed text-ink-700">
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-pine-500 font-semibold text-title">
            <ShieldCheckIcon className="size-5 shrink-0 stroke-[2]" />
            <span>100% Local-First Privacy Guarantee</span>
          </div>
          <p>
            {APP_NAME} is built from the ground up to respect your privacy. All your tasks, dates, boards, and lists stay strictly on your device: in your browser&apos;s local storage on the web, or in the app&apos;s private storage on the Android app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">1. Data We Store</h2>
          <p>
            When you create tasks, set due dates, organize boards, or adjust preferences, {APP_NAME} stores this information locally on your device: in your web browser&apos;s local storage on the web, or in the app&apos;s private storage on the Android app.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600">
            <li>Task names, descriptions, priorities, due dates, and subtasks</li>
            <li>Board names, list categories, and creation dates</li>
            <li>Completed task history</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">2. No Analytics & No Tracking</h2>
          <p>
            We do <strong>not</strong> track your usage, collect diagnostic telemetry, sell advertising identifiers, or use third-party cross-site trackers. Your workflow is private to you alone.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">3. Control Over Your Data</h2>
          <p>
            Because all information is held locally, you hold full authority over your data:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600">
            <li>You can clear all stored tasks anytime directly from the Settings screen.</li>
            <li>Clearing browser storage or site cache will clear locally saved tasks unless backed up.</li>
            <li>On Android, you can uninstall the app (or clear its data in system settings) to remove all locally stored data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">4. Optional Local Folder Sync</h2>
          <p>
            If you enable <strong>folder sync</strong> in Settings, {APP_NAME} writes your tasks to a folder you choose on your device (on Android, <code>Documents/Tsqsync/</code>) as a plain JSON file, so you can sync it with tools like Syncthing. This feature is entirely optional and off by default:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink-600">
            <li>You pick the folder. {APP_NAME} never scans or accesses your other files.</li>
            <li>Disconnecting sync stops all reads and writes to that folder.</li>
            <li>The file contains your task data, so treat it like any private file you share.</li>
          </ul>
          <p>
            On Android 11 and newer, {APP_NAME} requests the system’s “All files access” permission: it needs it to read and write the sync folder you choose (<code>Documents/Tsqsync/</code>). It never scans, modifies, or uploads any other files, and it never transmits this folder anywhere.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">5. Third-Party Libraries</h2>
          <p>
            {APP_NAME} utilizes open-source UI libraries (such as Framer Motion, React, and Capacitor) bundled directly with the application client. No external network requests are dispatched to process your task input. License texts for all bundled libraries are available in-app under Settings &rarr; About &amp; Legal &rarr; Open Source Licenses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-title font-semibold text-ink-900">6. Updates to This Policy</h2>
          <p>
            Should we update our privacy practices or features, changes will be published here with an updated effective date and version reference.
          </p>
        </section>

        <div className="pt-4 border-t border-paper-200/60 flex items-center justify-between text-body text-ink-500">
          <span>Questions or feedback?</span>
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
