/**
 * Feature: Upravljanje aktuarima — Scenariji 3, 4
 *
 * Auth strategy: supervisor JWT stub (EMPLOYEE + SUPERVISOR permission)
 * + cy.intercept za actuary agents API.
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 */

// ─── JWT helper ────────────────────────────────────────────────────────────────

function makeSupervisorJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '20', email: 'supervisor@test.com', user_type: 'EMPLOYEE',
    permissions: ['SUPERVISOR'], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const SUPERVISOR_JWT = makeSupervisorJwt()

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_AGENT = {
  id: '1',
  employeeId: '100',
  email: 'agent@test.com',
  firstName: 'Petar',
  lastName: 'Petrović',
  position: 'Broker',
  limit: '100000',
  usedLimit: '30000',
  needApproval: false,
}

// ─── Auth setup ────────────────────────────────────────────────────────────────

function setupSupervisorAuth() {
  cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: { valute: [] } })
  cy.intercept('GET', '/api/bank/delatnosti', { statusCode: 200, body: { delatnosti: [] } })
  cy.intercept('GET', '/api/actuary/me', {
    statusCode: 200,
    body: {
      actuary: {
        id: '1', employeeId: '20', actuaryType: 'ACTUARY_TYPE_SUPERVISOR',
        limit: '0', usedLimit: '0', needApproval: false,
      },
    },
  })
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: SUPERVISOR_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('supervisor@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenario 3: Supervizor menja limit agentu — uspešno ──────────────────────

describe('Scenario 3: Supervizor menja limit agentu — uspešno', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/actuary/agents*', {
      statusCode: 200,
      body: { agents: [MOCK_AGENT] },
    }).as('getAgents')

    setupSupervisorAuth()
    cy.get('aside').contains('Upravljanje aktuarima').click()
    cy.wait('@getAgents')
  })

  it('prikazuje portal za upravljanje aktuarima', () => {
    cy.contains('Upravljanje aktuarima').should('be.visible')
  })

  it('prikazuje agenta sa limitom 100.000 i utrošenim limitom 30.000 RSD', () => {
    cy.contains('Petar').should('be.visible')
    cy.contains('Petrović').should('be.visible')
    // Limit se formatira kao 100.000,00 — tražimo parcijalni match
    cy.contains('100').should('be.visible')
    cy.contains('30').should('be.visible')
  })

  it('uspešno ažurira limit agenta na 150.000 RSD i prikazuje potvrdu', () => {
    cy.intercept('PATCH', '/api/actuary/agents/100/limit', {
      statusCode: 200,
      body: {},
    }).as('setLimit')

    cy.contains('button', 'Limit').first().click()

    // Dialog se otvara — proveravamo naslov i unos
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Postavi limit agenta').should('be.visible')

    cy.get('#limit-input').clear().type('150000')
    cy.contains('button', 'Sačuvaj').click()

    cy.wait('@setLimit')
    cy.contains('Limit je uspešno ažuriran.', { timeout: 8_000 }).should('be.visible')
  })

  it('sistem upisuje promenu — PATCH poziv je poslat sa ispravnim payload-om', () => {
    cy.intercept('PATCH', '/api/actuary/agents/100/limit', {
      statusCode: 200,
      body: {},
    }).as('setLimitAudit')

    cy.contains('button', 'Limit').first().click()
    cy.get('#limit-input').clear().type('150000')
    cy.contains('button', 'Sačuvaj').click()

    cy.wait('@setLimitAudit').then((interception) => {
      expect(interception.request.body).to.have.property('limit', 150000)
    })
  })
})

// ─── Scenario 4: Unos nevalidnog limita ───────────────────────────────────────

describe('Scenario 4: Unos nevalidnog limita', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/actuary/agents*', {
      statusCode: 200,
      body: { agents: [MOCK_AGENT] },
    }).as('getAgents')

    setupSupervisorAuth()
    cy.get('aside').contains('Upravljanje aktuarima').click()
    cy.wait('@getAgents')
  })

  it('sistem odbija limit 0 i prikazuje validacionu poruku', () => {
    cy.contains('button', 'Limit').first().click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.get('#limit-input').clear().type('0')
    cy.contains('button', 'Sačuvaj').click()

    cy.contains('Limit mora biti veći od nule.', { timeout: 8_000 }).should('be.visible')
    // Dialog ostaje otvoren — nalog nije sačuvan
    cy.get('[role="dialog"]').should('be.visible')
  })

  it('sistem odbija negativan limit i prikazuje validacionu poruku', () => {
    cy.contains('button', 'Limit').first().click()
    cy.get('[role="dialog"]').should('be.visible')

    // Uklanjamo min HTML constraint da bismo proverili React validaciju
    cy.get('[role="dialog"] form').invoke('attr', 'novalidate', 'novalidate')
    cy.get('#limit-input').clear().type('-500')
    cy.contains('button', 'Sačuvaj').click()

    cy.contains('Limit mora biti veći od nule.', { timeout: 8_000 }).should('be.visible')
  })
})

export {}
