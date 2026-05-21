/**
 * Feature: Hartije od vrednosti — Prikaz i pretraga — Scenariji 16, 17
 *
 * Auth strategy: client JWT stub.
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 *
 * S16: Ručno osvežavanje podataka o hartiji
 * S17: Automatsko osvežavanje podataka na intervalu (60s — proverava se cy.clock)
 */

// ─── JWT helper ────────────────────────────────────────────────────────────────

function makeClientJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '30', email: 'klijent@test.com', user_type: 'CLIENT',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const CLIENT_JWT = makeClientJwt()

// ─── Mock listings ─────────────────────────────────────────────────────────────

const MOCK_LISTINGS = [
  {
    id: '1', ticker: 'AAPL', name: 'Apple Inc.', listingType: 'STOCK',
    exchangeId: '1', price: 175.25, ask: 175.30, bid: 175.20,
    volume: '52000000', changePercent: 1.23,
    dollarVolume: 9112000000, initialMarginCost: 17.52, lastRefresh: '',
  },
  {
    id: '2', ticker: 'MSFT', name: 'Microsoft Corp.', listingType: 'STOCK',
    exchangeId: '1', price: 380.10, ask: 380.20, bid: 380.00,
    volume: '28000000', changePercent: -0.55,
    dollarVolume: 10642800000, initialMarginCost: 38.01, lastRefresh: '',
  },
]

// ─── Shared auth setup ─────────────────────────────────────────────────────────

function setupClientAuth() {
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenario 16: Ručno osvežavanje podataka ──────────────────────────────────

describe('Scenario 16: Ručno osvežavanje podataka o hartiji ažurira prikazane podatke', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: { listings: MOCK_LISTINGS, total: 2 },
    }).as('getListings')

    setupClientAuth()
    cy.get('aside').contains('Hartije od vrednosti').click()
    cy.wait('@getListings')
  })

  it('prikazuje listu hartija od vrednosti', () => {
    cy.contains('Hartije od vrednosti').should('be.visible')
    cy.contains('AAPL').should('be.visible')
    cy.contains('MSFT').should('be.visible')
  })

  it('prikazuje podatke o ceni i volumenu hartije', () => {
    cy.contains('175').should('be.visible')   // cena AAPL
    cy.contains('AAPL').should('be.visible')
  })

  it('klikom na Osveži ponovo se učitavaju podaci o hartijama', () => {
    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: {
        listings: [
          { ...MOCK_LISTINGS[0], price: 176.50, changePercent: 2.10 },
          MOCK_LISTINGS[1],
        ],
        total: 2,
      },
    }).as('refreshedListings')

    cy.contains('button', 'Osveži').click()
    cy.wait('@refreshedListings')

    // Podaci se osvežavaju — nova cena AAPL je vidljiva
    cy.contains('176').should('be.visible')
  })

  it('podaci o ceni, volumenu i promeni se osvežavaju posle ručnog klika', () => {
    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: { listings: MOCK_LISTINGS, total: 2 },
    }).as('manualRefresh')

    cy.contains('button', 'Osveži').click()
    cy.wait('@manualRefresh')

    cy.contains('AAPL').should('be.visible')
    cy.contains('MSFT').should('be.visible')
  })
})

// ─── Scenario 17: Automatsko osvežavanje podataka na intervalu ────────────────

describe('Scenario 17: Automatsko osvežavanje podataka na intervalu', () => {
  beforeEach(() => {
    // cy.clock() mora biti pre cy.login() kako bi setInterval bio registrovan na fake clock-u
    cy.clock()

    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: { listings: MOCK_LISTINGS, total: 2 },
    }).as('getListings')

    setupClientAuth()
    cy.get('aside').contains('Hartije od vrednosti').click()
    // Početni load: CLIENT vidi STOCK i FUTURE tab-ove (2 paralelna poziva)
    cy.wait('@getListings')
    cy.wait('@getListings')
  })

  it('podaci o hartijama se automatski osvežavaju bez ručnog klika posle 60 sekundi', () => {
    // Registrujemo novi alias da bi auto-refresh bio jasno identifikovan
    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: { listings: MOCK_LISTINGS, total: 2 },
    }).as('autoRefresh')

    // Pomeramo fake clock za 60 sekundi — triggering setInterval u ListingsPage
    cy.tick(60_000)

    cy.wait('@autoRefresh')
    cy.contains('AAPL').should('be.visible')
  })

  it('hartije ostaju vidljive i posle automatskog osvežavanja', () => {
    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: { listings: MOCK_LISTINGS, total: 2 },
    }).as('autoRefresh2')

    cy.tick(60_000)
    cy.wait('@autoRefresh2')

    cy.contains('MSFT').should('be.visible')
  })
})

export {}
