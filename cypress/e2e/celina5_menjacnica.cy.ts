/**
 * Celina 5: Menjačnica — Scenariji 24–26
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

const MOCK_CURRENCIES = [
  { id: '1', naziv: 'Srpski dinar',    oznaka: 'RSD' },
  { id: '2', naziv: 'Euro',            oznaka: 'EUR' },
  { id: '3', naziv: 'Švajcarski frank', oznaka: 'CHF' },
  { id: '4', naziv: 'Američki dolar',  oznaka: 'USD' },
  { id: '5', naziv: 'Britanska funta', oznaka: 'GBP' },
  { id: '6', naziv: 'Japanski jen',    oznaka: 'JPY' },
  { id: '7', naziv: 'Kanadski dolar',  oznaka: 'CAD' },
  { id: '8', naziv: 'Australijski dolar', oznaka: 'AUD' },
]

const MOCK_ACCOUNTS = [
  {
    id: '10', brojRacuna: 'RS35111000010', nazivRacuna: 'Tekući RSD',
    kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
    stanjeRacuna: '100000.00', rezervisanaSredstva: '0.00', raspolozivoStanje: '100000.00',
  },
  {
    id: '11', brojRacuna: 'RS35111000011', nazivRacuna: 'Devizni EUR',
    kategorijaRacuna: 'DEVIZNI', vrstaRacuna: 'LICNI', valutaOznaka: 'EUR',
    stanjeRacuna: '1000.00', rezervisanaSredstva: '0.00', raspolozivoStanje: '1000.00',
  },
]

// ─── Auth + API setup ─────────────────────────────────────────────────────────

function setupClientAuth() {
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

function stubMenjacnicaApi() {
  cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: { valute: MOCK_CURRENCIES } }).as('getCurrencies')
  cy.intercept('GET', '/api/bank/client/accounts', { statusCode: 200, body: { accounts: MOCK_ACCOUNTS } }).as('getAccounts')
  cy.intercept('GET', '/api/bank/exchange-rates*', {
    statusCode: 200,
    body: { result: '11700.00', convertedAmount: '11700.00' },
  }).as('getExchangeRate')
}

// ─── Scenario 24: Pregled kursne liste ───────────────────────────────────────

describe('Scenario 24: Pregled kursne liste', () => {
  beforeEach(() => {
    stubMenjacnicaApi()
    setupClientAuth()
    cy.get('aside').contains('Menjačnica').click()
  })

  it('prikazuje sekciju Kursna lista', () => {
    cy.contains('Kursna lista').should('be.visible')
  })

  it('prikazuje RSD kao baznu valutu', () => {
    cy.contains('Srpski dinar').should('be.visible')
    cy.contains('bazna valuta').should('be.visible')
  })

  it('prikazuje podržane valute (EUR, CHF, USD, GBP, JPY, CAD, AUD)', () => {
    cy.contains('Euro').should('be.visible')
    cy.contains('EUR').should('be.visible')
    cy.contains('USD').should('be.visible')
    cy.contains('GBP').should('be.visible')
    cy.contains('CHF').should('be.visible')
    cy.contains('JPY').should('be.visible')
    cy.contains('CAD').should('be.visible')
    cy.contains('AUD').should('be.visible')
  })
})

// ─── Scenario 25: Provera ekvivalentnosti ────────────────────────────────────

describe('Scenario 25: Provera ekvivalentnosti valute', () => {
  beforeEach(() => {
    stubMenjacnicaApi()
    setupClientAuth()
    cy.get('aside').contains('Menjačnica').click()
    cy.contains('Proveri ekvivalentnost').click()
  })

  it('prikazuje kalkulator za konverziju valuta', () => {
    cy.contains('Iz valute').should('be.visible')
    cy.contains('U valutu').should('be.visible')
  })

  it('sistem izračunava ekvivalentnu vrednost bez transakcije', () => {
    cy.get('input[inputMode="decimal"]').type('100')
    cy.contains('Dobijate', { timeout: 3000 }).should('be.visible')
  })

  it('prikazuje rezultat konverzije', () => {
    cy.get('input[inputMode="decimal"]').type('100')
    cy.wait('@getExchangeRate', { timeout: 5000 })
    cy.contains('Dobijate').should('be.visible')
  })

  it('dugme za izvršenje je disabled bez unosa iznosa', () => {
    cy.get('[data-testid="execute-button"]').should('be.disabled')
  })
})

// ─── Scenario 26: Konverzija valute tokom transfera ──────────────────────────

describe('Scenario 26: Konverzija valute tokom transfera iz menjačnice', () => {
  beforeEach(() => {
    stubMenjacnicaApi()
    cy.intercept('POST', '/api/bank/client/exchange-transfers', {
      statusCode: 200,
      body: {
        intentId: '500', actionId: '501', brojNaloga: 'KNV-0001', status: 'NA_CEKANJU',
      },
    }).as('executeExchange')

    setupClientAuth()
    cy.get('aside').contains('Menjačnica').click()
    cy.contains('Proveri ekvivalentnost').click()
  })

  it('prikazuje sekciju za izvršenje konverzije', () => {
    cy.contains('Izvrši konverziju').should('be.visible')
  })

  it('dugme za izvršenje je disabled bez selektovanog računa', () => {
    cy.get('input[inputMode="decimal"]').type('100')
    cy.get('[data-testid="execute-button"]').should('be.disabled')
  })

  it('izvršava konverziju EUR→RSD i prikazuje potvrdu', () => {
    cy.get('input[inputMode="decimal"]').type('100')
    cy.wait('@getExchangeRate', { timeout: 3000 })

    cy.get('[data-testid="source-account-select"]').then(($sel) => {
      if ($sel.length) {
        cy.get('[data-testid="source-account-select"]').select('Devizni EUR – RS35111000011')
        cy.get('[data-testid="target-account-select"]').select('Tekući RSD – RS35111000010')
        cy.get('[data-testid="execute-button"]').should('not.be.disabled').click()
        cy.wait('@executeExchange')
        cy.get('[data-testid="exec-success"]').should('be.visible')
        cy.contains('Konverzija izvršena').should('be.visible')
      }
    })
  })
})

export {}
