import { apiGet, apiPost } from '@/services/grpcClient'

// MarketStatus vrednosti koje vraća backend.
// Mora biti u sinhronizaciji sa domain.MarketStatus u berza.go.
export type MarketStatus = 'OPEN' | 'PRE_MARKET' | 'AFTER_HOURS' | 'CLOSED'

// gRPC-Gateway serijalizuje proto polja u camelCase JSON (protojson default).
// Nova polja currencyName i marketStatus dodaje EnrichedExchangeMarshaler.
export interface Exchange {
  id: number | string
  name: string
  acronym: string
  micCode: string
  polity: string
  currencyId: number | string
  timezone: string
  currencyName: string       // novo: naziv valute iz JOIN-a (npr. "Američki dolar")
  marketStatus: MarketStatus | ''  // novo: trenutni status berze
}

export interface ListExchangesParams extends Record<string, string | number | boolean | undefined> {
  polity?: string   // filter po državi; "" = sve
  search?: string   // parcijalni match na name ili acronym; "" = sve
}

// GET /bank/exchanges → ListExchangesResponse { exchanges: Exchange[] }
export async function getAllExchanges(
  params?: ListExchangesParams
): Promise<{ exchanges: Exchange[] }> {
  return apiGet<{ exchanges: Exchange[] }>('/bank/exchanges', params)
}

// GET /bank/admin/exchanges/test-mode → { enabled: boolean }
// Čita trenutno stanje test moda iz Redisa.
export async function getMarketTestMode(): Promise<{ enabled: boolean }> {
  return apiGet<{ enabled: boolean }>('/bank/admin/exchanges/test-mode')
}

// POST /bank/admin/exchanges/test-mode → Empty (vraća 200 bez tela)
// enabled=true uključuje bypass radnog vremena, false isključuje.
export async function toggleMarketTestMode(enabled: boolean): Promise<void> {
  await apiPost<{ enabled: boolean }, unknown>(
    '/bank/admin/exchanges/test-mode',
    { enabled }
  )
}
