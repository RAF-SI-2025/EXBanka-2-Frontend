import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CreditCard, ShieldAlert, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { getMojeKartice, blokirajKarticu } from '@/services/bankaService'
import Dialog from '@/components/common/Dialog'
import type { KarticaKlijenta } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maskira broj kartice u format: prve 4 cifre + 8 zvezdica + zadnje 4 cifre.
 * Primer: "5798123456785571" -> "5798********5571"
 */
function maskirajBrojKartice(broj: string): string {
  if (broj.length < 8) return broj
  return `${broj.slice(0, 4)}${'*'.repeat(8)}${broj.slice(-4)}`
}

function formatDatumIsteka(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yy = String(d.getUTCFullYear()).slice(-2)
  return `${mm}/${yy}`
}

function karticaBgClass(kartica: KarticaKlijenta): string {
  if (kartica.status === 'BLOKIRANA')    return 'from-gray-500 to-gray-700'
  if (kartica.status === 'DEAKTIVIRANA') return 'from-gray-400 to-gray-500'
  switch (kartica.tip_kartice) {
    case 'VISA':       return 'from-blue-600 to-blue-800'
    case 'MASTERCARD': return 'from-red-600 to-orange-700'
    case 'DINACARD':   return 'from-blue-500 to-indigo-700'
    case 'AMEX':       return 'from-emerald-600 to-teal-800'
    default:           return 'from-gray-600 to-gray-800'
  }
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    AKTIVNA:      { label: 'Aktivna',      cls: 'bg-green-400/20 text-green-100' },
    BLOKIRANA:    { label: 'Blokirana',    cls: 'bg-yellow-400/20 text-yellow-100' },
    DEAKTIVIRANA: { label: 'Deaktivirana', cls: 'bg-red-400/20 text-red-100' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-white/10 text-white/80' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

// ─── Podkomponenta: jedna kartica ─────────────────────────────────────────────

interface KarticaCardProps {
  kartica: KarticaKlijenta
  onBlokiranje: (kartica: KarticaKlijenta) => void
}

function KarticaCard({ kartica, onBlokiranje }: KarticaCardProps) {
  const jeAktivna = kartica.status === 'AKTIVNA'

  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      {/* Vizuelni prikaz kartice */}
      <div className={`bg-gradient-to-br ${karticaBgClass(kartica)} p-5 text-white`}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">
            {kartica.vrsta_kartice === 'DEBIT' ? 'Debitna' : 'Kreditna'}
          </span>
          <span className="text-sm font-bold opacity-90">{kartica.tip_kartice}</span>
        </div>

        <p className="text-lg font-mono tracking-widest mb-5 select-none">
          {maskirajBrojKartice(kartica.broj_kartice)}
        </p>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs opacity-60 mb-0.5 uppercase tracking-wider">Istice</p>
            <p className="text-sm font-semibold">{formatDatumIsteka(kartica.datum_isteka)}</p>
          </div>
          <StatusBadge status={kartica.status} />
        </div>
      </div>

      {/* Podaci o racunu */}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500 truncate">{kartica.naziv_racuna}</p>
        </div>
        <p className="text-xs text-gray-400 font-mono pl-5 truncate">{kartica.broj_racuna}</p>
      </div>

      {/* Akcija */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onBlokiranje(kartica)}
          disabled={!jeAktivna}
          className={
            jeAktivna
              ? 'btn-danger w-full text-sm'
              : 'btn btn-secondary w-full text-sm opacity-50 cursor-not-allowed'
          }
        >
          <ShieldAlert className="h-4 w-4" />
          {kartica.status === 'BLOKIRANA'
            ? 'Kartica je blokirana'
            : kartica.status === 'DEAKTIVIRANA'
            ? 'Kartica je deaktivirana'
            : 'Blokiraj karticu'}
        </button>
      </div>
    </div>
  )
}

// ─── Glavna stranica ──────────────────────────────────────────────────────────

export default function KarticeListaPage() {
  const location = useLocation()
  const [kartice, setKartice] = useState<KarticaKlijenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  useEffect(() => {
    const msg = (location.state as { successMessage?: string } | null)?.successMessage
    if (msg) {
      setSuccessToast(msg)
      const timer = setTimeout(() => setSuccessToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  // Modal za potvrdu blokiranja
  const [odabranaKartica, setOdabranaKartica] = useState<KarticaKlijenta | null>(null)
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [blockError, setBlockError]     = useState<string | null>(null)

  useEffect(() => {
    getMojeKartice()
      .then(setKartice)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function otvoriConfirm(kartica: KarticaKlijenta) {
    setOdabranaKartica(kartica)
    setBlockError(null)
    setConfirmOpen(true)
  }

  function zatvoriConfirm() {
    setConfirmOpen(false)
    setOdabranaKartica(null)
    setBlockError(null)
  }

  async function handleBlokiranje() {
    if (!odabranaKartica) return
    setBlockLoading(true)
    setBlockError(null)
    try {
      await blokirajKarticu(odabranaKartica.id)
      setKartice((prev) =>
        prev.map((k) =>
          k.id === odabranaKartica.id ? { ...k, status: 'BLOKIRANA' } : k
        )
      )
      zatvoriConfirm()
    } catch (err: unknown) {
      setBlockError((err as Error).message)
    } finally {
      setBlockLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Moje kartice</h1>

      {/* Toast za uspesno kreiranje kartice */}
      {successToast && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <span className="flex-1">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Greska pri ucitavanju */}
      {error && (
        <div className="card flex items-center gap-3 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card text-center py-12 text-gray-400">Ucitavanje kartica...</div>
      ) : kartice.length === 0 && !error ? (
        <div className="card text-center py-12 text-gray-500">
          <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Nemate nijednu karticu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kartice.map((kartica) => (
            <KarticaCard
              key={kartica.id}
              kartica={kartica}
              onBlokiranje={otvoriConfirm}
            />
          ))}
        </div>
      )}

      {/* Modal za potvrdu blokiranja */}
      <Dialog
        open={confirmOpen}
        onClose={zatvoriConfirm}
        title="Blokiranje kartice"
        maxWidth="sm"
      >
        <div className="space-y-5">
          {/* Upozorenje */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 space-y-1">
            <p className="font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Da li ste sigurni da zelite da blokirate ovu karticu?
            </p>
            <p>Kartica nece biti u funkciji sve dok je ne odblokira banka.</p>
          </div>

          {/* Podaci o kartici */}
          {odabranaKartica && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Broj kartice</span>
                <span className="font-mono font-medium">
                  {maskirajBrojKartice(odabranaKartica.broj_kartice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Racun</span>
                <span className="font-medium">{odabranaKartica.naziv_racuna}</span>
              </div>
            </div>
          )}

          {/* Greska pri blokiranju */}
          {blockError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {blockError}
            </div>
          )}

          {/* Akcije */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={zatvoriConfirm}
              disabled={blockLoading}
              className="btn btn-secondary"
            >
              Otkazi
            </button>
            <button
              type="button"
              onClick={handleBlokiranje}
              disabled={blockLoading}
              className="btn-danger"
            >
              {blockLoading ? 'Blokiranje...' : 'Blokiraj karticu'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
