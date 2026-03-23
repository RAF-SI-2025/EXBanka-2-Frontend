import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Mail } from 'lucide-react'
import Dialog from '@/components/common/Dialog'
import { posaljiZahtevZaKarticu, potvrdiKreiranjeKartice } from '@/services/bankaService'

// ─── Konstante ────────────────────────────────────────────────────────────────

const TIP_KARTICE_OPTIONS = [
  { value: 'VISA',       label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'DINACARD',   label: 'DinaCard' },
  { value: 'AMEX',       label: 'American Express' },
] as const

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3
type Namena     = 'vlasnik' | 'ovlasceno'

interface OvlascenoLiceForm {
  ime:           string
  prezime:       string
  datumRodjenja: string  // 'YYYY-MM-DD'
  pol:           string
  email:         string
  telefon:       string
  adresa:        string
}

type FormErrors = Partial<Record<keyof OvlascenoLiceForm, string>>

const PRAZAN_FORM: OvlascenoLiceForm = {
  ime: '', prezime: '', datumRodjenja: '', pol: 'M', email: '', telefon: '', adresa: '',
}

// ─── Validacija ───────────────────────────────────────────────────────────────

function validirajFormu(form: OvlascenoLiceForm): FormErrors {
  const err: FormErrors = {}
  if (!form.ime.trim())           err.ime = 'Ime je obavezno'
  if (!form.prezime.trim())       err.prezime = 'Prezime je obavezno'
  if (!form.datumRodjenja)        err.datumRodjenja = 'Datum rođenja je obavezan'
  if (!form.email.trim()) {
    err.email = 'Email je obavezan'
  } else if (!form.email.includes('@') || !form.email.includes('.')) {
    err.email = 'Email nije ispravan'
  }
  if (!form.telefon.trim())       err.telefon = 'Broj telefona je obavezan'
  if (!form.adresa.trim())        err.adresa = 'Adresa je obavezna'
  return err
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface KarticaWizardModalProps {
  open:         boolean
  onClose:      () => void
  racunId:      string
  vrstaRacuna:  string   // 'LICNI' | 'POSLOVNI'
  nazivRacuna:  string
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function KarticaWizardModal({
  open, onClose, racunId, vrstaRacuna, nazivRacuna,
}: KarticaWizardModalProps) {
  const navigate    = useNavigate()
  const jePoslovni  = vrstaRacuna === 'POSLOVNI'

  // Wizard state
  const [step,       setStep]       = useState<WizardStep>(1)
  const [namena,     setNamena]     = useState<Namena>('vlasnik')
  const [tipKartice, setTipKartice] = useState('VISA')
  const [form,       setForm]       = useState<OvlascenoLiceForm>(PRAZAN_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  // API state
  const [loading, setLoading] = useState(false)
  const [greska,  setGreska]  = useState<string | null>(null)

  // OTP state
  const [otpCifre, setOtpCifre] = useState(['', '', '', '', '', ''])
  const [otpGreska, setOtpGreska] = useState<string | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null))

  // Auto-fokus na prvi OTP field kad se pređe na korak 3
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => otpRefs.current[0]?.focus(), 80)
      return () => clearTimeout(timer)
    }
  }, [step])

  // ── Reset pri zatvaranju ──────────────────────────────────────────────────

  function handleClose() {
    setStep(1)
    setNamena('vlasnik')
    setTipKartice('VISA')
    setForm(PRAZAN_FORM)
    setFormErrors({})
    setLoading(false)
    setGreska(null)
    setOtpCifre(['', '', '', '', '', ''])
    setOtpGreska(null)
    onClose()
  }

  // ── Naslovi koraka ────────────────────────────────────────────────────────

  function naslovKoraka(): string {
    if (step === 3) return 'Verifikacija'
    if (step === 2) return 'Podaci ovlašćenog lica'
    return 'Zatraži karticu'
  }

  // ── Slanje zahteva (Korak 1 → 3 ili Korak 2 → 3) ─────────────────────────

  async function posaljiZahtev(ol?: OvlascenoLiceForm) {
    setLoading(true)
    setGreska(null)
    try {
      await posaljiZahtevZaKarticu({
        account_id:  Number(racunId),
        tip_kartice: tipKartice,
        authorized_person: ol ? {
          ime:           ol.ime.trim(),
          prezime:       ol.prezime.trim(),
          datum_rodjenja: Math.floor(new Date(ol.datumRodjenja).getTime() / 1000),
          pol:           ol.pol,
          email:         ol.email.trim(),
          broj_telefona: ol.telefon.trim(),
          adresa:        ol.adresa.trim(),
        } : undefined,
      })
      setStep(3)
    } catch (err: unknown) {
      setGreska((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Korak 1 submit ────────────────────────────────────────────────────────

  function handleKorak1Submit() {
    setGreska(null)
    if (jePoslovni && namena === 'ovlasceno') {
      setStep(2)
    } else {
      posaljiZahtev()
    }
  }

  // ── Korak 2 submit ────────────────────────────────────────────────────────

  function handleKorak2Submit() {
    const greske = validirajFormu(form)
    if (Object.keys(greske).length > 0) {
      setFormErrors(greske)
      return
    }
    setFormErrors({})
    posaljiZahtev(form)
  }

  // ── OTP handlers ──────────────────────────────────────────────────────────

  function handleOtpChange(index: number, value: string) {
    const cifra = value.replace(/\D/g, '').slice(-1)
    const sledece = [...otpCifre]
    sledece[index] = cifra
    setOtpCifre(sledece)
    setOtpGreska(null)
    if (cifra && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpCifre[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const zalepljeno = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const sledece = [...otpCifre]
    for (let i = 0; i < 6; i++) sledece[i] = zalepljeno[i] ?? ''
    setOtpCifre(sledece)
    otpRefs.current[Math.min(zalepljeno.length, 5)]?.focus()
  }

  async function handleOtpSubmit() {
    const kod = otpCifre.join('')
    if (kod.length < 6) {
      setOtpGreska('Unesite svih 6 cifara koda')
      return
    }
    setLoading(true)
    setOtpGreska(null)
    try {
      await potvrdiKreiranjeKartice(kod)
      handleClose()
      navigate('/client/cards', {
        state: { successMessage: 'Kartica je uspešno kreirana!' },
      })
    } catch (err: unknown) {
      setOtpGreska((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step indicator ────────────────────────────────────────────────────────

  const ukupnoKoraka = jePoslovni && namena === 'ovlasceno' ? 3 : 2
  // Mapiramo interni step (1/2/3) na prikazani korak
  function prikazaniKorak(): number {
    if (step === 1) return 1
    if (step === 2) return 2   // samo za POSLOVNI+ovlasceno
    return ukupnoKoraka        // step 3 je uvek poslednji
  }

  // ── CSS helpers ───────────────────────────────────────────────────────────

  const inputCls = (greska?: string) =>
    `input-base${greska ? ' input-error' : ''}`

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={handleClose} title={naslovKoraka()} maxWidth="md">

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-6">
        {Array.from({ length: ukupnoKoraka }, (_, i) => {
          const br    = i + 1
          const aktivan = br === prikazaniKorak()
          const gotov   = br < prikazaniKorak()
          return (
            <div key={br} className="flex items-center gap-1.5">
              {i > 0 && (
                <div className={`h-px w-8 ${gotov ? 'bg-primary-500' : 'bg-gray-200'}`} />
              )}
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                aktivan ? 'bg-primary-700 text-white' :
                gotov   ? 'bg-primary-200 text-primary-700' :
                          'bg-gray-100 text-gray-400',
              ].join(' ')}>
                {gotov ? <CheckCircle className="h-4 w-4" /> : br}
              </div>
            </div>
          )
        })}
        <span className="ml-2 text-xs text-gray-400">
          Korak {prikazaniKorak()} od {ukupnoKoraka}
        </span>
      </div>

      {/* ── KORAK 1: Tip kartice + namena ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Zatraži novu karticu za račun{' '}
            <span className="font-semibold text-gray-800">{nazivRacuna}</span>.
          </p>

          {/* Tip kartice */}
          <div>
            <label className="form-label">Tip kartice</label>
            <div className="grid grid-cols-2 gap-2">
              {TIP_KARTICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipKartice(opt.value)}
                  className={[
                    'rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors',
                    tipKartice === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Namena (samo POSLOVNI) */}
          {jePoslovni && (
            <div>
              <label className="form-label">Namena kartice</label>
              <div className="space-y-2">
                {([
                  {
                    value: 'vlasnik',
                    label: 'Za mene (Vlasnika)',
                    opis:  'Kartica direktno vezana za Vaš poslovni račun',
                  },
                  {
                    value: 'ovlasceno',
                    label: 'Za novo ovlašćeno lice',
                    opis:  'Kartica za zaposlenog koji koristi ovaj račun',
                  },
                ] as const).map((opt) => (
                  <label
                    key={opt.value}
                    className={[
                      'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      namena === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="namena"
                      value={opt.value}
                      checked={namena === opt.value}
                      onChange={() => setNamena(opt.value)}
                      className="mt-0.5 accent-primary-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.opis}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {greska && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {greska}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Otkaži
            </button>
            <button
              type="button"
              onClick={handleKorak1Submit}
              disabled={loading}
              className="btn-primary"
            >
              {loading
                ? 'Slanje…'
                : jePoslovni && namena === 'ovlasceno'
                  ? 'Sledeći'
                  : 'Pošalji zahtev'}
            </button>
          </div>
        </div>
      )}

      {/* ── KORAK 2: Podaci ovlašćenog lica ───────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Unesite podatke ovlašćenog lica koje će koristiti karticu.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Ime <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls(formErrors.ime)}
                value={form.ime}
                onChange={(e) => setForm((f) => ({ ...f, ime: e.target.value }))}
                placeholder="Petar"
              />
              {formErrors.ime && (
                <p className="text-xs text-red-500 mt-1">{formErrors.ime}</p>
              )}
            </div>
            <div>
              <label className="form-label">
                Prezime <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls(formErrors.prezime)}
                value={form.prezime}
                onChange={(e) => setForm((f) => ({ ...f, prezime: e.target.value }))}
                placeholder="Petrović"
              />
              {formErrors.prezime && (
                <p className="text-xs text-red-500 mt-1">{formErrors.prezime}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Datum rođenja <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={inputCls(formErrors.datumRodjenja)}
                value={form.datumRodjenja}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm((f) => ({ ...f, datumRodjenja: e.target.value }))}
              />
              {formErrors.datumRodjenja && (
                <p className="text-xs text-red-500 mt-1">{formErrors.datumRodjenja}</p>
              )}
            </div>
            <div>
              <label className="form-label">Pol</label>
              <select
                className="input-base"
                value={form.pol}
                onChange={(e) => setForm((f) => ({ ...f, pol: e.target.value }))}
              >
                <option value="M">Muški</option>
                <option value="F">Ženski</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={inputCls(formErrors.email)}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="petar@firma.rs"
            />
            {formErrors.email && (
              <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Broj telefona <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls(formErrors.telefon)}
                value={form.telefon}
                onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                placeholder="+381611234567"
              />
              {formErrors.telefon && (
                <p className="text-xs text-red-500 mt-1">{formErrors.telefon}</p>
              )}
            </div>
            <div>
              <label className="form-label">
                Adresa <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls(formErrors.adresa)}
                value={form.adresa}
                onChange={(e) => setForm((f) => ({ ...f, adresa: e.target.value }))}
                placeholder="Ulica bb, Grad"
              />
              {formErrors.adresa && (
                <p className="text-xs text-red-500 mt-1">{formErrors.adresa}</p>
              )}
            </div>
          </div>

          {greska && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {greska}
            </div>
          )}

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => { setStep(1); setGreska(null) }}
              className="btn-secondary"
            >
              Nazad
            </button>
            <button
              type="button"
              onClick={handleKorak2Submit}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Slanje…' : 'Pošalji zahtev'}
            </button>
          </div>
        </div>
      )}

      {/* ── KORAK 3: OTP verifikacija ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Ikonica + tekst */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-7 h-7 text-primary-600" />
            </div>
            <p className="text-sm text-gray-700 font-medium">
              Unesite 6-cifreni kod koji smo Vam poslali na email.
            </p>
            <p className="text-xs text-gray-400 mt-1">Kod ističe za 5 minuta.</p>
          </div>

          {/* 6 odvojena input polja */}
          <div
            className="flex justify-center gap-2"
            onPaste={handleOtpPaste}
          >
            {otpCifre.map((cifra, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={cifra}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className={[
                  'w-11 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-colors',
                  'focus:outline-none focus:ring-0',
                  otpGreska
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : cifra
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-gray-300 text-gray-900 focus:border-primary-400',
                ].join(' ')}
              />
            ))}
          </div>

          {otpGreska && (
            <p className="text-sm text-center text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
              {otpGreska}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Otkaži
            </button>
            <button
              type="button"
              onClick={handleOtpSubmit}
              disabled={loading || otpCifre.join('').length < 6}
              className="btn-primary"
            >
              {loading ? 'Proveravanje…' : 'Potvrdi kod'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
