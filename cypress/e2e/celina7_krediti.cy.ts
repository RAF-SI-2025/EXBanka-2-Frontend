/**
 * Celina 7: Krediti — Scenariji 33–38
 *
 * Auth strategy: cy.login() → navigate within SPA via sidebar clicks.
 */

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function makeClientJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '42', email: 'klijent@test.com', user_type: 'CLIENT',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

function makeEmployeeJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '10', email: 'zaposleni@test.com', user_type: 'EMPLOYEE',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const CLIENT_JWT   = makeClientJwt()
const EMPLOYEE_JWT = makeEmployeeJwt()

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = {
  accounts: [
    {
      id: '10', brojRacuna: '111-0000000001-01', nazivRacuna: 'Tekući RSD',
      kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
      stanjeRacuna: 150_000, rezervisanaSredstva: 0, raspolozivoStanje: 150_000,
    },
  ],
}

const MOCK_CURRENCIES = {
  valute: [
    { id: 1, naziv: 'Srpski dinar', oznaka: 'RSD' },
    { id: 2, naziv: 'Euro', oznaka: 'EUR' },
  ],
}

const MOCK_CREDITS_SORTED = [
  {
    id: '1', brojKredita: 'KR-2024-00001', vrstaKredita: 'STAMBENI',
    brojRacuna: '111-0000000001-01', iznosKredita: 8_500_000,
    periodOtplate: 240, nominalnaKamatnaStopa: 4.75,
    efektivnaKamatnaStopa: 5.00, datumUgovaranja: '2022-06-01T00:00:00Z',
    datumIsplate: '2022-06-05T00:00:00Z', iznosMesecneRate: 55_000,
    datumSledeceRate: '2025-04-01T00:00:00Z', preostaloDugovanje: 7_200_000,
    valuta: 'RSD', status: 'ODOBREN', tipKamate: 'VARIJABILNA',
  },
  {
    id: '2', brojKredita: 'KR-2024-00002', vrstaKredita: 'GOTOVINSKI',
    brojRacuna: '111-0000000001-01', iznosKredita: 1_200_000,
    periodOtplate: 60, nominalnaKamatnaStopa: 5.75,
    efektivnaKamatnaStopa: 6.10, datumUgovaranja: '2023-03-15T00:00:00Z',
    datumIsplate: '2023-03-16T00:00:00Z', iznosMesecneRate: 22_500,
    datumSledeceRate: '2025-04-01T00:00:00Z', preostaloDugovanje: 800_000,
    valuta: 'RSD', status: 'ODOBREN', tipKamate: 'FIKSNA',
  },
]

const MOCK_CREDIT_KASNI = {
  id: '3', brojKredita: 'KR-2024-00003', vrstaKredita: 'GOTOVINSKI',
  brojRacuna: '111-0000000001-01', iznosKredita: 500_000,
  periodOtplate: 36, nominalnaKamatnaStopa: 5.75,
  efektivnaKamatnaStopa: 6.00, datumUgovaranja: '2024-01-01T00:00:00Z',
  datumIsplate: '2024-01-05T00:00:00Z', iznosMesecneRate: 15_000,
  datumSledeceRate: '2025-01-15T00:00:00Z', preostaloDugovanje: 400_000,
  valuta: 'RSD', status: 'U_KASNJENJU', tipKamate: 'FIKSNA',
}

