import { useEffect, useState } from 'react'
import type { OTCOffer } from '@/types/celina4'
import { useAuthStore } from '@/store/authStore'
import { getBankAccounts, getClientAccounts } from '@/services/bankaService'
import type { AccountListItem } from '@/types'

// CounterOfferForm — koristi se na detaljima ponude.
// Pravila po Fazi 2:
//   - Prihvatiti/poslati protivponudu sme samo strana kojoj je upućena
//     poslednja verzija (modified_by != caller).
//   - Prodavac može menjati seller_account_id (svoj račun za prijem premije);
//     kupac taj selektor ne vidi.
//   - Prilikom prihvatanja, ako prodavac još nije postavio račun, mora ga
//     izabrati u accept koraku.

interface CounterOfferData {
  amount: number
  pricePerStock: number
  premium: number
  settlementDate: string
  sellerAccountId?: number
}

interface CounterOfferFormProps {
  offer: OTCOffer
  onSubmit: (data: CounterOfferData) => void
  onAccept: (sellerAccountId?: number) => void
  onReject: () => void
  isLoading?: boolean
}

export default function CounterOfferForm({ offer, onSubmit, onAccept, onReject, isLoading }: CounterOfferFormProps) {
  const { user, hasPermission } = useAuthStore()
  const callerID = String(user?.id ?? '')
  const isCaller = (id: string) => callerID !== '' && callerID === id
  const isBuyer = isCaller(offer.buyerId)
  const isSeller = isCaller(offer.sellerId)
  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')
  const isMyTurn = offer.modifiedBy !== callerID && offer.status === 'ACTIVE'

  const [form, setForm] = useState<CounterOfferData>({
    amount: offer.amount,
    pricePerStock: offer.pricePerStock,
    premium: offer.premium,
    settlementDate: offer.settlementDate.slice(0, 10),
  })

  // Učitaj prodavčeve račune samo ako je caller prodavac (kupac ne menja seller_account_id).
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [sellerAccountId, setSellerAccountId] = useState<string>(
    offer.sellerAccountId ? String(offer.sellerAccountId) : '',
  )
  useEffect(() => {
    if (!isSeller) return
    let alive = true
    const loadAccounts = isSupervisor ? getBankAccounts : getClientAccounts
    loadAccounts()
      .then((accs) => {
        if (!alive) return
        setAccounts(accs)
        // Ako račun nije postavljen na ponudi, preselektuj prvi dostupni račun
        // da prodavac može odmah da prihvati ponudu.
        if (!offer.sellerAccountId && accs.length > 0) {
          setSellerAccountId((prev) => prev || accs[0].id)
        }
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [isSeller, isSupervisor, offer.sellerAccountId])

  function handleChange(field: keyof CounterOfferData, value: string) {
    setForm(prev => ({
      ...prev,
      [field]: field === 'settlementDate' ? value : parseFloat(value) || 0,
    }))
  }

  const fields: { key: keyof CounterOfferData; label: string; type: string; min?: number }[] = [
    { key: 'amount', label: 'Količina', type: 'number', min: 1 },
    { key: 'pricePerStock', label: 'Cena po akciji (USD)', type: 'number', min: 0 },
    { key: 'premium', label: 'Premija (USD)', type: 'number', min: 0 },
    { key: 'settlementDate', label: 'Datum poravnanja', type: 'date' },
  ]

  const sellerAccNum = sellerAccountId ? Number(sellerAccountId) : undefined
  const sellerAccRequired = isSeller && !offer.sellerAccountId && !sellerAccNum
  

  function handleSubmitCounter() {
    onSubmit({ ...form, ...(isSeller && sellerAccNum ? { sellerAccountId: sellerAccNum } : {}) })
  }

  function handleAccept() {
    onAccept(isSeller && sellerAccNum ? sellerAccNum : undefined)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {offer.stock.ticker} — {offer.stock.name}
        </h2>
        <p className="text-sm text-gray-500">
          {offer.stock.exchange}{' '}
          {offer.status !== 'ACTIVE' && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {offer.status}
            </span>
          )}
        </p>
        {!isMyTurn && offer.status === 'ACTIVE' && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Čeka se odgovor druge strane. Ne možete prihvatiti ili odbiti ponudu koju ste sami poslednji izmenili.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(f => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{f.label}</label>
            <input
              type={f.type}
              min={f.min}
              value={form[f.key] as string | number}
              onChange={e => handleChange(f.key, e.target.value)}
              disabled={offer.status !== 'ACTIVE'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        ))}
      </div>

      {/* Prodavac bira svoj račun za prijem premije. */}
      {isSeller && offer.status === 'ACTIVE' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Vaš račun za prijem premije {offer.sellerAccountId ? '' : '*'}
          </label>
          <select
            value={sellerAccountId}
            onChange={(e) => setSellerAccountId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">— izaberite račun —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.broj_racuna} · {a.naziv_racuna} ({a.valuta_oznaka})
              </option>
            ))}
          </select>
          {offer.sellerAccountId && (
            <p className="mt-1 text-xs text-gray-500">
              Trenutno postavljen račun: #{offer.sellerAccountId}. Promenite ga ako želite.
            </p>
          )}
        </div>
      )}

      {/* Kupac vidi svoj već-izabran račun (read-only). */}
      {isBuyer && offer.buyerAccountId && (
        <p className="text-xs text-gray-500">
          Premiju ćete platiti sa računa #{offer.buyerAccountId}.
        </p>
      )}

      {offer.status === 'ACTIVE' && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading || !isMyTurn || sellerAccRequired}
            title={
              !isMyTurn
                ? 'Ne možete prihvatiti ponudu koju ste sami poslednji izmenili.'
                : sellerAccRequired
                  ? 'Izaberite račun za prijem premije.'
                  : ''
            }
            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prihvati
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isMyTurn ? 'Odbij' : 'Povuci ponudu'}
          </button>
          <button
            type="button"
            onClick={handleSubmitCounter}
            disabled={isLoading || !isMyTurn}
            title={!isMyTurn ? 'Čeka se odgovor druge strane.' : ''}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Pošalji kontraponudu
          </button>
        </div>
      )}
    </div>
  )
}
