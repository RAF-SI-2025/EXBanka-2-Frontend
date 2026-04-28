import { apiGet, apiPost, apiPatch } from './grpcClient'
import { useAuthStore } from '@/store/authStore'
import type {
  ClientPreview,
  Currency,
  Delatnost,
  CreateAccountRequest,
  AccountListItem,
  AccountDetail,
  Transakcija,
  KarticaKlijenta,
  EmployeeAccountListItem,
  EmployeeKarticaListItem,
} from '@/types'

// ─── Backend response shapes (gRPC-Gateway camelCase) ─────────────────────────

interface BackendClientPreview {
  id: string | number
  firstName: string
  lastName: string
  email: string
}

interface BackendCurrency {
  id: string | number
  naziv: string
  oznaka: string
}

interface BackendDelatnost {
  id: string | number
  sifra: string
  naziv: string
  grana: string
  sektor: string
}

// ─── SearchClients ─────────────────────────────────────────────────────────────

export interface SearchClientsResult {
  clients: ClientPreview[]
  hasMore: boolean
}

export async function searchClients(req: {
  query?: string
  page: number
  limit: number
}): Promise<SearchClientsResult> {
  const res = await apiGet<{ clients: BackendClientPreview[] | null; hasMore?: boolean }>(
    '/client/search',
    {
      query:  req.query || undefined,
      page:   req.page,
      limit:  req.limit,
    }
  )
  const clients: ClientPreview[] = (res.clients ?? []).map((c) => ({
    id:         String(c.id),
    first_name: c.firstName,
    last_name:  c.lastName,
    email:      c.email,
  }))
  return { clients, hasMore: res.hasMore ?? false }
}

// ─── GetCurrencies ─────────────────────────────────────────────────────────────

export async function getCurrencies(): Promise<Currency[]> {
  const res = await apiGet<{ valute: BackendCurrency[] | null }>('/bank/currencies')
  return (res.valute ?? []).map((c) => ({
    id:     String(c.id),
    naziv:  c.naziv,
    oznaka: c.oznaka,
  }))
}

// ─── GetDelatnosti ─────────────────────────────────────────────────────────────

export async function getDelatnosti(): Promise<Delatnost[]> {
  const res = await apiGet<{ delatnosti: BackendDelatnost[] | null }>('/bank/delatnosti')
  return (res.delatnosti ?? []).map((d) => ({
    id:     String(d.id),
    sifra:  d.sifra,
    naziv:  d.naziv,
    grana:  d.grana,
    sektor: d.sektor,
  }))
}

// ─── CreateAccount ─────────────────────────────────────────────────────────────

export async function createAccount(req: CreateAccountRequest): Promise<{ id: string }> {
  const zaposleniId = useAuthStore.getState().user?.id

  const body = {
    zaposleniId:      Number(zaposleniId),
    vlasnikId:        Number(req.vlasnik_id),
    valutaId:         Number(req.valuta_id),
    kategorijaRacuna: req.kategorija,
    vrstaRacuna:      req.tip,
    podvrsta:         req.podvrsta ?? '',
    naziv:            req.naziv_racuna,
    stanje:           req.pocetno_stanje,
    kreirajKarticu:   req.napravi_karticu,
    tipKartice:       req.tip_kartice ?? '',
    ...(req.firma && {
      firma: {
        naziv:       req.firma.naziv,
        maticniBroj: req.firma.maticni_broj,
        pib:         req.firma.pib,
        delatnostId: Number(req.firma.sifra_delatnosti_id),
        adresa:      req.firma.adresa,
        vlasnikId:   Number(req.vlasnik_id),
      },
    }),
  }

  const res = await apiPost<typeof body, { id: string | number }>('/bank/accounts', body)
  return { id: String(res.id) }
}

// ─── Backend shapes for account endpoints ─────────────────────────────────────

interface BackendAccountListItem {
  id: string | number
  brojRacuna: string
  nazivRacuna: string
  kategorijaRacuna: string
  vrstaRacuna: string
  valutaOznaka: string
  stanjeRacuna: string | number
  rezervisanaSredstva: string | number
  raspolozivoStanje: string | number
}

// gRPC-Gateway returns AccountDetail directly (no wrapper object)
interface BackendAccountDetail {
  id: string | number
  brojRacuna: string
  nazivRacuna: string
  kategorijaRacuna: string
  vrstaRacuna: string
  valutaOznaka: string
  stanjeRacuna: string | number
  rezervisanaSredstva: string | number
  raspolozivoStanje: string | number
  dnevniLimit: string | number
  mesecniLimit: string | number
  nazivFirme?: string
}

