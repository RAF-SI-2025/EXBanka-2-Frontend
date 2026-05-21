/**
 * Feature: Kreiranje naloga (Orders) — Scenariji 26, 30, 31, 32, 33, 39, 40, 43, 45
 *
 * Auth strategy: admin JWT stub (pun pristup trading portalima, nema
 * actuary/account-selector blokera; commission/create/exchange se stub-uju).
 */

// ─── JWT helper ────────────────────────────────────────────────────────────────

function makeAdminJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '1', email: 'admin@test.com', user_type: 'ADMIN',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const ADMIN_JWT = makeAdminJwt()

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_STOCK_BASE = {
  id: '1', ticker: 'AAPL', name: 'Apple Inc.', listingType: 'STOCK',
  exchangeId: '1', price: 175.25, ask: 175.30, bid: 175.20,
  volume: '52000000', changePercent: 1.23,
  dollarVolume: 9_112_000_000, initialMarginCost: 17.52, lastRefresh: '',
}

const MOCK_STOCK_DETAIL = {
  base: MOCK_STOCK_BASE,
  nominalValue: 175.25, contractSize: 1, maintenanceMargin: 10, detailsJson: '',
}

const MOCK_FUTURE_BASE = {
  id: '2', ticker: 'ESH23', name: 'S&P 500 Futures Mar 2023', listingType: 'FUTURE',
  exchangeId: '1', price: 4100.00, ask: 4100.50, bid: 4099.50,
  volume: '1200000', changePercent: -0.30,
  dollarVolume: 4_920_000_000, initialMarginCost: 410.00, lastRefresh: '',
}

const MOCK_FUTURE_DETAIL = {
  base: MOCK_FUTURE_BASE,
  nominalValue: 4100.00, contractSize: 50, maintenanceMargin: 200,
  detailsJson: JSON.stringify({ settlement_date: '2023-03-17' }),
}

// Default calculate response (za testove koji ne proveravaju konkretnu proviziju)
const DEFAULT_CALC_RESPONSE = {
  pricePerUnit: '175.2500',
  approximatePrice: '175.2500',
  commission: '7.0000',
  initialMarginCost: null,
}

// ─── Auth setup ────────────────────────────────────────────────────────────────

function setupAdminAuth() {
  cy.intercept('GET', '/api/permissions*', { statusCode: 200, body: { permissions: [] } })
  cy.intercept('GET', '/api/bank/bank-accounts*', { statusCode: 200, body: [] })
  cy.intercept('GET', '/api/bank/funds*', { statusCode: 200, body: { funds: [] } })
  cy.intercept('GET', '/api/bank/exchanges*', { statusCode: 200, body: { exchanges: [] } })
  cy.intercept('POST', '/api/bank/trading/calculate', {
    statusCode: 200, body: DEFAULT_CALC_RESPONSE,
  }).as('calculate')
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: ADMIN_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('admin@test.com', 'Admin123')
  cy.wait('@loginReq')
}

// ─── Helper: navigacija do CreateOrderPage za dati listing ────────────────────

function navigateToOrderPage(
  listingsMock: object[],
  detailMock: object,
  detailAlias = 'getDetail'
) {
  const listingId = (detailMock as { base: { id: string } }).base.id
  cy.intercept('GET', '/api/bank/listings*', {
    statusCode: 200,
    body: { listings: listingsMock, total: listingsMock.length },
  }).as('getListings')
  cy.intercept('GET', `/api/bank/listings/${listingId}`, {
    statusCode: 200,
    body: detailMock,
  }).as(detailAlias)

  cy.get('aside').contains('Hartije od vrednosti').click()
  cy.wait('@getListings')
  cy.contains('button', 'Kupi').first().click()
  cy.wait(`@${detailAlias}`)
}

// ─── Scenario 26: Market BUY order sa samo količinom ─────────────────────────

