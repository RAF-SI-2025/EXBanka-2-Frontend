import { useEffect } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useCelina4Store } from '@/store/useCelina4Store'

export default function SAGAStatusToast() {
  const sagaStatus = useCelina4Store(s => s.sagaStatus)
  const sagaStatusMessage = useCelina4Store(s => s.sagaStatusMessage)
  const setSagaStatus = useCelina4Store(s => s.setSagaStatus)

  useEffect(() => {
    if (sagaStatus === 'success') {
      const timer = setTimeout(() => setSagaStatus('idle'), 4000)
      return () => clearTimeout(timer)
    }
  }, [sagaStatus, setSagaStatus])

  if (sagaStatus === 'idle') return null

  const config = {
    pending: {
      icon: <Loader2 className="h-5 w-5 animate-spin text-blue-600" />,
      text: 'Transakcija u toku...',
      bg: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-800',
    },
    success: {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      text: sagaStatusMessage ?? 'Uspešno!',
      bg: 'bg-green-50 border-green-200',
      textColor: 'text-green-800',
    },
    failure: {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      text: sagaStatusMessage ?? 'Došlo je do greške.',
      bg: 'bg-red-50 border-red-200',
      textColor: 'text-red-800',
    },
  }[sagaStatus]

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${config.bg}`}>
      {config.icon}
      <p className={`text-sm font-medium ${config.textColor}`}>{config.text}</p>
      {sagaStatus !== 'pending' && (
        <button
          onClick={() => setSagaStatus('idle')}
          className="ml-2 text-gray-400 hover:text-gray-600"
          aria-label="Zatvori"
        >
          ×
        </button>
      )}
    </div>
  )
}
