import { useCelina4Store } from '@/store/useCelina4Store'

export default function UnreadOffersBadge() {
  const unreadCount = useCelina4Store(s => s.unreadCount)

  if (unreadCount === 0) return null

  return (
    <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
