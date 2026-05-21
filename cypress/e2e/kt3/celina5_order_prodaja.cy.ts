/**
 * Feature: Kreiranje naloga — Prodaja — Scenariji 36, 37, 38
 *
 * Auth strategy: admin JWT stub.
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 *
 * S36: SELL nalog iz portfolija otvara formu za prodaju
 * S37: Korisnik ne može prodati više hartija nego što poseduje
 * S38: Prodaja tačnog broja hartija — potvrda dijaloga
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

const MOCK_LISTING_BASE = {
  id: '1',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  listingType: 'STOCK',
  exchangeId: '1',
  price: 175.25,
  ask: 175.30,
  bid: 175.20,
  volume: '52000000',
  changePercent: 1.23,
  dollarVolume: 9_112_000_000,
  initialMarginCost: 17.52,
  lastRefresh: '',
}

const MOCK_LISTING_DETAIL = {
  base: MOCK_LISTING_BASE,
  nominalValue: 175.25,
  contractSize: 1,
  maintenanceMargin: 10,
  detailsJson: '',
}

const MOCK_HOLDING = {
  listingId: '1',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  listingType: 'STOCK',
  quantity: 10,
  availableQuantity: 10,
  accountId: '5',
  publicShares: 0,
  publicQuantity: 0,
  reservedInContracts: 0,
  currentPrice: 180.00,
  avgBuyPrice: 175.00,
  profit: 50.00,
  lastModified: '2026-01-01T00:00:00Z',
  detailsJson: '',
  buyLots: [],
}

const DEFAULT_CALC_RESPONSE = {
  pricePerUnit: '175.2500',
  approximatePrice: '175.2500',
  commission: '7.0000',
}

// ─── Auth setup ────────────────────────────────────────────────────────────────

function setupAdminAuth() {
  cy.intercept('GET', '/api/permissions*', { statusCode: 200, body: { permissions: [] } })
  cy.intercept('GET', '/api/bank/bank-accounts*', { statusCode: 200, body: [] })
  cy.intercept('GET', '/api/bank/funds*', { statusCode: 200, body: { funds: [] } })
  cy.intercept('GET', '/api/bank/exchanges*', { statusCode: 200, body: { exchanges: [] } })
  cy.intercept('POST', '/api/bank/trading/calculate', {
    statusCode: 200,
    body: DEFAULT_CALC_RESPONSE,
  }).as('calculate')
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: ADMIN_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('admin@test.com', 'Admin123')
  cy.wait('@loginReq')
}

// ─── Scenario 36: SELL nalog iz portfolija otvara formu za prodaju ─────────────

describe('Scenario 36: SELL nalog iz portfolija otvara formu za prodaju', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/portfolio/my', {
      statusCode: 200,
      body: { holdings: [MOCK_HOLDING], totalProfit: 50, taxPaidRsd: 0, taxUnpaid: 0 },
    }).as('getPortfolio')

    cy.intercept('GET', '/api/bank/listings/1', {
      statusCode: 200,
      body: MOCK_LISTING_DETAIL,
    }).as('getListingDetail')

    setupAdminAuth()
    cy.get('aside').contains('Portfolio').click()
    cy.wait('@getPortfolio')
  })

  it('prikazuje portfolio sa hartijom AAPL', () => {
    cy.contains('AAPL').should('be.visible')
    cy.contains('Apple Inc.').should('be.visible')
  })

  it('klikom na Prodaj u portfoliju otvara se forma za kreiranje naloga', () => {
    cy.contains('button', 'Prodaj').first().click()
    cy.wait('@getListingDetail')
    cy.contains('Kreiraj nalog').should('be.visible')
    cy.contains('AAPL').should('be.visible')
  })

  it('forma za nalog se otvara sa SELL smerom', () => {
    cy.contains('button', 'Prodaj').first().click()
    cy.wait('@getListingDetail')
    cy.get('form').within(() => {
      cy.contains('button[type="button"]', 'Prodaj').should('have.class', 'bg-red-500')
    })
  })
})

// ─── Shared helper za S37/S38: navigacija do SELL forme od hartija ─────────────

function navigateToSellOrderForm() {
  cy.intercept('GET', '/api/bank/listings*', {
    statusCode: 200,
    body: { listings: [MOCK_LISTING_BASE], total: 1 },
  }).as('getListings')

  cy.intercept('GET', '/api/bank/listings/1', {
    statusCode: 200,
    body: MOCK_LISTING_DETAIL,
  }).as('getListingDetail')

  cy.intercept('GET', '/api/bank/portfolio/my', {
    statusCode: 200,
    body: { holdings: [MOCK_HOLDING], totalProfit: 0, taxPaidRsd: 0, taxUnpaid: 0 },
  }).as('getPortfolio')

  setupAdminAuth()
  cy.get('aside').contains('Hartije od vrednosti').click()
  cy.wait('@getListings')
  cy.contains('button', 'Kupi').first().click()
  cy.wait('@getListingDetail')

  // Prebaci na SELL — pokreće fetch portfolia za ownedQty
  cy.contains('button[type="button"]', 'Prodaj').click()
  cy.wait('@getPortfolio')
}

// ─── Scenario 37: Korisnik ne može prodati više hartija nego što poseduje ───────

describe('Scenario 37: Korisnik ne može prodati više hartija nego što poseduje', () => {
  beforeEach(() => {
    navigateToSellOrderForm()
  })

  it('prikazuje hint o raspoloživoj količini za prodaju', () => {
    cy.contains('Raspoloživo za prodaju: 10 komada').should('be.visible')
  })

  it('polje količine ima max ograničenje jednako raspoloživoj količini', () => {
    cy.get('input[type="number"][min="1"][step="1"]').should('have.attr', 'max', '10')
  })

  it('ne otvara dijalog za potvrdu kada je unesena količina veća od raspoložive', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('15')
    cy.get('form button[type="submit"]').click()
    // HTML max constraint sprečava submit — forma ostaje vidljiva, dijalog se ne otvara
    cy.get('form').should('be.visible')
    cy.get('[role="dialog"]').should('not.exist')
  })
})

// ─── Scenario 38: Prodaja tačnog broja hartija otvara dijalog za potvrdu ────────

describe('Scenario 38: Prodaja tačnog broja hartija — potvrda dijaloga', () => {
  beforeEach(() => {
    navigateToSellOrderForm()
  })

  it('submit dugme je omogućeno za tačan broj raspoloživih hartija', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('10')
    cy.get('form button[type="submit"]').should('not.be.disabled')
  })

  it('klikom na submit otvara se dijalog za potvrdu prodaje', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('10')
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Potvrdi prodaju').should('be.visible')
  })

  it('dijalog za potvrdu prikazuje ispravne podatke — AAPL, Prodaja, količina 10', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('10')
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('AAPL').should('be.visible')
      cy.contains('Prodaja').should('be.visible')
      cy.contains('10').should('be.visible')
    })
  })
})

export {}
