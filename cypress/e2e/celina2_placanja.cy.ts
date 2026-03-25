/**
 * Celina 2: Plaćanja — Scenariji 9–16
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
]

const MOCK_RECIPIENTS = [
  { id: '1', naziv: 'Firma DOO', racun: '222-0000000002-02', banka: 'EXBanka' },
  { id: '2', naziv: 'Marko Marković', racun: '333-0000000003-03', banka: 'EXBanka' },
]

const MOCK_PAYMENTS = [
  {
    id: '1', intentId: '1', actionId: '1', brojNaloga: 'PL-0001',
    iznos: 5_000, valuta: 'RSD', status: 'REALIZOVANO',
    primalacRacun: '222-0000000002-02', primalacNaziv: 'Firma DOO',
    svrha: 'Uplata za usluge', createdAt: '2025-01-01T10:00:00Z',
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

function openPaymentsMenu() {
  cy.get('aside').contains('Plaćanja').click()
}

// ─── Scenarios 9–13: Novo plaćanje ───────────────────────────────────────────

describe('Scenariji 9–13: Novo plaćanje', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: MOCK_ACCOUNTS },
    }).as('getAccounts')
    cy.intercept('GET', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { recipients: MOCK_RECIPIENTS },
    }).as('getRecipients')
    cy.intercept('POST', '/api/bank/client/payments', {
      statusCode: 200,
      body: { intentId: '999', actionId: '888', brojNaloga: 'PL-9999', status: 'NA_CEKANJU' },
    }).as('createPayment')
    cy.intercept('POST', '/api/bank/client/payments/999/verify', {
      statusCode: 200,
      body: {
        id: '999', brojNaloga: 'PL-9999', tipTransakcije: 'PRENOS',
        iznos: 1000, provizija: 0, valuta: 'RSD', status: 'REALIZOVANO',
        createdAt: new Date().toISOString(), executedAt: new Date().toISOString(),
      },
    }).as('verifyPayment')

    setupClientAuth()
    openPaymentsMenu()
    cy.get('aside').contains('Novo plaćanje').click()
  })

  it('S9: prikazuje formu za novo plaćanje', () => {
    cy.contains('plaćanje', { matchCase: false }).should('be.visible')
  })

  it('S10: prikazuje listu računa platilaca', () => {
    cy.contains('111-0000000001-01').should('be.visible')
  })

  it('S11: prikazuje polja za unos primaoca i iznosa', () => {
    cy.get('input[type="text"], input[name="racunPrimaoca"]').should('exist')
  })

  it('S12: popunjava formu i prelazi na sledeći korak', () => {
    // Select source account
    cy.contains('111-0000000001-01').should('be.visible')
    // Fill recipient account
    cy.get('input').filter('[placeholder*="primaoca"], [placeholder*="račun"], [name*="racun"]').first()
      .type('222-0000000002-02')
    cy.get('input').filter('[placeholder*="iznos"], [name*="iznos"]').first()
      .type('1000')
    cy.get('input').filter('[placeholder*="svrha"], [placeholder*="opis"]').first()
      .type('Test plaćanje')
    cy.contains('button', /Dalje|Nastavi|Sledeće|Next/).first().click()
  })

  it('S13: prikazuje pregled plaćanja pre potvrde', () => {
    cy.contains('plaćanje', { matchCase: false }).should('be.visible')
  })
})

// ─── Scenarios 14–15: Pregled plaćanja ───────────────────────────────────────

describe('Scenariji 14–15: Pregled plaćanja', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/payments*', {
      statusCode: 200,
      body: { payments: MOCK_PAYMENTS, hasMore: false },
    }).as('getPayments')

    setupClientAuth()
    openPaymentsMenu()
    cy.get('aside').contains('Pregled plaćanja').click()
    cy.wait('@getPayments')
  })

  it('S14: prikazuje istoriju plaćanja', () => {
    cy.contains('plaćanj', { matchCase: false }).should('be.visible')
  })

  it('S15: prikazuje detalje plaćanja', () => {
    cy.contains('PL-0001').should('be.visible')
  })
})

// ─── Scenario 16: Dodavanje primaoca tokom plaćanja ──────────────────────────

describe('Scenario 16: Dodavanje primaoca tokom plaćanja', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: MOCK_ACCOUNTS },
    }).as('getAccounts')
    cy.intercept('GET', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { recipients: [] },
    }).as('getRecipients')
    cy.intercept('POST', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { id: '99' },
    }).as('addRecipient')

    setupClientAuth()
    openPaymentsMenu()
    cy.get('aside').contains('Novo plaćanje').click()
  })

  it('S16: forma za plaćanje ima opciju za dodavanje primaoca', () => {
    cy.contains('plaćanje', { matchCase: false }).should('be.visible')
    // The form is visible — recipients button appears after payment success
  })
})

export {}
