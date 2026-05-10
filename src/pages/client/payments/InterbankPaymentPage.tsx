/**
 * InterbankPaymentPage — "Novo međubankarsko plaćanje" stranica.
 *
 * Tok:
 *   1. Korisnik bira svoj račun pošiljaoca (devizni ili tekući).
 *   2. Unosi račun primaoca, ime, iznos, valutu, šifru plaćanja, svrhu i poziv na broj.
 *   3. Klikom na "Pošalji" pokreće se POST /bank/interbank/payments koji:
 *        - lokalno priprema (rezervacija sredstava),
 *        - šalje NEW_TX banci primaoca,
 *        - na YES → COMMIT_TX, status COMPLETED,
 *        - na NO ili network error → ROLLBACK + status FAILED.
 *   4. UI prikazuje "Transakcija u obradi…", zatim success ili error sa razlogom.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { getClientAccounts } from '@/services/bankaService'
import { createInterbankPayment } from '@/services/interbankService'
import type { AccountListItem } from '@/types'

type Step = 'form' | 'submitting' | 'done'

export default function InterbankPaymentPage() {
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('form')
  const [resultStatus, setResultStatus] = useState<'success' | 'failed' | null>(null)
  const [resultMessage, setResultMessage] = useState<string>('')

  // Form fields
  const [senderAccountId, setSenderAccountId] = useState('')
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('RSD')
  const [paymentCode, setPaymentCode] = useState('289')
  const [paymentPurpose, setPaymentPurpose] = useState('')
  const [callNumber, setCallNumber] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    getClientAccounts()
      .then((accs) => {
        setAccounts(accs)
        if (accs.length > 0) setSenderAccountId(accs[0].id)
      })
      .catch((e) => setAccountsError(String(e?.message ?? e)))
      .finally(() => setLoadingAccounts(false))
  }, [])

  function validate(): string | null {
    if (!senderAccountId) return 'Izaberite račun pošiljaoca.'
    if (!recipientAccountNumber || recipientAccountNumber.length < 10) {
      return 'Broj računa primaoca mora imati najmanje 10 cifara.'
    }
    if (!recipientName.trim()) return 'Ime primaoca je obavezno.'
    const amt = parseFloat(amount)
    if (Number.isNaN(amt) || amt <= 0) return 'Iznos mora biti broj veći od 0.'
    if (!currency) return 'Valuta je obavezna.'
    if (!/^\d{3}$/.test(paymentCode)) return 'Šifra plaćanja mora biti 3 cifre.'
    if (!paymentPurpose.trim()) return 'Svrha plaćanja je obavezna.'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setFormError(null)
    setStep('submitting')
    try {
      const result = await createInterbankPayment({
        senderAccountId: parseInt(senderAccountId, 10),
        recipientAccountNumber,
        recipientName,
        amount: parseFloat(amount),
        currency,
        paymentCode,
        paymentPurpose,
        callNumber,
        message,
      })
      if (result.status === 'COMMITTED') {
        setResultStatus('success')
        setResultMessage(`Plaćanje uspešno. ID: ${result.transactionForeignId}`)
      } else {
        setResultStatus('failed')
        setResultMessage(
          `Plaćanje neuspešno (status: ${result.status})${result.failureReason ? ` — ${result.failureReason}` : ''}.`
        )
      }
    } catch (e: unknown) {
      setResultStatus('failed')
      setResultMessage(`Greška: ${String((e as { message?: string })?.message ?? e)}`)
    } finally {
      setStep('done')
    }
  }

  function handleBack() {
    navigate('/client')
  }

  function handleNew() {
    setRecipientAccountNumber('')
    setRecipientName('')
    setAmount('')
    setPaymentPurpose('')
    setCallNumber('')
    setMessage('')
    setResultStatus(null)
    setResultMessage('')
    setStep('form')
  }

  if (loadingAccounts) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-gray-500">Učitavam račune…</p>
      </div>
    )
  }
  if (accountsError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-red-600">Greška: {accountsError}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} /> Nazad
      </button>

      <h1 className="text-2xl font-bold mb-2">Novo međubankarsko plaćanje</h1>
      <p className="text-sm text-gray-500 mb-6">
        Plaćanje koristi si-tx-proto međubankarski protokol (NEW_TX → COMMIT_TX).
      </p>

      {step === 'form' && (
        <div className="space-y-4 bg-white p-6 rounded-lg shadow">
          <Field label="Račun pošiljaoca">
            <select
              data-testid="sender-account"
              value={senderAccountId}
              onChange={(e) => setSenderAccountId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.broj_racuna} — {a.naziv_racuna} ({a.valuta_oznaka})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Broj računa primaoca">
            <input
              data-testid="recipient-account"
              value={recipientAccountNumber}
              onChange={(e) => setRecipientAccountNumber(e.target.value)}
              placeholder="npr. 333-1234567890-12"
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="Ime primaoca">
            <input
              data-testid="recipient-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Iznos">
              <input
                data-testid="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </Field>
            <Field label="Valuta">
              <select
                data-testid="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {['RSD', 'EUR', 'USD', 'CHF', 'JPY', 'AUD', 'CAD', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Šifra plaćanja">
              <input
                data-testid="payment-code"
                value={paymentCode}
                onChange={(e) => setPaymentCode(e.target.value)}
                placeholder="3 cifre"
                className="w-full border rounded px-3 py-2"
              />
            </Field>
            <Field label="Poziv na broj (opciono)">
              <input
                data-testid="call-number"
                value={callNumber}
                onChange={(e) => setCallNumber(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </Field>
          </div>

          <Field label="Svrha plaćanja">
            <input
              data-testid="payment-purpose"
              value={paymentPurpose}
              onChange={(e) => setPaymentPurpose(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="Poruka primaocu (opciono)">
            <input
              data-testid="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <button
            data-testid="submit-payment"
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
          >
            Pošalji plaćanje
          </button>
        </div>
      )}

      {step === 'submitting' && (
        <div className="bg-white p-8 rounded-lg shadow flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-gray-700">Transakcija u obradi…</p>
          <p className="text-sm text-gray-500">
            Poruka NEW_TX poslata drugoj banci. Čekamo glas (YES/NO).
          </p>
        </div>
      )}

      {step === 'done' && resultStatus === 'success' && (
        <div data-testid="payment-success" className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-green-600" />
            <h2 className="text-lg font-semibold text-green-800">Uspešno</h2>
          </div>
          <p className="text-sm text-green-700 mb-4">{resultMessage}</p>
          <div className="flex gap-2">
            <button
              onClick={handleNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Novo plaćanje
            </button>
            <button
              onClick={handleBack}
              className="border px-4 py-2 rounded text-sm"
            >
              Nazad
            </button>
          </div>
        </div>
      )}

      {step === 'done' && resultStatus === 'failed' && (
        <div data-testid="payment-failed" className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">Plaćanje nije izvršeno</h2>
          </div>
          <p className="text-sm text-red-700 mb-4">{resultMessage}</p>
          <div className="flex gap-2">
            <button
              onClick={handleNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Pokušaj ponovo
            </button>
            <button
              onClick={handleBack}
              className="border px-4 py-2 rounded text-sm"
            >
              Nazad
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 block mb-1">{label}</span>
      {children}
    </label>
  )
}
