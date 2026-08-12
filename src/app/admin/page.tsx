import { Users, Home, MessageSquare, TrendingUp, Eye, Heart, ArrowUpRight } from 'lucide-react'
import { MOCK_LISTINGS } from '@/lib/mock-data'

const stats = [
  { label: 'Aktiva användare', value: '1 284', change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Aktiva annonser', value: '847', change: '+8%', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Genomförda byten', value: '340', change: '+23%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Meddelanden idag', value: '2 041', change: '+5%', icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
]

const segments = [
  { label: 'Södermalm — 2-3 rum', count: 234, pct: 72 },
  { label: 'Östermalm — 2 rum', count: 189, pct: 58 },
  { label: 'Vasastan — 3-4 rum', count: 156, pct: 48 },
  { label: 'Kungsholmen — 1-2 rum', count: 134, pct: 41 },
  { label: 'Nacka → City', count: 98, pct: 30 },
]

export default function AdminPage() {
  const topListings = MOCK_LISTINGS.sort((a, b) => b.interestedCount - a.interestedCount).slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Bytaren · Senaste 30 dagarna</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'Allt'].map((t) => (
            <button
              key={t}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                t === '30d'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <span className="text-xs font-semibold text-emerald-600">{stat.change}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Konverteringstratt</h2>
          <div className="space-y-3">
            {[
              { label: 'Besöker sidan', value: 12840, pct: 100, color: 'bg-blue-200' },
              { label: 'Skapar konto', value: 4210, pct: 33, color: 'bg-blue-400' },
              { label: 'Publicerar annons', value: 1890, pct: 15, color: 'bg-emerald-400' },
              { label: 'Skickar meddelande', value: 980, pct: 8, color: 'bg-emerald-500' },
              { label: 'Genomför byte', value: 340, pct: 3, color: 'bg-emerald-600' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-medium text-gray-900">
                    {row.value.toLocaleString('sv-SE')}{' '}
                    <span className="text-gray-400 font-normal">({row.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User segments */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Populäraste sökningar</h2>
            <button className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
              Skicka utskick <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {segments.map((seg, i) => (
              <div key={seg.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{seg.label}</span>
                  <span className="text-gray-500">{seg.count} pers</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${seg.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-5 w-full py-2.5 border border-emerald-300 text-emerald-700 text-sm font-medium rounded-xl hover:bg-emerald-50 transition-colors">
            Skapa segmenterat e-postutskick
          </button>
        </div>
      </div>

      {/* Top listings */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Mest visade annonser</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Annons</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Visningar</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Intresserade</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Matcher</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Konv.</th>
              </tr>
            </thead>
            <tbody>
              {topListings.map((l, i) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={l.images[0]}
                        alt=""
                        className="w-10 h-8 object-cover rounded-lg flex-shrink-0"
                      />
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1 text-xs">{l.title}</p>
                        <p className="text-gray-400 text-xs">{l.district}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {(l.interestedCount * 12 + 40).toLocaleString('sv-SE')}
                  </td>
                  <td className="py-3 text-right text-gray-700">{l.interestedCount}</td>
                  <td className="py-3 text-right">
                    <span className="text-emerald-700 font-medium">{l.matchCount}</span>
                  </td>
                  <td className="py-3 text-right text-gray-500">
                    {Math.round((l.matchCount / (l.interestedCount || 1)) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
