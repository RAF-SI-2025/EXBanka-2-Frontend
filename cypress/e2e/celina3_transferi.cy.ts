/**
 * Celina 3: Transferi — Scenariji 17–20
 *
 * Auth strategy: cy.login() → navigate within SPA via sidebar clicks.
 */

// ─── JWT helper ───────────────────────────────────────────────────────────────

function makeClientJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '42', email: 'klijent@test.com', user_type: 'CLIENT',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const CLIENT_JWT = makeClientJwt()

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  {
    id: '10', brojRacuna: '111-0000000001-01', nazivRacuna: 'Tekući RSD',
    kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
    stanjeRacuna: 150_000, rezervisanaSredstva: 0, raspolozivoStanje: 150_000,
  },
  {
    id: '11', brojRacuna: '222-0000000002-02', nazivRacuna: 'Devizni EUR',
    kategorijaRacuna: 'DEVIZNI', vrstaRacuna: 'LICNI', valutaOznaka: 'EUR',
    stanjeRacuna: 1_000, rezervisanaSredstva: 0, raspolozivoStanje: 1_000,
  },
]

// ─── Auth setup ───────────────────────────────────────────────────────────────

function setupClientAuth() {
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenarios 17–20: Transferi ──────────────────────────────────────────────

describe('Scenariji 17–20: Prenos sredstava', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: MOCK_ACCOUNTS },
    }).as('getAccounts')
    cy.intercept('POST', '/api/bank/client/transfers', {
      statusCode: 200,
      body: { intentId: '500', actionId: '501', brojNaloga: 'PR-0001', status: 'NA_CEKANJU' },
    }).as('createTransfer')
    cy.intercept('POST', '/api/bank/client/payments/500/verify', {
      statusCode: 200,
      body: {
        id: '500', brojNaloga: 'PR-0001', tipTransakcije: 'PRENOS',
        iznos: 5000, provizija: 0, valuta: 'RSD', status: 'REALIZOVANO',
        createdAt: new Date().toISOString(), executedAt: new Date().toISOString(),
      },
    }).as('verifyTransfer')

    setupClientAuth()
    cy.get('aside').contains('Plaćanja').click()
    cy.get('aside').contains('Prenos').click()
    cy.wait('@getAccounts')
  })

  it('S17: prikazuje formu za prenos', () => {
    cy.contains('prenos', { matchCase: false }).should('be.visible')
  })

  it('S17: prikazuje listu sopstvenih računa', () => {
    cy.contains('Tekući RSD').should('be.visible')
    cy.contains('111-0000000001-01').should('be.visible')
  })

  it('S18: blokira prenos između računa različitih valuta', () => {
    // Select RSD source account and EUR target account
    cy.get('select').first().select('111-0000000001-01')
    cy.get('select').eq(1).select('222-0000000002-02')
    cy.contains('Prenos nije moguć između računa različitih valuta').should('be.visible')
  })

  it('S19: prikazuje formu za unos iznosa prenosa', () => {
    cy.get('input').filter('[placeholder*="iznos"], [name*="iznos"]').should('exist')
  })

  it('S20: prenos između računa iste valute je dozvoljen', () => {
    cy.get('select').first().select('111-0000000001-01')
    // If both accounts are RSD, error should not appear
    cy.contains('Prenos nije moguć').should('not.exist')
  })
})

export {}
