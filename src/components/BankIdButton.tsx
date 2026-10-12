import { Fingerprint } from 'lucide-react'

// BankID needs an Idura (Criipto) account. Until NEXT_PUBLIC_BANKID_ENABLED
// is "true" the button is shown as "Kommer snart" and does nothing.
const ENABLED = process.env.NEXT_PUBLIC_BANKID_ENABLED === 'true'

export default function BankIdButton({ label, onClick }: { label: string; onClick?: () => void }) {
  if (ENABLED) {
    return (
      <a href="/api/auth/bankid/start" onClick={onClick} className="btn btn-block mb-3 bg-[#0e5c9e] text-white hover:bg-[#0a4a80]">
        <Fingerprint size={18} strokeWidth={2} />
        {label}
      </a>
    )
  }
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className="btn btn-block mb-3 cursor-not-allowed border border-[#0e5c9e]/20 bg-[#0e5c9e]/10 text-[#0e5c9e]"
    >
      <Fingerprint size={18} strokeWidth={2} />
      {label}
      <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
        Kommer snart
      </span>
    </button>
  )
}