describe('Scenario 26: Market BUY order se kreira kada korisnik unese samo količinu', () => {
  beforeEach(() => {
    setupAdminAuth()
    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('prikazuje formu za kreiranje naloga sa MARKET tipom podrazumevano', () => {
    cy.contains('Kreiraj nalog').should('be.visible')
    cy.contains('AAPL').should('be.visible')
    cy.get('form select').should('have.value', 'MARKET')
  })

  it('za Market order nisu vidljiva polja za Limit i Stop cenu', () => {
    cy.get('form select').should('have.value', 'MARKET')
    cy.contains('Limit cena').should('not.exist')
    cy.contains('Stop cena').should('not.exist')
  })

  it('prikazuje napomenu da se koristi market cena', () => {
    // Info box za MARKET BUY prikazuje tekst o ask kursu — ne u <option> koja je 0x0
    cy.contains('ask kursu').should('be.visible')
  })

  it('klikom na submit otvara se dijalog potvrde pre slanja ordera', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('5')
    cy.wait('@calculate')
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Potvrda naloga').should('be.visible')
  })
})

// ─── Scenario 30: Stop BUY order ──────────────────────────────────────────────

describe('Scenario 30: Stop BUY order se kreira kada je unet stop', () => {
  beforeEach(() => {
    setupAdminAuth()
    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('bira STOP tip naloga i prikazuje polje za Stop cenu', () => {
    cy.get('form select').select('STOP')
    cy.contains('Stop cena ($)').should('be.visible')
    cy.contains('Limit cena').should('not.exist')
  })

  it('Stop order se aktivira na ask ceni — prikazuje se objašnjenje', () => {
    cy.get('form select').select('STOP')
    // Napomena za Stop BUY
    cy.contains('stop cenu; zatim se kupuje po tržišnom kursu').should('be.visible')
  })

  it('Stop BUY otvara dijalog potvrde sa unetim stop vrednostima', () => {
    cy.get('form select').select('STOP')
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('3')
    cy.get('input[min="0.0001"][step="0.0001"]').first().type('170.00')
    cy.wait('@calculate')
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('STOP').should('be.visible')
  })
})

// ─── Scenario 31: Stop-Limit BUY order ───────────────────────────────────────

describe('Scenario 31: Stop-Limit BUY order se kreira kada su uneti stop i limit', () => {
  beforeEach(() => {
    setupAdminAuth()
    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('bira STOP_LIMIT tip i prikazuje oba polja', () => {
    cy.get('form select').select('STOP_LIMIT')
    cy.contains('Stop cena ($)').should('be.visible')
    cy.contains('Limit cena ($)').should('be.visible')
  })

  it('Stop-Limit dijalog potvrde prikazuje obe vrednosti (stop i limit)', () => {
    cy.get('form select').select('STOP_LIMIT')
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('2')

    // Stop cena je prvi input sa min="0.0001"
    cy.get('input[min="0.0001"][step="0.0001"]').eq(0).type('168.00')
    // Limit cena je drugi
    cy.get('input[min="0.0001"][step="0.0001"]').eq(1).type('170.00')

    cy.wait('@calculate')
    cy.get('form button[type="submit"]').click()

    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('STOP_LIMIT').should('be.visible')
  })
})

// ─── Scenario 32: Kreiranje ordera za futures ugovor sa isteklim datumom ──────

describe('Scenario 32: Kreiranje ordera za futures ugovor sa isteklim datumom', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/bank/trading/orders', {
      statusCode: 400,
      body: { code: 3, message: 'Rok hartije je istekao' },
    }).as('createOrderFailed')

    setupAdminAuth()
    navigateToOrderPage([MOCK_FUTURE_BASE], MOCK_FUTURE_DETAIL, 'getFutureDetail')
  })

  it('forma za order je dostupna — frontend ne blokira istekle fjučerse', () => {
    cy.contains('ESH23').should('be.visible')
    cy.contains('Kreiraj nalog').should('be.visible')
  })

  it('sistem odbija order — backend vraća grešku da je ugovor istekao', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.get('form button[type="submit"]').click()

    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrderFailed')
    cy.contains('Rok hartije je istekao', { timeout: 8_000 }).should('be.visible')
  })
})

// ─── Scenario 39: Provizija Market ordera ────────────────────────────────────

describe('Scenario 39: Provizija Market ordera — min(14% * ukupna cena, 7$)', () => {
  beforeEach(() => {
    setupAdminAuth()

    // Override calculate POSLE setupAdminAuth — LIFO: ovaj intercept pobeđuje
    cy.intercept('POST', '/api/bank/trading/calculate', {
      statusCode: 200,
      body: {
        pricePerUnit: '100.0000',
        approximatePrice: '100.0000',
        commission: '7.0000',
        initialMarginCost: null,
      },
    }).as('calculateMarket')

    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('prikazuje proviziju u sekciji Procena cene', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.wait('@calculateMarket')
    cy.contains('Provizija').should('be.visible')
    cy.contains('$7.00').should('be.visible')
  })

  it('provizija za Market order iznosi min(14% * ukupna, 7$) = $7.00', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.wait('@calculateMarket')
    // Ukupno = $100, 14% * $100 = $14, min($14, $7) = $7
    cy.contains('$7.00').should('be.visible')
    cy.contains('$100.00').should('be.visible')
  })
})

