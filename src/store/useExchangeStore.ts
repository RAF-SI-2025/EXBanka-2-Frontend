import { create } from 'zustand'
import { getMarketTestMode, toggleMarketTestMode } from '@/services/exchangeService'

interface ExchangeState {
  // null = još nije učitano iz backenda; boolean = učitano
  testMode: boolean | null
  fetchTestMode: () => Promise<void>
  setTestMode: (enabled: boolean) => Promise<void>
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  testMode: null,

  // Čita trenutno stanje test moda iz backenda (Redis).
  // Poziva se pri svakom mount-u ExchangesPage da stanje bude uvek tačno.
  fetchTestMode: async () => {
    try {
      const { enabled } = await getMarketTestMode()
      set({ testMode: enabled })
    } catch {
      // Ako fetch ne uspe, ostavimo null (dugme će biti neaktivno dok ne uspe)
    }
  },

  // Šalje toggle na backend i ažurira lokalno stanje.
  setTestMode: async (enabled: boolean) => {
    await toggleMarketTestMode(enabled)
    set({ testMode: enabled })
  },
}))
