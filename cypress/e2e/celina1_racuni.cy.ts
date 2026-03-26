/**
 * Celina 1: Računi — Scenariji 1–8
 *
 * Auth strategy: cy.login() sets Zustand state in-memory; after waiting for
 * loginReq we navigate within the SPA via sidebar NavLink clicks (no cy.visit
 * that would reload the page and clear Zustand state).
 */

// ─── JWT helpers ───────────────────────────────────────────────────────────────

function makeEmployeeJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '10', email: 'zaposleni@test.com', user_type: 'EMPLOYEE',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

function makeClientJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '42', email: 'klijent@test.com', user_type: 'CLIENT',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const EMPLOYEE_JWT = makeEmployeeJwt()
const CLIENT_JWT   = makeClientJwt()

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CURRENCIES = [
  { id: '1', naziv: 'Srpski dinar', oznaka: 'RSD' },
  { id: '2', naziv: 'Euro',         oznaka: 'EUR' },
]

const MOCK_DELATNOSTI = [
  { id: '1', sifra: '6210', naziv: 'IT delatnost', grana: 'IT', sektor: 'Usluge' },
]

const MOCK_SEARCH_CLIENTS = [
  {
    id: '42', firstName: 'Marko', lastName: 'Marković',
    email: 'marko@test.com', phoneNumber: '+381601234567',
  },
]

const MOCK_ACCOUNTS = [
  {
    id: '10', brojRacuna: '111-0000000001-01', nazivRacuna: 'Tekući RSD',
    kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
    stanjeRacuna: 150_000, rezervisanaSredstva: 0, raspolozivoStanje: 150_000,
  },
]

const MOCK_ACCOUNT_DETAIL = {
  id: '10', brojRacuna: '111-0000000001-01', nazivRacuna: 'Tekući RSD',
  kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
  stanjeRacuna: 150_000, rezervisanaSredstva: 0, raspolozivoStanje: 150_000,
  dnevniLimit: 50_000, mesecniLimit: 200_000,
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function setupEmployeeAuth() {
  cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: { valute: MOCK_CURRENCIES } }).as('getDictCurrencies')
  cy.intercept('GET', '/api/bank/delatnosti', { statusCode: 200, body: { delatnosti: MOCK_DELATNOSTI } }).as('getDictDelatnosti')
  cy.intercept('POST', '/api/login', { statusCode: 200, body: { accessToken: EMPLOYEE_JWT, refreshToken: 'fake-refresh' } }).as('loginReq')
  cy.login('zaposleni@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

function setupClientAuth() {
  cy.intercept('POST', '/api/login', { statusCode: 200, body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' } }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenarios 1–5: Kreiranje računa (zaposleni) ──────────────────────────────

describe('Scenariji 1–5: Kreiranje računa (zaposleni)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/client/search*', {
      statusCode: 200,
      body: { clients: MOCK_SEARCH_CLIENTS, hasMore: false },
    }).as('searchClients')
    cy.intercept('POST', '/api/bank/accounts', {
      statusCode: 200,
      body: { id: '100' },
    }).as('createAccount')

    setupEmployeeAuth()
    cy.get('aside').contains('Kreiraj račun').click()
  })

  it('S1: prikazuje formu za kreiranje računa', () => {
    cy.contains('Kreiraj račun').should('be.visible')
    cy.get('select[name="valuta_id"]').should('exist')
  })

  it('S2: odabir deviznog tipa prikazuje devizne opcije', () => {
    cy.get('input[type="radio"][value="DEVIZNI"]').check()
    cy.get('input[type="radio"][value="DEVIZNI"]').should('be.checked')
  })

  it('S3: odabir poslovnog tipa prikazuje poslovna polja', () => {
    cy.get('input[type="radio"][value="POSLOVNI"]').check()
    cy.contains('Naziv firme').should('be.visible')
    cy.contains('PIB').should('be.visible')
  })

  it('S4: kreiranje računa sa karticom — checkbox prikazuje tip kartice', () => {
    cy.get('input[name="napravi_karticu"]').check()
    cy.get('select[name="tip_kartice"]').should('be.visible').select('VISA')
  })

  it('S5: validaciona greška ako klijent nije odabran', () => {
    cy.get('input[name="naziv_racuna"]').type('Test račun')
    cy.get('select[name="valuta_id"]').select('1')
    cy.get('select[name="podvrsta"]').select('Standardni')
    cy.get('input[name="pocetno_stanje"]').type('1000')
    cy.contains('button', 'Kreiraj račun').click()
    cy.get('@createAccount.all').should('have.length', 0)
  })
})

// ─── Scenario 6: Pregled liste računa (klijent) ───────────────────────────────

describe('Scenario 6: Pregled liste računa (klijent)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: MOCK_ACCOUNTS },
    }).as('getAccounts')
    cy.intercept('GET', '/api/bank/client/accounts/10/transactions*', {
      statusCode: 200,
      body: { transactions: [] },
    }).as('getTx')

    setupClientAuth()
    cy.get('aside').contains('Računi').click()
    cy.wait('@getAccounts')
  })

  it('prikazuje stranicu Moji računi', () => {
    cy.contains('Moji računi').should('be.visible')
  })

  it('prikazuje naziv i broj računa', () => {
    cy.contains('Tekući RSD').should('be.visible')
    cy.contains('111-0000000001-01').should('be.visible')
  })

  it('prikazuje raspoloživo stanje', () => {
    cy.contains('150').should('be.visible')
  })
})

// ─── Scenarios 7–8: Detalji i promena naziva računa ──────────────────────────

describe('Scenariji 7–8: Detalji računa i promena naziva', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: MOCK_ACCOUNTS },
    }).as('getAccounts')
    cy.intercept('GET', '/api/bank/client/accounts/10/transactions*', {
      statusCode: 200,
      body: { transactions: [] },
    }).as('getTx')
    cy.intercept('GET', '/api/bank/client/accounts/10', {
      statusCode: 200,
      body: MOCK_ACCOUNT_DETAIL,
    }).as('getDetail')
    cy.intercept('GET', '/api/user/me', {
      statusCode: 200,
      body: { id: '42', email: 'klijent@test.com', firstName: 'Test', lastName: 'User' },
    }).as('getProfile')
    cy.intercept('PATCH', '/api/bank/client/accounts/10/name', {
      statusCode: 200,
      body: {},
    }).as('renameAccount')

    setupClientAuth()
    cy.get('aside').contains('Računi').click()
    cy.wait('@getAccounts')
    cy.contains('Detalji').first().click()
    cy.wait('@getDetail')
  })

  it('S7: prikazuje naziv i broj računa', () => {
    cy.contains('Tekući RSD').should('be.visible')
    cy.contains('111-0000000001-01').should('be.visible')
  })

  it('S7: prikazuje dugme za promenu naziva', () => {
    cy.contains('Promena naziva računa').should('be.visible')
  })

  it('S8: otvara dijalog za promenu naziva klikom na dugme', () => {
    cy.contains('Promena naziva računa').click()
    cy.get('input[placeholder="Unesite novi naziv"]').should('be.visible')
  })

  it('S8: uspešno menja naziv računa', () => {
    cy.contains('Promena naziva računa').click()
    cy.get('input[placeholder="Unesite novi naziv"]').clear().type('Moj novi naziv')
    cy.contains('button', 'Sačuvaj').click()
    cy.wait('@renameAccount')
    cy.get('@renameAccount').its('request.body').should('have.property', 'noviNaziv', 'Moj novi naziv')
  })
})

export {}
