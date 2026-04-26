import { motion, AnimatePresence } from 'framer-motion'
import { PenLine } from 'lucide-react'

function SoundwaveRings({ active }) {
  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-sky-400"
          animate={active
            ? { scale: [1, 2 + i * 0.4], opacity: [0.7, 0] }
            : { scale: 1, opacity: 0.15 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeOut',
          }}
          style={{ width: 20, height: 20 }}
        />
      ))}
      {/* Center dot */}
      <span className="w-4 h-4 rounded-full bg-sky-400 z-10 block" />
    </div>
  )
}

export default function ModeToggle({ mode, onChange, active = false }) {
  return (
    <button
      onClick={() => onChange(mode === 'voice' ? 'text' : 'voice')}
      className="flex flex-col items-center gap-1 focus:outline-none"
      aria-label={mode === 'voice' ? 'Switch to text mode' : 'Switch to voice mode'}
    >
      <AnimatePresence mode="wait">
        {mode === 'voice' ? (
          <motion.div key="wave"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}>
            <SoundwaveRings active={active} />
          </motion.div>
        ) : (
          <motion.div key="pen"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-16 h-16 text-slate-300">
            <PenLine size={32} strokeWidth={1.5} />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="text-xs text-slate-400 select-none">
        {mode === 'voice' ? 'Speaking' : 'Reading'}
      </span>
    </button>
  )
}
