import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getAllAccounts } from '@/services/bankaService'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import type { EmployeeAccountListItem } from '@/types'

export default function AccountsListPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<EmployeeAccountListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [imeFilter, setImeFilter] = useState('')
  const [prezimeFilter, setPrezimeFilter] = useState('')
  const [brojRacunaFilter, setBrojRacunaFilter] = useState('')

  const activeFilters = useRef({ ime: '', prezime: '', brojRacuna: '' })

  const fetchAccounts = useCallback(async (ime: string, prezime: string, brojRacuna: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAllAccounts({
        first_name:     ime || undefined,
        last_name:      prezime || undefined,
        account_number: brojRacuna || undefined,
      })
      setAccounts(res)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Greška pri učitavanju liste računa.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts('', '', '')
  }, [fetchAccounts])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    activeFilters.current = { ime: imeFilter, prezime: prezimeFilter, brojRacuna: brojRacunaFilter }
    fetchAccounts(imeFilter, prezimeFilter, brojRacunaFilter)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Svi računi klijenata</h1>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="card mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Ime"
            placeholder="Pretraži po imenu"
            value={imeFilter}
            onChange={(e) => setImeFilter(e.target.value)}
          />
          <Input
            label="Prezime"
            placeholder="Pretraži po prezimenu"
            value={prezimeFilter}
            onChange={(e) => setPrezimeFilter(e.target.value)}
          />
          <Input
            label="Broj računa"
            placeholder="npr. 105-0000..."
            value={brojRacunaFilter}
            onChange={(e) => setBrojRacunaFilter(e.target.value)}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            leftIcon={<Search className="h-4 w-4" />}
          >
            Pretraži
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="font-medium">Nema rezultata za traženi kriterijum</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Broj računa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ime i prezime vlasnika</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tip</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Vrsta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/employee/accounts/${account.broj_racuna}/cards`)}
                >
                  <td className="px-4 py-3 font-mono text-gray-900">{account.broj_racuna}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {account.ime_vlasnika} {account.prezime_vlasnika}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{account.vrsta_racuna}</td>
                  <td className="px-4 py-3 text-gray-700">{account.kategorija_racuna}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
