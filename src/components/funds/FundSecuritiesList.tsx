import { useState } from 'react'
import type { FundSecurity } from '@/types/celina4'
import type { C4UserRole } from '@/types/celina4'

interface FundSecuritiesListProps {
  securities: FundSecurity[]
  userRole: C4UserRole
  fundId: string
  onSell: (ticker: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const fmtRSD = (v: number) =>
  new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 2 }).format(v)

export default function FundSecuritiesList({ securities, userRole, onSell }: FundSecuritiesListProps) {
  const [confirmTicker, setConfirmTicker] = useState<string | null>(null)
  const isSupervisor = userRole === 'SUPERVISOR'

  function handleSell(ticker: string) {
    setConfirmTicker(null)
    onSell(ticker)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">Hartije u fondu</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Ticker', 'Naziv', 'Cena', 'Promena', 'Volumen', 'Nabavna cena', 'Datum nabavke', ...(isSupervisor ? [''] : [])].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {securities.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  Fond nema hartija od vrednosti.
                </td>
              </tr>
            )}
            {securities.map(s => (
              <tr key={s.ticker} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{s.ticker}</td>
                <td className="px-4 py-3 text-gray-700">{s.name}</td>
                <td className="px-4 py-3 text-gray-700">{fmtRSD(s.price)}</td>
                <td className={`px-4 py-3 font-medium ${s.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-gray-700">{s.volume.toLocaleString('sr-RS')}</td>
                <td className="px-4 py-3 text-gray-700">{fmtRSD(s.initialMarginCost)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(s.acquisitionDate)}</td>
                {isSupervisor && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmTicker(s.ticker)}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Prodaj
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      {confirmTicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Potvrdi prodaju</h3>
            <p className="mt-2 text-sm text-gray-600">
              Da li ste sigurni da želite da prodate hartiju <strong>{confirmTicker}</strong>?
              Ova akcija se ne može poništiti.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setConfirmTicker(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Otkaži
              </button>
              <button
                onClick={() => handleSell(confirmTicker)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Prodaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
