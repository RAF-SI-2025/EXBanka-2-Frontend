import { useState, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'

interface FormState {
  name: string
  description: string
  minimumContribution: string
}

interface CreateFundFormProps {
  onSuccess?: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export default function CreateFundForm({ onSuccess }: CreateFundFormProps) {
  const createFund = useCelina4Store(s => s.createFund)

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    minimumContribution: '',
  })
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameChecking, setNameChecking] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const nameCheckAbort = useRef<AbortController | null>(null)

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  async function checkNameUnique(name: string) {
    if (!name.trim()) return
    nameCheckAbort.current?.abort()
    nameCheckAbort.current = new AbortController()
    setNameChecking(true)
    setNameError(null)
    try {
      const { accessToken } = useAuthStore.getState()
      const res = await fetch(`${API_BASE}/funds/?search=${encodeURIComponent(name)}`, {
        signal: nameCheckAbort.current.signal,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      const data = await res.json()
      const list: { name: string }[] = Array.isArray(data?.funds) ? data.funds : []
      if (list.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        setNameError('Fond sa ovim imenom već postoji.')
      }
    } catch {
      // ignore abort or network errors
    } finally {
      setNameChecking(false)
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = 'Naziv je obavezan.'
    if (!form.description.trim()) errs.description = 'Opis je obavezan.'
    const min = parseFloat(form.minimumContribution)
    if (isNaN(min) || min <= 0) errs.minimumContribution = 'Minimalna uplata mora biti pozitivan broj.'
    setErrors(errs)
    return Object.keys(errs).length === 0 && !nameError
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitLoading(true)
    try {
      await createFund({
        name: form.name.trim(),
        description: form.description.trim(),
        minimumContribution: parseFloat(form.minimumContribution),
      })
      onSuccess?.()
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-bold text-gray-900">Kreiraj investicioni fond</h2>

      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Naziv fonda *</label>
        <div className="relative">
          <input
            type="text"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            onBlur={e => checkNameUnique(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              errors.name || nameError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
          />
          {nameChecking && (
            <span className="absolute right-3 top-2.5 text-xs text-gray-400">Proveravam...</span>
          )}
        </div>
        {(errors.name || nameError) && (
          <p className="mt-1 text-xs text-red-600">{errors.name ?? nameError}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Opis *</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => handleChange('description', e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
            errors.description ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      {/* Minimum contribution */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Minimalna uplata (RSD) *</label>
        <input
          type="number"
          min={1}
          value={form.minimumContribution}
          onChange={e => handleChange('minimumContribution', e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
            errors.minimumContribution ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.minimumContribution && <p className="mt-1 text-xs text-red-600">{errors.minimumContribution}</p>}
      </div>

      <button
        type="submit"
        disabled={submitLoading || !!nameError}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitLoading ? 'Kreiranje...' : 'Kreiraj fond'}
      </button>
    </form>
  )
}
