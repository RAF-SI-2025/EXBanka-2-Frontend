import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllAccounts, getAccountCards, changeCardStatus } from '@/services/bankaService'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import type { EmployeeAccountListItem, EmployeeKarticaListItem } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  AKTIVNA:      'Aktivna',
  BLOKIRANA:    'Blokirana',
  DEAKTIVIRANA: 'Deaktivirana',
}

const STATUS_BADGE: Record<string, string> = {
  AKTIVNA:      'bg-green-100 text-green-800',
  BLOKIRANA:    'bg-yellow-100 text-yellow-800',
  DEAKTIVIRANA: 'bg-red-100 text-red-800',
}

export default function AccountCardsPage() {
  const { broj_racuna } = useParams<{ broj_racuna: string }>()
  const navigate = useNavigate()

  const [account, setAccount] = useState<EmployeeAccountListItem | null>(null)
  const [kartice, setKartice] = useState<EmployeeKarticaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState<string | null>(null) // broj_kartice being changed

  const fetchData = useCallback(async () => {
    if (!broj_racuna) return
    setLoading(true)
    setError(null)
    try {
      const [accountList, cards] = await Promise.all([
        getAllAccounts({ account_number: broj_racuna }),
        getAccountCards(broj_racuna),
      ])
      setAccount(accountList[0] ?? null)
      setKartice(cards)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Greška pri učitavanju podataka.')
    } finally {
      setLoading(false)
    }
  }, [broj_racuna])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleStatusChange(kartica: EmployeeKarticaListItem, noviStatus: string) {
    setChangingStatus(kartica.broj_kartice)
    try {
      await changeCardStatus(kartica.broj_kartice, noviStatus)
      setKartice((prev) =>
        prev.map((k) =>
          k.broj_kartice === kartica.broj_kartice ? { ...k, status: noviStatus } : k
        )
      )
      toast.success(`Kartica ${STATUS_LABEL[noviStatus]?.toLowerCase() ?? noviStatus}`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Greška pri promeni statusa kartice.')
    } finally {
      setChangingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
          Nazad
        </Button>
        <ErrorMessage message={error} />
      </div>
    )
  }

  return (
    <div>
      {/* Back */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazad na listu računa
        </button>
      </div>

      {/* Account header */}
      {account && (
        <div className="card mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Kartice računa</h1>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-gray-500 font-medium">Broj računa</dt>
              <dd className="font-mono text-gray-900 mt-0.5">{account.broj_racuna}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Vlasnik</dt>
              <dd className="text-gray-900 mt-0.5">{account.ime_vlasnika} {account.prezime_vlasnika}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Tip</dt>
              <dd className="text-gray-900 mt-0.5">{account.vrsta_racuna}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Vrsta</dt>
              <dd className="text-gray-900 mt-0.5">{account.kategorija_racuna}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Cards table */}
      <div className="card p-0 overflow-hidden">
        {kartice.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="font-medium">Ovaj račun nema kartica</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Broj kartice</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vlasnik</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kartice.map((kartica) => {
                const isChanging = changingStatus === kartica.broj_kartice
                return (
                  <tr key={kartica.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">{kartica.broj_kartice}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {kartica.ime_vlasnika} {kartica.prezime_vlasnika}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{kartica.email_vlasnika}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          STATUS_BADGE[kartica.status] ?? 'bg-gray-100 text-gray-700',
                        ].join(' ')}
                      >
                        {STATUS_LABEL[kartica.status] ?? kartica.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {kartica.status === 'AKTIVNA' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={isChanging}
                              onClick={() => handleStatusChange(kartica, 'BLOKIRANA')}
                            >
                              Blokiraj
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={isChanging}
                              onClick={() => handleStatusChange(kartica, 'DEAKTIVIRANA')}
                            >
                              Deaktiviraj
                            </Button>
                          </>
                        )}
                        {kartica.status === 'BLOKIRANA' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              loading={isChanging}
                              onClick={() => handleStatusChange(kartica, 'AKTIVNA')}
                            >
                              Deblokiraj
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={isChanging}
                              onClick={() => handleStatusChange(kartica, 'DEAKTIVIRANA')}
                            >
                              Deaktiviraj
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
