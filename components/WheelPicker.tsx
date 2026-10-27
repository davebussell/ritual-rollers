'use client'

// Pick what you ride. The choice lives in the rr_wheel cookie; the server pages read it and show only what
// fits. "Everything" is a choice too (it hides the first-visit bar).

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { WHEELS, WHEEL_COOKIE, type WheelId } from '@/lib/wheels'
import { WheelIcon } from '@/components/WheelIcons'

export type WheelValue = WheelId | 'all'

// A full reload, so every server-rendered part of the page (header included) re-reads the cookie
function useSetWheel() {
  return (value: WheelValue) => {
    document.cookie = `${WHEEL_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
    window.location.reload()
  }
}

const OPTIONS: { id: WheelValue; label: string; long: string }[] = [
  ...WHEELS.map(w => ({ id: w.id as WheelValue, label: w.label, long: w.long })),
  { id: 'all', label: 'Everything', long: 'Anything on wheels' },
]

// In the header: a pill showing your wheels, opening a small menu
export function WheelPicker({ current, onDark = true, wide = false }: { current: WheelValue | null; onDark?: boolean; wide?: boolean }) {
  const set = useSetWheel()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cur = OPTIONS.find(o => o.id === current)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  return (
    <div ref={ref} className={`relative ${wide ? 'w-full' : ''}`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-[14px] font-bold transition-colors ${wide ? 'w-full justify-between !py-2.5 !text-[16px]' : ''} ${
          onDark
            ? cur ? 'border-curb bg-curb text-asphalt' : 'border-curb text-curb hover:bg-curb hover:text-asphalt'
            : 'border-asphalt bg-flyer text-asphalt'}`}>
        <span className="flex items-center gap-2">
          <WheelIcon id={cur?.id ?? 'all'} size={18} />
          <span><span className="sr-only">You ride: </span>{cur ? cur.label : 'What do you ride?'}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </button>
      {open && (
        <ul role="menu" className={`absolute z-[70] mt-2 w-64 overflow-hidden rounded-2xl border-2 border-asphalt bg-flyer py-1.5 text-asphalt shadow-xl ${wide ? 'left-0 right-0 w-auto' : 'left-0'}`}>
          {OPTIONS.map(o => (
            <li key={o.id} role="none">
              <button type="button" role="menuitemradio" aria-checked={o.id === current} onClick={() => { setOpen(false); set(o.id) }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-concrete ${o.id === current ? 'bg-concrete' : ''}`}>
                <WheelIcon id={o.id} size={22} />
                <span><span className="block font-extrabold">{o.label}</span><span className="block text-[13px] text-muted">{o.long}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Under the header until the visitor picks: the three choices, one tap each
export function WheelChoiceBar() {
  const set = useSetWheel()
  return (
    <div className="border-b-2 border-asphalt/10 bg-curb">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <p className="font-display text-[16px] font-semibold">What do you ride?</p>
        <div className="flex flex-wrap gap-2">
          {WHEELS.map(w => (
            <button key={w.id} type="button" onClick={() => set(w.id)}
              className="flex items-center gap-2 rounded-full bg-asphalt px-4 py-2 text-[15px] font-bold text-flyer transition-colors hover:bg-asphalt-2">
              <WheelIcon id={w.id} size={18} />{w.label}
            </button>
          ))}
          <button type="button" onClick={() => set('all')} className="rounded-full px-3 py-2 text-[15px] font-bold underline-offset-4 hover:underline">
            Show everything
          </button>
        </div>
        <p className="w-full text-[13px] text-asphalt-2 sm:ml-auto sm:w-auto">Change it any time in the top corner.</p>
      </div>
    </div>
  )
}

// On filtered pages: what's being shown, and a way out
export function WheelNote({ label, misfit }: { label: string; misfit?: string }) {
  const set = useSetWheel()
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-asphalt-2">
      <span>{misfit ?? `Showing what fits ${label}.`}</span>
      <button type="button" onClick={() => set('all')} className="font-bold text-pool underline-offset-4 hover:underline">Show everything</button>
    </p>
  )
}
