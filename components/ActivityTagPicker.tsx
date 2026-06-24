'use client'

import { ACTIVITIES } from '@/lib/activities'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  label?: string
}

export default function ActivityTagPicker({ value, onChange, label = 'Activities' }: Props) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  return (
    <div>
      {label && (
        <p className="mb-2.5 text-sm font-medium text-zinc-400">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITIES.map(a => {
          const selected = value.includes(a.id)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95"
              style={selected ? {
                borderColor: a.color,
                background: `${a.color}20`,
                color: a.color,
              } : {
                borderColor: '#3f3f46',
                background: 'transparent',
                color: '#71717a',
              }}
            >
              <span>{a.emoji}</span>
              {a.label}
            </button>
          )
        })}
      </div>
      {value.length > 0 && (
        <p className="mt-2 text-[11px] text-zinc-600">
          {value.length} activit{value.length === 1 ? 'y' : 'ies'} tagged
          <button onClick={() => onChange([])} className="ml-2 text-zinc-700 hover:text-zinc-400 transition-colors">
            clear
          </button>
        </p>
      )}
    </div>
  )
}