// ─── Scenario 40: Provizija Limit ordera ─────────────────────────────────────

describe('Scenario 40: Provizija Limit ordera — min(24% * početna cena, 12$)', () => {
  beforeEach(() => {
    setupAdminAuth()

    // Override calculate POSLE setupAdminAuth — LIFO: ovaj intercept pobeđuje
    cy.intercept('POST', '/api/bank/trading/calculate', {
      statusCode: 200,
      body: {
        pricePerUnit: '100.0000',
        approximatePrice: '100.0000',
        commission: '12.0000',
        initialMarginCost: null,
      },
    }).as('calculateLimit')

    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('prikazuje proviziju za Limit order — min(24% * $100, $12) = $12.00', () => {
    cy.get('form select').select('LIMIT')
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.get('input[min="0.0001"][step="0.0001"]').first().type('100.00')
    cy.wait('@calculateLimit')

    cy.contains('Provizija').should('be.visible')
    cy.contains('$12.00').should('be.visible')
  })

  it('Limit order prikazuje limit cenu u sekciji Procena cene', () => {
    cy.get('form select').select('LIMIT')
    cy.contains('Limit cena ($)').should('be.visible')
    cy.get('input[min="0.0001"][step="0.0001"]').first().type('100.00')
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.wait('@calculateLimit')
    cy.contains('Cena / jed.').should('be.visible')
  })
})

// ─── Scenario 43: Kreiranje BUY ordera bez dovoljno sredstava ────────────────

describe('Scenario 43: Kreiranje BUY ordera bez dovoljno sredstava', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/bank/trading/orders', {
      statusCode: 400,
      body: { code: 3, message: 'Nedovoljno sredstava na računu' },
    }).as('createOrderInsufficient')

    setupAdminAuth()
    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('sistem odbija order i prikazuje poruku o nedovoljnom stanju', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.wait('@calculate')
    cy.get('form button[type="submit"]').click()

    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrderInsufficient')
    cy.contains('Nedovoljno sredstava na računu', { timeout: 8_000 }).should('be.visible')
  })

  it('greška je prikazana u formi posle odbijenog naloga — forma ostaje dostupna', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.wait('@calculate')
    cy.get('form button[type="submit"]').click()
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrderInsufficient')
    // handleConfirmedSubmit zatvara dijalog pre await — greška se prikazuje u formi
    cy.get('[role="alert"]').should('be.visible')
  })
})

// ─── Scenario 45: Upozorenje kada je berza zatvorena ─────────────────────────

describe('Scenario 45: Upozorenje kada je berza zatvorena', () => {
  beforeEach(() => {
    // Exchange stub sa CLOSED statusom mora biti POSLE setupAdminAuth da bi imao prioritet
    setupAdminAuth()

    cy.intercept('GET', '/api/bank/exchanges*', {
      statusCode: 200,
      body: {
        exchanges: [{
          id: '1', name: 'NASDAQ', acronym: 'NASDAQ',
          micCode: 'XNAS', country: 'USA', currency: 'USD',
          timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00',
          marketStatus: 'CLOSED',
        }],
      },
    }).as('getExchangesClosed')

    navigateToOrderPage([MOCK_STOCK_BASE], MOCK_STOCK_DETAIL)
  })

  it('prikazuje upozorenje da je berza trenutno zatvorena', () => {
    cy.contains('Berza je trenutno zatvorena', { timeout: 8_000 }).should('be.visible')
  })

  it('nalog se može kreirati i uz zatvorenu berzu — izvršiće se kad se otvori', () => {
    cy.contains('Berza je trenutno zatvorena').should('be.visible')
    cy.contains('Nalog će biti kreiran').should('be.visible')
    // Form je i dalje dostupna
    cy.get('input[type="number"][min="1"][step="1"]').should('exist')
    cy.get('form button[type="submit"]').should('not.be.disabled')
  })
})

export {}
