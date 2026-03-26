/**
 * Celina 4: Primaoci plaćanja — Scenariji 21–23
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

const MOCK_RECIPIENTS = [
  {
    id: '1',
    naziv: 'Firma DOO',
    racun: '222-0000000002-02',
    banka: 'EXBanka',
  },
  {
    id: '2',
    naziv: 'Marko Marković',
    racun: '333-0000000003-03',
    banka: 'EXBanka',
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

// ─── Scenarios 21–23: Primaoci plaćanja ──────────────────────────────────────

describe('Scenariji 21–23: Upravljanje primaocima plaćanja', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { recipients: MOCK_RECIPIENTS },
    }).as('getRecipients')
    cy.intercept('POST', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { id: '99' },
    }).as('addRecipient')
    cy.intercept('DELETE', '/api/bank/client/payment-recipients/1', {
      statusCode: 200,
      body: {},
    }).as('deleteRecipient')

    setupClientAuth()
    cy.get('aside').contains('Plaćanja').click()
    cy.get('aside').contains('Primaoci plaćanja').click()
    cy.wait('@getRecipients')
  })

  it('S21: prikazuje listu primaoca plaćanja', () => {
    cy.contains('Firma DOO').should('be.visible')
    cy.contains('Marko Marković').should('be.visible')
  })

  it('S21: prikazuje broj računa primaoca', () => {
    cy.contains('222-0000000002-02').should('be.visible')
  })

  it('S22: dodaje novog primaoca', () => {
    cy.intercept('GET', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { recipients: [...MOCK_RECIPIENTS, { id: '99', naziv: 'Novi Primalac', racun: '444-0000000004-04', banka: 'EXBanka' }] },
    }).as('getRecipientsAfterAdd')

    cy.contains('button', /Dodaj|Nov/).first().click()
    cy.get('input').filter('[placeholder*="naziv"], [name*="naziv"]').first()
      .type('Novi Primalac')
    cy.get('input').filter('[placeholder*="račun"], [name*="racun"]').first()
      .type('444-0000000004-04')
    cy.contains('button', /Sačuvaj|Dodaj|Potvrdi/).first().click()
    cy.wait('@addRecipient')
  })

  it('S23: briše primaoca iz liste', () => {
    cy.intercept('GET', '/api/bank/client/payment-recipients', {
      statusCode: 200,
      body: { recipients: [MOCK_RECIPIENTS[1]] },
    }).as('getRecipientsAfterDelete')

    cy.contains('Firma DOO').parents('tr, [class*="card"], li').first()
      .find('button').filter('[aria-label*="briš"], [aria-label*="Briš"], button').last().click()
    cy.wait('@deleteRecipient')
    cy.get('@deleteRecipient').its('response.statusCode').should('eq', 200)
  })
})

export {}
