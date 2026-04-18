/**
 * CI smoke suite — pokreće se u GitHub Actions bez backenda.
 * Svi API pozivi su stub-ovani preko cy.intercept.
 */

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function makeMockJwt(userType: 'ADMIN' | 'EMPLOYEE' | 'CLIENT' = 'EMPLOYEE'): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' })
  const payload = b64url({
    sub: '1',
    email: 'ci@test.rs',
    user_type: userType,
    permissions: [],
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
  return `${header}.${payload}.ci_mock_signature`
}

describe('CI smoke — mocked (bez backenda)', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: {
        accessToken: makeMockJwt('EMPLOYEE'),
        refreshToken: 'mock.refresh.token',
      },
    }).as('login')

    cy.intercept('GET', '/api/employee*', { statusCode: 200, body: { items: [] } })
    cy.intercept('GET', '/api/client*', { statusCode: 200, body: { items: [] } })
    cy.intercept('GET', '/api/bank/**', { statusCode: 200, body: { items: [] } })
    cy.intercept('POST', '/api/bank/**', { statusCode: 200, body: {} })
  })

  it('S1: login stranica se renderuje i uspešno poziva /api/login sa mock odgovorom', () => {
    cy.visit('/login')
    cy.contains('Prijava').should('be.visible')

    cy.get('input[name="email"]').type('ci@test.rs')
    cy.get('#password').type('Password12')
    cy.get('button[type="submit"]').should('not.be.disabled').click()

    cy.wait('@login').then((i) => {
      expect(i.response?.statusCode).to.equal(200)
      expect(i.response?.body).to.have.property('accessToken')
    })

    cy.url({ timeout: 10_000 }).should('include', '/employee')
  })

  it('S2: zaštićena ruta preusmerava neautentifikovanog korisnika na /login', () => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/employee')
    cy.url({ timeout: 10_000 }).should('include', '/login')
    cy.contains('Prijava').should('be.visible')
  })
})