interface BackendTransakcija {
  id: string | number
  tipTransakcije: string
  iznos: string | number
  opis: string
  vremeIzvrsavanja: string
  status: string
}

function parseNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : parseFloat(v) || 0
}

// ─── GetClientAccounts ────────────────────────────────────────────────────────

export async function getClientAccounts(): Promise<AccountListItem[]> {
  const res = await apiGet<{ accounts: BackendAccountListItem[] | null }>('/bank/client/accounts')
  return (res.accounts ?? []).map((a) => ({
    id:                   String(a.id),
    broj_racuna:          a.brojRacuna,
    naziv_racuna:         a.nazivRacuna,
    kategorija_racuna:    a.kategorijaRacuna,
    vrsta_racuna:         a.vrstaRacuna,
    valuta_oznaka:        a.valutaOznaka,
    stanje_racuna:        parseNum(a.stanjeRacuna),
    rezervisana_sredstva: parseNum(a.rezervisanaSredstva),
    raspolozivo_stanje:   parseNum(a.raspolozivoStanje),
  }))
}

// ─── GetBankAccounts (RSD računi banke — vlasnik_id=2 / trezor) ──────────────
// Koriste supervizori i admini za "investiranje u ime banke" i kupovinu hartija u ime banke.
export async function getBankAccounts(): Promise<AccountListItem[]> {
  const res = await apiGet<{ accounts: BackendAccountListItem[] | null }>('/bank/bank-accounts')
  return (res.accounts ?? []).map((a) => ({
    id:                   String(a.id),
    broj_racuna:          a.brojRacuna,
    naziv_racuna:         a.nazivRacuna,
    kategorija_racuna:    'TEKUCI',
    vrsta_racuna:         'POSLOVNI',
    valuta_oznaka:        a.valutaOznaka,
    stanje_racuna:        parseNum(a.stanjeRacuna),
    rezervisana_sredstva: parseNum(a.rezervisanaSredstva),
    raspolozivo_stanje:   parseNum(a.raspolozivoStanje),
  }))
}

/** Kreiranje naloga za hartiju — backend proverava raspoloživo stanje (ne knjiži punu trgovinu). */
export async function createListingOrder(payload: {
  accountId: string | number
  listingId: string | number
  side: 'BUY' | 'SELL'
  orderType: 'MARKET' | 'LIMIT' | 'STOP'
  quantity: number
  limitPrice?: number
  stopPrice?: number
}): Promise<{ message?: string }> {
  return apiPost<
    {
      accountId: number
      listingId: number
      side: string
      orderType: string
      quantity: number
      limitPrice: number
      stopPrice: number
    },
    { message?: string }
  >('/bank/listings/orders', {
    accountId: Number(payload.accountId),
    listingId: Number(payload.listingId),
    side: payload.side,
    orderType: payload.orderType,
    quantity: payload.quantity,
    limitPrice: payload.limitPrice ?? 0,
    stopPrice: payload.stopPrice ?? 0,
  })
}

// ─── GetAccountDetail ─────────────────────────────────────────────────────────

export async function getAccountDetail(id: string): Promise<AccountDetail> {
  // gRPC-Gateway returns AccountDetail directly, NOT wrapped in { account: ... }
  const a = await apiGet<BackendAccountDetail>(`/bank/client/accounts/${id}`)
  return {
    id:                   String(a.id),
    broj_racuna:          a.brojRacuna,
    naziv_racuna:         a.nazivRacuna,
    kategorija_racuna:    a.kategorijaRacuna,
    vrsta_racuna:         a.vrstaRacuna,
    valuta_oznaka:        a.valutaOznaka,
    stanje_racuna:        parseNum(a.stanjeRacuna),
    rezervisana_sredstva: parseNum(a.rezervisanaSredstva),
    raspolozivo_stanje:   parseNum(a.raspolozivoStanje),
    dnevni_limit:         parseNum(a.dnevniLimit),
    mesecni_limit:        parseNum(a.mesecniLimit),
    naziv_firme:          a.nazivFirme,
  }
}

// ─── GetAccountTransactions ───────────────────────────────────────────────────

