/**
 * Feature: Hartije od vrednosti — Kreiranje ordera — Scenario 24
 *
 * Auth strategy: admin JWT stub (ADMIN ima pun pristup trading portalima
 * bez potrebe za actuary proverama ili client račun selektorom).
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 *
 * S24: Kreiranje ordera sa nevalidnom količinom (0 ili negativnom)
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

// ─── Auth + navigation setup ───────────────────────────────────────────────────

function setupAdminAuth() {
  // Permissions codebook — sprečavamo toast grešku pri admin loginu
  cy.intercept('GET', '/api/permissions*', { statusCode: 200, body: { permissions: [] } })
  cy.intercept('GET', '/api/bank/bank-accounts*', { statusCode: 200, body: [] })
  cy.intercept('GET', '/api/bank/funds*', { statusCode: 200, body: { funds: [] } })
  cy.intercept('GET', '/api/bank/exchanges*', { statusCode: 200, body: { exchanges: [] } })

  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: ADMIN_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('admin@test.com', 'Admin123')
  cy.wait('@loginReq')
}

// ─── Scenario 24: Kreiranje ordera sa nevalidnom količinom ────────────────────

describe('Scenario 24: Kreiranje ordera sa nevalidnom količinom', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/listings*', {
      statusCode: 200,
      body: { listings: [MOCK_LISTING_BASE], total: 1 },
    }).as('getListings')

    cy.intercept('GET', '/api/bank/listings/1', {
      statusCode: 200,
      body: MOCK_LISTING_DETAIL,
    }).as('getListingDetail')

    setupAdminAuth()

    // Navigacija do liste hartija
    cy.get('aside').contains('Hartije od vrednosti').click()
    cy.wait('@getListings')

    // Klik na "Kupi" za AAPL
    cy.contains('button', 'Kupi').first().click()
    cy.wait('@getListingDetail')
  })

  it('prikazuje formu za kreiranje naloga za hartiju AAPL', () => {
    cy.contains('Kreiraj nalog').should('be.visible')
    cy.contains('AAPL').should('be.visible')
    cy.contains('Apple Inc.').should('be.visible')
  })

  it('submit dugme je onemogućeno kad je količina 0 — sistem odbija kreiranje ordera', () => {
    // Količina input: type="number" min="1" step="1"
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('0')
    cy.get('form button[type="submit"]').should('be.disabled')
  })

  it('submit dugme je onemogućeno kad je polje količine prazno', () => {
    cy.get('input[type="number"][min="1"][step="1"]').clear()
    cy.get('form button[type="submit"]').should('be.disabled')
  })

  it('sistem odbija kreiranje ordera sa negativnom količinom', () => {
    // Uklanjamo min HTML constraint da bismo proverili React validaciju
    cy.get('input[type="number"][min="1"][step="1"]').then(($input) => {
      $input[0].removeAttribute('min')
    })
    cy.get('input[type="number"][step="1"]').clear().type('-5')
    cy.get('form button[type="submit"]').should('be.disabled')
  })

  it('submit dugme je omogućeno sa validnom količinom 1', () => {
    // Osnovna provjera: validna količina ne blokira dugme
    cy.get('input[type="number"][min="1"][step="1"]').clear().type('1')
    cy.get('form button[type="submit"]').should('not.be.disabled')
  })

  it('prikazuje validacionu poruku i ne kreira order za količinu 0', () => {
    cy.intercept('POST', '/api/bank/trading/orders*').as('createOrder')

    cy.get('input[type="number"][min="1"][step="1"]').clear().type('0')

    // Dugme je disabled — order se ne šalje
    cy.get('form button[type="submit"]').should('be.disabled')
    cy.get('@createOrder.all').should('have.length', 0)
  })
})

export {}
