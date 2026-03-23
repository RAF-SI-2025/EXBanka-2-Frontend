/**
 * CreateAccount — "Kreiraj račun" wizard for employees.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import ErrorMessage from '@/components/common/ErrorMessage'
import UserSelect from '@/components/employee/UserSelect'
import { useDictionaries } from '@/context/DictionaryContext'
import { createAccount } from '@/services/bankaService'
import type { ClientPreview } from '@/types'

// ─── Validation schema ────────────────────────────────────────────────────────

const TIPOVI_KARTICE = [
  { value: 'VISA',       label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'DINACARD',   label: 'DinaCard' },
  { value: 'AMEX',       label: 'American Express' },
] as const

const KARTICE_LIMITI = {
  LICNI:    'Lični račun: max 2 kartice',
  POSLOVNI: 'Poslovni račun: max 1 kartica po osobi',
} as const

const schema = z
  .object({
    kategorija:          z.enum(['TEKUCI', 'DEVIZNI']),
    tip:                 z.enum(['LICNI', 'POSLOVNI']),
    valuta_id:           z.string().min(1, 'Valuta je obavezna'),
    naziv_racuna:        z.string().min(1, 'Naziv računa je obavezan'),
    podvrsta:            z.string().optional(),
    pocetno_stanje:      z.coerce.number().min(0, 'Početno stanje ne može biti negativno'),
    napravi_karticu:     z.boolean(),
    tip_kartice:         z.string().optional(),
    naziv_firme:         z.string().optional(),
    maticni_broj:        z.string().optional(),
    pib:                 z.string().optional(),
    adresa_firme:        z.string().optional(),
    sifra_delatnosti_id: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.kategorija === 'TEKUCI' && !d.podvrsta) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obavezno polje', path: ['podvrsta'] })
    }
    if (d.napravi_karticu && !d.tip_kartice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Odaberite tip kartice', path: ['tip_kartice'] })
    }
    if (d.tip === 'POSLOVNI') {
      if (!d.naziv_firme)         ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obavezno polje', path: ['naziv_firme'] })
      if (!d.maticni_broj)        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obavezno polje', path: ['maticni_broj'] })
      if (!d.pib)                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obavezno polje', path: ['pib'] })
      if (!d.adresa_firme)        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obavezno polje', path: ['adresa_firme'] })
      if (!d.sifra_delatnosti_id) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obavezno polje', path: ['sifra_delatnosti_id'] })
    }
  })

type FormValues = z.infer<typeof schema>

// ─── Subcategory options & mapping ───────────────────────────────────────────

const PODVRSTE_LICNI    = ['Standardni', 'Štedni', 'Penzionerski', 'Za mlade', 'Za studente', 'Za nezaposlene']
const PODVRSTE_POSLOVNI = ['DOO', 'AD', 'Fondacija']

const PODVRSTA_MAP: Record<string, string> = {
  'Standardni':     'STANDARDNI',
  'Štedni':         'STEDNI',
  'Penzionerski':   'PENZIONERSKI',
  'Za mlade':       'MLADI',
  'Za studente':    'STUDENTI',
  'Za nezaposlene': 'NEZAPOSLENI',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateAccount() {
  const navigate = useNavigate()
  const { currencies, delatnosti } = useDictionaries()

  const [vlasnik,      setVlasnik]      = useState<ClientPreview | null>(null)
  const [vlasnikError, setVlasnikError] = useState<string | null>(null)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [modalOpen,    setModalOpen]    = useState(false)

  const rsdCurrency      = currencies.find((c) => c.oznaka === 'RSD')
  const foreignCurrencies = currencies.filter((c) => c.oznaka !== 'RSD')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kategorija:          'TEKUCI',
      tip:                 'LICNI',
      valuta_id:           '',
      naziv_racuna:        '',
      podvrsta:            '',
      pocetno_stanje:      0,
      napravi_karticu:     false,
      naziv_firme:         '',
      maticni_broj:        '',
      pib:                 '',
      adresa_firme:        '',
      sifra_delatnosti_id: '',
    },
  })

  const kategorija     = watch('kategorija')
  const tip            = watch('tip')
  const napraviKarticu = watch('napravi_karticu')

  // Auto-set valuta_id to RSD when TEKUCI; clear when switching to DEVIZNI.
  // Takođe resetuj DinaCard izbor ako korisnik prebaci na devizni račun.
  useEffect(() => {
    if (kategorija === 'TEKUCI' && rsdCurrency) {
      setValue('valuta_id', rsdCurrency.id)
    } else if (kategorija === 'DEVIZNI') {
      setValue('valuta_id', '')
      setValue('tip_kartice', '') // DinaCard nije dozvoljen na deviznom računu
    }
  }, [kategorija, rsdCurrency, setValue])

  // Reset podvrsta when the combination changes
  useEffect(() => {
    setValue('podvrsta', '')
  }, [kategorija, tip, setValue])

  // Podvrsta only exists for TEKUCI accounts — DEVIZNI never shows it
  const podvrsteOptions =
    kategorija !== 'TEKUCI' ? [] :
    tip === 'POSLOVNI'      ? PODVRSTE_POSLOVNI :
    /* TEKUCI + LICNI */      PODVRSTE_LICNI

  const showPodvrsta = podvrsteOptions.length > 0
  const showFirma    = tip === 'POSLOVNI'

  // ── Submit ───────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)

    if (!vlasnik) {
      setVlasnikError('Vlasnik računa je obavezan')
      return
    }
    setVlasnikError(null)

    try {
      await createAccount({
        vlasnik_id:      vlasnik.id,
        kategorija:      values.kategorija,
        tip:             values.tip,
        valuta_id:       values.valuta_id,
        naziv_racuna:    values.naziv_racuna,
        podvrsta:        values.podvrsta ? (PODVRSTA_MAP[values.podvrsta] ?? values.podvrsta) : undefined,
        pocetno_stanje:  values.pocetno_stanje,
        napravi_karticu: values.napravi_karticu,
        tip_kartice:     values.napravi_karticu ? values.tip_kartice : undefined,
        ...(showFirma && {
          firma: {
            naziv:               values.naziv_firme ?? '',
            maticni_broj:        values.maticni_broj ?? '',
            pib:                 values.pib ?? '',
            adresa:              values.adresa_firme ?? '',
            sifra_delatnosti_id: values.sifra_delatnosti_id ?? '',
          },
        }),
      })

      toast.success('Račun uspješno kreiran.')
      reset({
        kategorija:          'TEKUCI',
        tip:                 'LICNI',
        valuta_id:           rsdCurrency?.id ?? '',
        naziv_racuna:        '',
        podvrsta:            '',
        pocetno_stanje:      0,
        napravi_karticu:     false,
        tip_kartice:         '',
        naziv_firme:         '',
        maticni_broj:        '',
        pib:                 '',
        adresa_firme:        '',
        sifra_delatnosti_id: '',
      })
      setVlasnik(null)
    } catch (err) {
      const e = err as Error
      setSubmitError(e.message ?? 'Greška pri kreiranju računa. Pokušajte ponovo.')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Backdrop — blocks the form while the "Create new client" modal is open */}
      {modalOpen && (
        <div className="absolute inset-0 z-10 rounded-lg bg-white/60 backdrop-blur-[1px]" />
      )}
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/employee')}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Kreiraj račun</h1>
      </div>

      {submitError && (
        <div className="mb-4">
          <ErrorMessage message={submitError} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* 1. Owner */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b">Vlasnik računa</h2>
          <UserSelect
            value={vlasnik}
            onChange={(c) => { setVlasnik(c); if (c) setVlasnikError(null) }}
            label="Vlasnik"
            error={vlasnikError ?? undefined}
            required
            onModalOpenChange={setModalOpen}
          />
        </div>

        {/* 2. Category, type, currency, subcategory */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b">Vrsta računa</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Kategorija */}
            <div>
              <label className="form-label">
                Kategorija <span className="ml-0.5 text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {(['TEKUCI', 'DEVIZNI'] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={k}
                      {...register('kategorija')}
                      className="text-primary-700 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{k}</span>
                  </label>
                ))}
              </div>
              {errors.kategorija && (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.kategorija.message}</p>
              )}
            </div>

            {/* Tip */}
            <div>
              <label className="form-label">
                Tip <span className="ml-0.5 text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {(['LICNI', 'POSLOVNI'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={t}
                      {...register('tip')}
                      className="text-primary-700 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t}</span>
                  </label>
                ))}
              </div>
              {errors.tip && (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.tip.message}</p>
              )}
            </div>

            {/* Valuta */}
            <div>
              <label className="form-label">
                Valuta <span className="ml-0.5 text-red-500">*</span>
              </label>
              {kategorija === 'TEKUCI' ? (
                <div className="input-base bg-gray-50 text-gray-500 cursor-not-allowed select-none">
                  RSD
                </div>
              ) : (
                <select
                  className={`input-base ${errors.valuta_id ? 'input-error' : ''}`}
                  {...register('valuta_id')}
                >
                  <option value="">-- Odaberite valutu --</option>
                  {foreignCurrencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.oznaka} – {c.naziv}
                    </option>
                  ))}
                </select>
              )}
              {errors.valuta_id && (
                <p role="alert" className="mt-1 text-xs text-red-600">{errors.valuta_id.message}</p>
              )}
            </div>

            {/* Podvrsta */}
            {showPodvrsta && (
              <div>
                <label className="form-label">Podvrsta <span className="ml-0.5 text-red-500">*</span></label>
                <select
                  className={`input-base ${errors.podvrsta ? 'input-error' : ''}`}
                  {...register('podvrsta')}
                >
                  <option value="">-- Odaberite podvrstu --</option>
                  {podvrsteOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {errors.podvrsta && (
                  <p role="alert" className="mt-1 text-xs text-red-600">{errors.podvrsta.message}</p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* 3. Business info — only when POSLOVNI */}
        {showFirma && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b">Podaci o firmi</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Naziv firme"
                error={errors.naziv_firme?.message}
                {...register('naziv_firme')}
              />
              <Input
                label="Matični broj"
                error={errors.maticni_broj?.message}
                {...register('maticni_broj')}
              />
              <Input
                label="Poreski broj (PIB)"
                error={errors.pib?.message}
                {...register('pib')}
              />
              <Input
                label="Adresa"
                error={errors.adresa_firme?.message}
                {...register('adresa_firme')}
              />
              <div className="sm:col-span-2">
                <label className="form-label">Šifra delatnosti <span className="ml-0.5 text-red-500">*</span></label>
                <select
                  className={`input-base ${errors.sifra_delatnosti_id ? 'input-error' : ''}`}
                  {...register('sifra_delatnosti_id')}
                >
                  <option value="">-- Odaberite delatnost --</option>
                  {delatnosti.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.sifra} – {d.naziv}
                    </option>
                  ))}
                </select>
                {errors.sifra_delatnosti_id && (
                  <p role="alert" className="mt-1 text-xs text-red-600">{errors.sifra_delatnosti_id.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Initial balance & card */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 pb-2 border-b">Početno stanje i kartica</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Naziv računa"
              error={errors.naziv_racuna?.message}
              {...register('naziv_racuna')}
            />
            <Input
              label="Početno stanje"
              type="number"
              min="0"
              step="0.01"
              error={errors.pocetno_stanje?.message}
              {...register('pocetno_stanje')}
            />
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="napravi_karticu"
                className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                {...register('napravi_karticu')}
              />
              <label htmlFor="napravi_karticu" className="text-sm font-medium text-gray-700 cursor-pointer">
                Napravi karticu
              </label>
            </div>

            {/* Tip kartice — vidljivo samo kada je checkbox označen */}
            {napraviKarticu && (
              <div>
                <label className="form-label">
                  Tip kartice <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  className={`input-base ${errors.tip_kartice ? 'input-error' : ''}`}
                  {...register('tip_kartice')}
                >
                  <option value="">-- Odaberite tip --</option>
                  {TIPOVI_KARTICE.map((t) => {
                    const isDinaCardDisabled = t.value === 'DINACARD' && kategorija === 'DEVIZNI'
                    return (
                      <option key={t.value} value={t.value} disabled={isDinaCardDisabled}>
                        {t.label}{isDinaCardDisabled ? ' (samo za RSD račune)' : ''}
                      </option>
                    )
                  })}
                </select>
                {errors.tip_kartice && (
                  <p role="alert" className="mt-1 text-xs text-red-600">{errors.tip_kartice.message}</p>
                )}
                {/* Info o limitu kartica */}
                <p className="mt-1 text-xs text-gray-500">
                  {KARTICE_LIMITI[tip as keyof typeof KARTICE_LIMITI]}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/employee')}>
            Odustani
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
            Kreiraj račun
          </Button>
        </div>

      </form>
    </div>
  )
}