export async function getAccountTransactions(
  racunId: string,
  params?: { sort_by?: string; order?: string }
): Promise<Transakcija[]> {
  const res = await apiGet<{ transactions: BackendTransakcija[] | null }>(
    `/bank/client/accounts/${racunId}/transactions`,
    {
      sort_by: params?.sort_by,
      order:   params?.order,
    }
  )
  return (res.transactions ?? []).map((t) => ({
    id:                String(t.id),
    tip_transakcije:   t.tipTransakcije,
    iznos:             parseNum(t.iznos),
    opis:              t.opis,
    vreme_izvrsavanja: t.vremeIzvrsavanja,
    status:            t.status,
  }))
}

// ─── GetExchangeRate ──────────────────────────────────────────────────────────

/**
 * Fetches a converted amount from the bank exchange-rate endpoint.
 * Returns null if the endpoint is unavailable (graceful fallback).
 */
export async function getExchangeRate(
  fromOznaka: string,
  toOznaka: string,
  amount: number
): Promise<number | null> {
  try {
    const res = await apiGet<{ result?: string | number; convertedAmount?: string | number }>(
      '/bank/exchange-rates',
      { from: fromOznaka, to: toOznaka, amount }
    )
    const raw = res.result ?? res.convertedAmount
    if (raw === undefined || raw === null) return null
    return parseNum(raw)
  } catch {
    return null
  }
}

// ─── CreateExchangeTransferIntent ─────────────────────────────────────────────

export interface ExchangeTransferIntentResult {
  intentId: string
  actionId: string
  brojNaloga: string
  status: string
}

/**
 * Creates a currency-converting transfer intent between the authenticated user's
 * own accounts. Returns intentId + actionId for the subsequent mobile verification step.
 */
export async function createExchangeTransferIntent(req: {
  idempotencyKey: string
  sourceAccountId: string
  targetAccountId: string
  amount: number           // amount to debit from source account
  convertedAmount: number  // amount to credit to target account (after conversion)
  svrhaPlacanja?: string
}): Promise<ExchangeTransferIntentResult> {
  const body = {
    idempotencyKey:  req.idempotencyKey,
    sourceAccountId: Number(req.sourceAccountId),
    targetAccountId: Number(req.targetAccountId),
    amount:          req.amount,
    convertedAmount: req.convertedAmount,
    svrhaPlacanja:   req.svrhaPlacanja ?? 'Konverzija valuta',
  }

  type BackendRes = {
    intentId:   number | string
    actionId:   number | string
    brojNaloga: string
    status:     string
  }

  const res = await apiPost<typeof body, BackendRes>('/bank/client/exchange-transfers', body)
  return {
    intentId:   String(res.intentId),
    actionId:   String(res.actionId),
    brojNaloga: res.brojNaloga,
    status:     res.status,
  }
}

// ─── RenameAccount ────────────────────────────────────────────────────────────

export async function renameAccount(id: string, newName: string): Promise<void> {
  // proto field: novi_naziv → gRPC-Gateway JSON key: noviNaziv
  await apiPatch<{ noviNaziv: string }, unknown>(`/bank/client/accounts/${id}/name`, { noviNaziv: newName })
}

// ─── RequestLimitChange (creates pending action → requires mobile verification) ─

interface UpdateLimitResponse {
  actionId: string | number
  status: string
}

export async function requestLimitChange(
  id: string,
  dnevniLimit: number,
  mesecniLimit: number
): Promise<{ actionId: string }> {
  const res = await apiPatch<
    { dnevniLimit: number; mesecniLimit: number },
    UpdateLimitResponse
  >(`/bank/client/accounts/${id}/limit`, { dnevniLimit, mesecniLimit })
  return { actionId: String(res.actionId) }
}

// ─── VerifyLimitChange (enter code received on mobile) ────────────────────────

export async function verifyLimitChange(actionId: string, code: string): Promise<void> {
  await apiPost<{ code: string }, unknown>(
    `/bank/client/pending-actions/${actionId}/verify`,
    { code }
  )
}

// ─── Kartice klijenta ─────────────────────────────────────────────────────────

interface BackendKarticaKlijenta {
  id: string | number
  brojKartice: string
  tipKartice: string
  vrstaKartice: string
  datumIsteka: string
  status: string
  racunId: string | number
  nazivRacuna: string
  brojRacuna: string
}

