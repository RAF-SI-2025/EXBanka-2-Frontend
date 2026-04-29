import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'
import { getClientAccounts, getBankAccounts } from '@/services/bankaService'
import type { AccountListItem } from '@/types'

export default function FundInvestPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const { activeFund, fetchFundDetail, investInFund } = useCelina4Store()

  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')

  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchFundDetail(id)
    setAccountsLoading(true)
    const loader = isSupervisor ? getBankAccounts() : getClientAccounts()
    loader
      .then(list => {
        // Fond ima RSD račun — može se uplaćivati samo iz RSD računa.
        const rsd = list.filter(a => a.valuta_oznaka === 'RSD')
        setAccounts(rsd)
        if (rsd.length > 0) setAccountId(rsd[0].id)
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [id, fetchFundDetail, isSupervisor])

  const fund = activeFund
  const numAmount = parseFloat(amount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!id) return
    if (!accountId) { setError('Izaberite račun.'); return }
    if (fund && numAmount < fund.minimumContribution) {
      setError(`Minimalna uplata je ${fund.minimumContribution.toLocaleString('sr-RS')} RSD.`)
      return
    }
    if (numAmount <= 0) { setError('Unesite iznos.'); return }
    setSubmitting(true)
    try {
      await investInFund(id, numAmount, accountId)
      navigate(`/funds/${id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!fund || accountsLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-gray-500">
        <button className="hover:text-gray-700" onClick={() => navigate(`/funds/${id}`)}>
          ← {fund.name}
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Investiraj</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Investiraj u {fund.name}</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Minimalna uplata: <strong>{fund.minimumContribution.toLocaleString('sr-RS')} RSD</strong>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Iznos (RSD) *</label>
          <input
            type="number"
            min={fund.minimumContribution}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Račun *</label>
          {accounts.length === 0 ? (
            <p className="text-sm text-red-600">Nemate dostupnih računa.</p>
          ) : (
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.naziv_racuna} — {a.broj_racuna} ({a.valuta_oznaka} {a.raspolozivo_stanje.toLocaleString('sr-RS')})
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/funds/${id}`)}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={submitting || accounts.length === 0}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Obrada...' : 'Potvrdi uplatu'}
          </button>
        </div>
      </form>

      <SAGAStatusToast />
    </div>
  )
}