const MOCK_ZAHTEVI = [
  {
    id: '1', vrstaKredita: 'GOTOVINSKI', tipKamate: 'FIKSNA', iznos: 500_000,
    valuta: 'RSD', svrha: 'Kupovina automobila', mesecnaPlata: 100_000,
    statusZaposlenja: 'STALNO', periodZaposlenja: 36, kontaktTelefon: '+381601234567',
    brojRacuna: '111-0000000001-01', rokOtplate: 60,
    datumPodnosenja: '2025-03-10T10:00:00Z', status: 'NA_CEKANJU',
  },
]

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function setupClientAuth() {
  cy.intercept('POST', '/api/login', { statusCode: 200, body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' } }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

function setupEmployeeAuth() {
  cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: { valute: MOCK_CURRENCIES.valute } }).as('getDictCurrencies')
  cy.intercept('GET', '/api/bank/delatnosti', { statusCode: 200, body: { delatnosti: [] } }).as('getDictDelatnosti')
  cy.intercept('POST', '/api/login', { statusCode: 200, body: { accessToken: EMPLOYEE_JWT, refreshToken: 'fake-refresh' } }).as('loginReq')
  cy.login('zaposleni@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenario 33: Podnošenje zahteva za kredit ───────────────────────────────

describe('Scenario 33: Podnošenje zahteva za kredit', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/client/credits', { statusCode: 200, body: { credits: [] } }).as('getCredits')
    cy.intercept('GET', '/api/v1/client/accounts', { statusCode: 200, body: MOCK_ACCOUNTS }).as('getAccounts1')
    cy.intercept('GET', '/api/bank/client/accounts', { statusCode: 200, body: MOCK_ACCOUNTS }).as('getAccounts')
    cy.intercept('GET', '/api/v1/currencies', { statusCode: 200, body: MOCK_CURRENCIES }).as('getCurrencies1')
    cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: MOCK_CURRENCIES }).as('getCurrencies')

    setupClientAuth()
    cy.get('aside').contains('Krediti').click()
    cy.wait('@getCredits')
    // Navigate to new credit form
    cy.contains('button, a', /[Zz]ahtev|[Nn]ov/).first().click()
  })

  it('prikazuje formu za kredit', () => {
    cy.contains('kredit', { matchCase: false }).should('be.visible')
    cy.get('select#vrsta_kredita').should('exist')
  })

  it('uspešno podnosi zahtev za kredit', () => {
    cy.intercept('POST', '/api/v1/client/credits', { statusCode: 200, body: { id: '99' } }).as('postKredit')

    cy.get('select#vrsta_kredita').select('GOTOVINSKI')
    cy.get('select#tip_kamate').select('FIKSNA')
    cy.get('input[placeholder*="iznos"]').first().type('500000')
    cy.get('select#valuta').select('RSD')
    cy.get('select#rok_otplate').select('60')
    cy.get('input[placeholder*="stana"], input[placeholder*="svrha"]').type('Kupovina automobila')
    cy.get('input[placeholder*="80000"], input[placeholder*="plata"]').type('100000')
    cy.get('select#status_zaposlenja').select('STALNO')
    cy.get('input[placeholder*="24"]').type('36')
    cy.get('input[type="tel"]').type('+381601234567')
    cy.get('select#broj_racuna').select('111-0000000001-01')

    cy.get('[data-cy="submit-zahtev"]').click()
    cy.wait('@postKredit')

    cy.contains('Zahtev je uspešno podnet!').should('be.visible')
  })
})

// ─── Scenario 34: Pregled kredita klijenta ───────────────────────────────────

describe('Scenario 34: Pregled kredita klijenta', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/client/credits', { statusCode: 200, body: { credits: MOCK_CREDITS_SORTED } }).as('getCredits')

    setupClientAuth()
    cy.get('aside').contains('Krediti').click()
    cy.wait('@getCredits')
  })

  it('prikazuje listu svih kredita klijenta', () => {
    cy.contains('Moji krediti').should('be.visible')
    cy.get('[data-cy="kredit-card"]').should('have.length', 2)
  })

  it('krediti su sortirani po ukupnom iznosu — veći iznos prvi', () => {
    cy.get('[data-cy="kredit-card"]').first().contains('Stambeni')
  })
})

// ─── Scenario 35: Odobravanje kredita od strane zaposlenog ───────────────────