/** Vraća sve kartice ulogovanog klijenta sa osnovnim podacima o računu. */
export async function getMojeKartice(): Promise<KarticaKlijenta[]> {
  const res = await apiGet<{ kartice: BackendKarticaKlijenta[] | null }>('/bank/cards/my')
  return (res.kartice ?? []).map((k) => ({
    id:           String(k.id),
    broj_kartice: k.brojKartice,
    tip_kartice:  k.tipKartice,
    vrsta_kartice: k.vrstaKartice,
    datum_isteka: k.datumIsteka,
    status:       k.status,
    racun_id:     String(k.racunId),
    naziv_racuna: k.nazivRacuna,
    broj_racuna:  k.brojRacuna,
  }))
}

/** Blokira karticu sa datim ID-om. Kartica mora biti AKTIVNA i vlasnik mora biti ulogovani korisnik. */
export async function blokirajKarticu(id: string): Promise<void> {
  await apiPatch<Record<string, never>, unknown>(`/bank/cards/${id}/block`, {})
}

// ─── Flow 2 — Klijent traži novu karticu ──────────────────────────────────────

interface ZahtevZaKarticuRequest {
  account_id: number
  tip_kartice: string
  authorized_person?: {
    ime: string
    prezime: string
    datum_rodjenja: number  // Unix timestamp (sekunde)
    pol: string
    email: string
    broj_telefona: string
    adresa: string
  }
}

/**
 * Korak 1 — inicira zahtev za karticu. Backend proverava limite i šalje OTP na email.
 * tip_kartice: "VISA" | "MASTERCARD" | "DINACARD" | "AMEX"
 */
export async function posaljiZahtevZaKarticu(req: ZahtevZaKarticuRequest): Promise<void> {
  await apiPost<ZahtevZaKarticuRequest, unknown>('/bank/cards/request', req)
}

/**
 * Korak 2 — verifikuje OTP i kreira karticu u bazi.
 * Vraća ID novokreirane kartice.
 */
export async function potvrdiKreiranjeKartice(otpCode: string): Promise<{ karticaId: string }> {
  const res = await apiPost<{ otp_code: string }, { kartica_id: number | string }>(
    '/bank/cards/confirm',
    { otp_code: otpCode }
  )
  return { karticaId: String(res.kartica_id) }
}

// ─── Employee — Upravljanje računima i karticama ───────────────────────────────

interface BackendEmployeeAccountListItem {
  id: string | number
  brojRacuna: string
  vrstaRacuna: string
  kategorijaRacuna: string
  vlasnikId: string | number
  imeVlasnika: string
  prezimeVlasnika: string
}

interface BackendEmployeeKarticaListItem {
  id: string | number
  brojKartice: string
  status: string
  imeVlasnika: string
  prezimeVlasnika: string
  emailVlasnika: string
}

export async function getAllAccounts(params?: {
  account_number?: string
  first_name?: string
  last_name?: string
}): Promise<EmployeeAccountListItem[]> {
  const res = await apiGet<{ accounts: BackendEmployeeAccountListItem[] | null }>(
    '/bank/employee/accounts',
    {
      account_number: params?.account_number || undefined,
      first_name:     params?.first_name || undefined,
      last_name:      params?.last_name || undefined,
    }
  )
  return (res.accounts ?? []).map((a) => ({
    id:                String(a.id),
    broj_racuna:       a.brojRacuna,
    vrsta_racuna:      a.vrstaRacuna,
    kategorija_racuna: a.kategorijaRacuna,
    vlasnik_id:        String(a.vlasnikId),
    ime_vlasnika:      a.imeVlasnika,
    prezime_vlasnika:  a.prezimeVlasnika,
  }))
}

export async function getAccountCards(brojRacuna: string): Promise<EmployeeKarticaListItem[]> {
  const res = await apiGet<{ kartice: BackendEmployeeKarticaListItem[] | null }>(
    `/bank/employee/accounts/${encodeURIComponent(brojRacuna)}/cards`
  )
  return (res.kartice ?? []).map((k) => ({
    id:               String(k.id),
    broj_kartice:     k.brojKartice,
    status:           k.status,
    ime_vlasnika:     k.imeVlasnika,
    prezime_vlasnika: k.prezimeVlasnika,
    email_vlasnika:   k.emailVlasnika,
  }))
}

export async function changeCardStatus(cardNumber: string, status: string): Promise<void> {
  await apiPatch<{ status: string }, unknown>(
    `/bank/employee/cards/${encodeURIComponent(cardNumber)}/status`,
    { status }
  )
}
