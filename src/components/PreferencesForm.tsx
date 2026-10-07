'use client'

// "Det här söker jag" — the fields of a swap_preferences row. Controlled:
// the parent owns the value and decides when to save (onboarding saves on
// "Nästa", Mina sidor has its own save button).
import { STOCKHOLM_DISTRICTS, type SwapPreferencesInput } from '@/types'
import { cn } from '@/lib/utils'

interface PreferencesFormProps {
  value: SwapPreferencesInput
  onChange: (next: SwapPreferencesInput) => void
  disabled?: boolean
}

const ROOM_OPTIONS = [1, 2, 3, 4, 5]

const NEEDS: { key: keyof Pick<SwapPreferencesInput, 'needsElevator' | 'needsBalcony' | 'needsPets' | 'needsWheelchair' | 'needsStroller'>; label: string }[] = [
  { key: 'needsElevator', label: 'Hiss' },
  { key: 'needsBalcony', label: 'Balkong' },
  { key: 'needsPets', label: 'Husdjur tillåtna' },
  { key: 'needsWheelchair', label: 'Rullstolsanpassat' },
  { key: 'needsStroller', label: 'Barnvagnsanpassat' },
]

const chip = (on: boolean) =>
  cn(
    'border transition-colors disabled:opacity-60',
    on
      ? 'bg-emerald-600 border-emerald-600 text-white'
      : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-600 hover:text-emerald-600'
  )

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function parseNumber(raw: string): number | null {
  const n = Number(raw.replace(/\s/g, ''))
  return raw.trim() && Number.isFinite(n) && n > 0 ? n : null
}

export default function PreferencesForm({ value, onChange, disabled = false }: PreferencesFormProps) {
  const set = (patch: Partial<SwapPreferencesInput>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-6">
      <fieldset disabled={disabled}>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Önskade stadsdelar</legend>
        <p className="text-xs text-gray-400 mb-2">Välj inga om alla stadsdelar går bra.</p>
        <div className="flex flex-wrap gap-2">
          {STOCKHOLM_DISTRICTS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={value.districts.includes(d)}
              onClick={() => set({ districts: toggle(value.districts, d) })}
              className={cn('px-3 py-1.5 rounded-full text-[13px] font-medium', chip(value.districts.includes(d)))}
            >
              {d}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Antal rum</legend>
        <p className="text-xs text-gray-400 mb-2">Välj alla som passar, eller inga om antalet inte spelar roll.</p>
        <div className="flex gap-2">
          {ROOM_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={value.rooms.includes(r)}
              onClick={() => set({ rooms: toggle(value.rooms, r) })}
              className={cn('flex-1 min-h-[44px] rounded-xl text-sm font-medium', chip(value.rooms.includes(r)))}
            >
              {r === 5 ? '5+' : r}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <div>
          <label htmlFor="pref-max-rent" className="label">Högsta hyra (kr/mån)</label>
          <input
            id="pref-max-rent"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            placeholder="Ingen gräns"
            disabled={disabled}
            value={value.maxRent ?? ''}
            onChange={(e) => set({ maxRent: parseNumber(e.target.value) })}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="pref-min-area" className="label">Minsta yta (m²)</label>
          <input
            id="pref-min-area"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Ingen gräns"
            disabled={disabled}
            value={value.minArea ?? ''}
            onChange={(e) => set({ minArea: parseNumber(e.target.value) })}
            className="input"
          />
        </div>
      </div>

      <fieldset disabled={disabled}>
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Måste finnas</legend>
        <div className="flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <button
              key={n.key}
              type="button"
              aria-pressed={value[n.key]}
              onClick={() => set({ [n.key]: !value[n.key] })}
              className={cn('px-3 min-h-[40px] rounded-xl text-sm font-medium', chip(value[n.key]))}
            >
              {n.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
