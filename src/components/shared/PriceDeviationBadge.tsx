interface PriceDeviationBadgeProps {
  currentPrice: number
  referencePrice: number
  currency?: string
}

function deviationClass(pct: number): string {
  if (pct <= 5) return 'bg-green-100 text-green-800'
  if (pct <= 20) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

export default function PriceDeviationBadge({ currentPrice, referencePrice, currency = 'RSD' }: PriceDeviationBadgeProps) {
  const deviation = referencePrice !== 0
    ? Math.abs((currentPrice - referencePrice) / referencePrice) * 100
    : 0

  const formatted = new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(currentPrice)

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{formatted}</span>
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${deviationClass(deviation)}`}>
        {deviation.toFixed(1)}%
      </span>
    </span>
  )
}
