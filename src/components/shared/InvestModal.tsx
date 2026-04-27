import { useState } from 'react'
import type { AccountListItem } from '@/types'

interface InvestModalProps {
  fundId: string
  mode: 'invest' | 'redeem'
  accounts: AccountListItem[]
  minimumContribution?: number
  liquidAssets?: number
  onConfirm: (amount: number, accountId: string) => void
  onClose: () => void
}

export default function InvestModal({
  mode,
  accounts,
  minimumContribution = 0,
  liquidAssets = 0,
  onConfirm,
  onClose,
}: InvestModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '')
  const [redeemAll, setRedeemAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numAmount = parseFloat(amount) || 0
  const needsLiquidation = mode === 'redeem' && numAmount > liquidAssets

  function handleSubmit() {
    setError(null)
    if (!accountId) { setError('Izaberite račun.'); return }
    if (mode === 'invest' && numAmount < minimumContribution) {
      setError(`Minimalna uplata je ${minimumContribution.toLocaleString('sr-RS')} RSD.`)
      return
    }
    if (numAmount <= 0 && !redeemAll) { setError('Unesite iznos.'); return }
    onConfirm(redeemAll ? -1 : numAmount, accountId)
  }

  const title = mode === 'invest' ? 'Uplata u fond' : 'Povlačenje iz fonda'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">{title}</h2>

        {mode === 'redeem' && (
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={redeemAll}
              onChange={e => setRedeemAll(e.target.checked)}
              className="rounded"
            />
            Povuci celu poziciju
          </label>
        )}

        {!redeemAll && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Iznos (RSD)
            </label>
            <input
              type="number"
              min={mode === 'invest' ? minimumContribution : 0}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {mode === 'invest' && (
              <p className="mt-1 text-xs text-gray-500">
                Minimalna uplata: {minimumContribution.toLocaleString('sr-RS')} RSD
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Račun</label>
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.naziv_racuna} — {a.broj_racuna} ({a.valuta_oznaka})
              </option>
            ))}
          </select>
        </div>

        {needsLiquidation && !redeemAll && (
          <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            ⚠ Iznos prelazi likvidna sredstva fonda ({liquidAssets.toLocaleString('sr-RS')} RSD).
            Povlačenje će zahtevati likvidaciju hartija.
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Otkaži
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Potvrdi
          </button>
        </div>
      </div>
    </div>
  )
}