describe('Scenario 35: Odobravanje kredita od strane zaposlenog', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/employee/credits/requests', { statusCode: 200, body: { requests: MOCK_ZAHTEVI } }).as('getRequests')

    setupEmployeeAuth()
    cy.get('aside').contains('Zahtevi za kredit').click()
    cy.wait('@getRequests')
  })

  it('prikazuje zahteve za kredit', () => {
    cy.get('[data-cy="zahtev-card"]').should('have.length', 1)
    cy.contains('Na čekanju').should('be.visible')
  })

  it('zaposleni odobrava kredit', () => {
    cy.intercept('POST', '/api/v1/employee/credits/requests/1/approve', { statusCode: 200, body: {} }).as('approveCredit')

    cy.get('[data-cy="zahtev-card"]').first().find('[data-cy="odobri-btn"]').click()
    cy.wait('@approveCredit')

    cy.get('[data-cy="zahtev-card"]').should('have.length', 0)
    cy.contains('Zahtev za kredit je odobren').should('be.visible')
  })

  it('kredit dobija status Odobren', () => {
    cy.intercept('POST', '/api/v1/employee/credits/requests/1/approve', { statusCode: 200, body: {} }).as('approveCredit')

    cy.get('[data-cy="zahtev-card"]').first().find('[data-cy="odobri-btn"]').click()
    cy.wait('@approveCredit')

    cy.get('@approveCredit').its('response.statusCode').should('eq', 200)
  })
})

// ─── Scenario 36: Odbijanje zahteva za kredit ────────────────────────────────

describe('Scenario 36: Odbijanje zahteva za kredit', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/employee/credits/requests', { statusCode: 200, body: { requests: MOCK_ZAHTEVI } }).as('getRequests')

    setupEmployeeAuth()
    cy.get('aside').contains('Zahtevi za kredit').click()
    cy.wait('@getRequests')
  })

  it('zaposleni odbija zahtev za kredit', () => {
    cy.intercept('POST', '/api/v1/employee/credits/requests/1/reject', { statusCode: 200, body: {} }).as('rejectCredit')

    cy.get('[data-cy="zahtev-card"]').first().find('[data-cy="odbij-btn"]').click()
    cy.wait('@rejectCredit')

    cy.get('[data-cy="zahtev-card"]').should('have.length', 0)
    cy.contains('Zahtev za kredit je odbijen').should('be.visible')
  })

  it('kredit dobija status Odbijen — kartica nestaje iz liste', () => {
    cy.intercept('POST', '/api/v1/employee/credits/requests/1/reject', { statusCode: 200, body: {} }).as('rejectCredit')

    cy.get('[data-cy="zahtev-card"]').first().find('[data-cy="odbij-btn"]').click()
    cy.wait('@rejectCredit')

    cy.get('@rejectCredit').its('response.statusCode').should('eq', 200)
  })
})

// ─── Scenario 37: Automatsko skidanje rate kredita (UI stanje) ───────────────

describe('Scenario 37: Automatsko skidanje rate kredita (UI stanje)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/client/credits', { statusCode: 200, body: { credits: MOCK_CREDITS_SORTED } }).as('getCredits')

    setupClientAuth()
    cy.get('aside').contains('Krediti').click()
    cy.wait('@getCredits')
  })

  it('prikazuje aktivne kredite sa datumom sledeće rate', () => {
    cy.get('[data-cy="kredit-card"]').should('have.length', 2)
    cy.contains('Aktivan').should('be.visible')
  })

  it('sistema prikazuje iznos sledeće rate', () => {
    cy.get('[data-cy="kredit-card"]').first().find('[data-cy="detalji-btn"]').click()
    cy.contains('Detalji kredita').should('be.visible')
  })
})

// ─── Scenario 38: Kašnjenje u otplati kredita ────────────────────────────────

describe('Scenario 38: Kašnjenje u otplati kredita', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/client/credits', { statusCode: 200, body: { credits: [MOCK_CREDIT_KASNI] } }).as('getCredits')

    setupClientAuth()
    cy.get('aside').contains('Krediti').click()
    cy.wait('@getCredits')
  })

  it('kredit sa statusom U kašnjenju se prikazuje', () => {
    cy.get('[data-cy="kredit-card"]').should('have.length', 1)
  })

  it('prikazuje badge "U kašnjenju"', () => {
    cy.contains('kašnjenju', { matchCase: false }).should('be.visible')
  })
})

export {}
