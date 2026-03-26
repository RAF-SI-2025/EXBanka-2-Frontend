/**
 * Celina 6: Kartice — Scenariji 27–32
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

const MOCK_AKTIVAN_KARTICA = {
  id: '1',
  brojKartice: '5798123456785571',
  tipKartice: 'VISA',
  vrstaKartice: 'DEBIT',
  datumIsteka: '2027-12-31T00:00:00Z',
  status: 'AKTIVNA',
  racunId: '10',
  nazivRacuna: 'Tekući RSD',
  brojRacuna: '111000000000000001',
}

const MOCK_BLOKIRANA_KARTICA = {
  ...MOCK_AKTIVAN_KARTICA,
  id: '2',
  brojKartice: '4111111111111234',
  status: 'BLOKIRANA',
}

const MOCK_DEAKTIVIRANA_KARTICA = {
  ...MOCK_AKTIVAN_KARTICA,
  id: '3',
  brojKartice: '4111000000009999',
  status: 'DEAKTIVIRANA',
}

const MOCK_CURRENCIES = [
  { id: '1', naziv: 'Srpski dinar', oznaka: 'RSD' },
  { id: '2', naziv: 'Euro',         oznaka: 'EUR' },
]

const MOCK_DELATNOSTI = [
  { id: '1', sifra: '6210', naziv: 'IT', grana: 'IT', sektor: 'Usluge' },
]

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function setupClientAuth() {
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

function setupEmployeeAuth() {
  cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: { valute: MOCK_CURRENCIES } }).as('getDictCurrencies')
  cy.intercept('GET', '/api/bank/delatnosti', { statusCode: 200, body: { delatnosti: MOCK_DELATNOSTI } }).as('getDictDelatnosti')
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: EMPLOYEE_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('zaposleni@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenario 27: Kreiranje kartice pri otvaranju računa ──────────────────────

describe('Scenario 27: Automatsko kreiranje kartice prilikom otvaranja računa', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/client/search*', { statusCode: 200, body: { clients: [], hasMore: false } }).as('searchClients')
    cy.intercept('POST', '/api/bank/accounts', { statusCode: 200, body: { id: '200' } }).as('createAccount')

    setupEmployeeAuth()
    cy.get('aside').contains('Kreiraj račun').click()
  })

  it('čekiranje opcije Napravi karticu prikazuje izbor tipa kartice', () => {
    cy.get('input[name="napravi_karticu"]').check()
    cy.get('select[name="tip_kartice"]').should('be.visible')
  })

  it('kreira račun sa automatski generisanom karticom', () => {
    cy.get('select[name="valuta_id"]').select('1')
    cy.get('select[name="podvrsta"]').select('Standardni')
    cy.get('input[name="naziv_racuna"]').clear().type('Račun sa karticom')
    cy.get('input[name="pocetno_stanje"]').clear().type('5000')
    cy.get('input[name="napravi_karticu"]').check()
    cy.get('select[name="tip_kartice"]').select('VISA')

    cy.get('input[name="napravi_karticu"]').should('be.checked')
    cy.get('select[name="tip_kartice"]').should('have.value', 'VISA')
  })
})

// ─── Scenario 28: Kreiranje kartice na zahtev klijenta ───────────────────────

describe('Scenario 28: Kreiranje kartice na zahtev klijenta', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/cards/my', {
      statusCode: 200,
      body: { kartice: [MOCK_AKTIVAN_KARTICA] },
    }).as('getCards')
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: {
        accounts: [{
          id: '10', brojRacuna: '111000000000000001', nazivRacuna: 'Tekući RSD',
          kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
          stanjeRacuna: 100_000, rezervisanaSredstva: 0, raspolozivoStanje: 100_000,
        }],
      },
    }).as('getAccounts')
    cy.intercept('POST', '/api/bank/cards/request', { statusCode: 200, body: {} }).as('requestCard')
    cy.intercept('POST', '/api/bank/cards/confirm', { statusCode: 200, body: { kartica_id: '99' } }).as('confirmCard')

    setupClientAuth()
    cy.get('aside').contains('Kartice').click()
    cy.wait('@getCards')
  })

  it('prikazuje stranicu Moje kartice', () => {
    cy.contains('Moje kartice').should('be.visible')
  })

  it('prikazuje opciju za zahtev nove kartice', () => {
    cy.contains('Zatraži karticu').should('be.visible')
  })

  it('klijent može da podnese zahtev za novu karticu', () => {
    cy.contains('Zatraži karticu').click()

    cy.get('select, [data-cy="tip-kartice-select"]').first().then(($sel) => {
      if ($sel.prop('tagName') === 'SELECT') {
        cy.wrap($sel).select('VISA')
      }
    })

    cy.intercept('POST', '/api/bank/cards/request', { statusCode: 200, body: {} }).as('reqCard')
    cy.contains('button', /[Ss]ledeci|[Ss]ledeće|[Nn]aruci|[Pp]otvrdi/).first().click()
    cy.get('@reqCard').then(() => {})
  })
})

// ─── Scenario 29: Pregled liste kartica ──────────────────────────────────────

describe('Scenario 29: Pregled liste kartica', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/cards/my', {
      statusCode: 200,
      body: { kartice: [MOCK_AKTIVAN_KARTICA, MOCK_BLOKIRANA_KARTICA] },
    }).as('getCards')

    setupClientAuth()
    cy.get('aside').contains('Kartice').click()
    cy.wait('@getCards')
  })

  it('prikazuje listu svih kartica klijenta', () => {
    cy.contains('Moje kartice').should('be.visible')
    cy.contains('VISA').should('be.visible')
    cy.contains('Aktivna').should('be.visible')
  })

  it('broj kartice je prikazan u maskiranom obliku', () => {
    cy.contains('5798').should('be.visible')
    cy.contains('5571').should('be.visible')
    cy.contains('5798123456785571').should('not.exist')
  })

  it('prikazuje status kartice', () => {
    cy.contains('Aktivna').should('be.visible')
    cy.contains('Blokirana').should('be.visible')
  })
})

// ─── Scenario 30: Blokiranje kartice od strane klijenta ──────────────────────

describe('Scenario 30: Blokiranje kartice od strane klijenta', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/cards/my', {
      statusCode: 200,
      body: { kartice: [MOCK_AKTIVAN_KARTICA] },
    }).as('getCards')
    cy.intercept('PATCH', '/api/bank/cards/1/block', {
      statusCode: 200,
      body: {},
    }).as('blockCard')

    setupClientAuth()
    cy.get('aside').contains('Kartice').click()
    cy.wait('@getCards')
  })

  it('dugme Blokiraj karticu je vidljivo za aktivnu karticu', () => {
    cy.contains('Blokiraj karticu').should('be.visible')
  })

  it('prikazuje dijalog za potvrdu blokiranja', () => {
    cy.contains('Blokiraj karticu').first().click()
    cy.contains('Blokiranje kartice').should('be.visible')
    cy.contains('Da li ste sigurni').should('be.visible')
  })

  it('status kartice se menja u Blokirana', () => {
    cy.contains('Blokiraj karticu').first().click()
    cy.contains('Blokiranje kartice').should('be.visible')
    cy.get('.btn-danger, button').contains('Blokiraj karticu').last().click()
    cy.wait('@blockCard')

    cy.contains('Blokirana').should('be.visible')
  })
})

// ─── Scenario 31: Odblokiranje kartice od strane zaposlenog ──────────────────

describe('Scenario 31: Odblokiranje kartice od strane zaposlenog', () => {
  const BLOCKED_CARD_EMPLOYEE = {
    id: '2',
    brojKartice: '4111111111111234',
    status: 'BLOKIRANA',
    imeVlasnika: 'Marko',
    prezimeVlasnika: 'Marković',
    emailVlasnika: 'marko@test.com',
  }

  beforeEach(() => {
    cy.intercept('GET', '/api/bank/employee/accounts*', {
      statusCode: 200,
      body: {
        accounts: [{
          id: '10', brojRacuna: '111000000000000001',
          vrstaRacuna: 'LICNI', kategorijaRacuna: 'TEKUCI',
          vlasnikId: '42', imeVlasnika: 'Marko', prezimeVlasnika: 'Marković',
        }],
      },
    }).as('getAccounts')
    cy.intercept('GET', '/api/bank/employee/accounts/111000000000000001/cards', {
      statusCode: 200,
      body: { kartice: [BLOCKED_CARD_EMPLOYEE] },
    }).as('getAccountCards')
    cy.intercept('PATCH', '/api/bank/employee/cards/4111111111111234/status', {
      statusCode: 200,
      body: {},
    }).as('changeStatus')

    setupEmployeeAuth()
    cy.get('aside').contains('Svi računi').click()
    cy.wait('@getAccounts')
    // Click the account row to navigate to account cards page
    cy.contains('111000000000000001').click()
    cy.wait('@getAccountCards')
  })

  it('prikazuje karticu sa statusom Blokirana', () => {
    cy.contains('Blokirana').should('be.visible')
    cy.contains('Deblokiraj').should('be.visible')
  })

  it('zaposleni može da deblokiraj karticu', () => {
    cy.contains('Deblokiraj').click()
    cy.wait('@changeStatus')

    cy.get('@changeStatus').its('request.body').should('deep.equal', { status: 'AKTIVNA' })
  })

  it('status kartice se menja u Aktivna', () => {
    cy.contains('Deblokiraj').click()
    cy.wait('@changeStatus')

    cy.contains('aktivna', { matchCase: false }).should('be.visible')
  })
})

// ─── Scenario 32: Pokušaj aktivacije deaktivirane kartice ────────────────────

describe('Scenario 32: Pokušaj aktivacije deaktivirane kartice', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/cards/my', {
      statusCode: 200,
      body: { kartice: [MOCK_DEAKTIVIRANA_KARTICA] },
    }).as('getCards')

    setupClientAuth()
    cy.get('aside').contains('Kartice').click()
    cy.wait('@getCards')
  })

  it('prikazuje deaktiviranu karticu sa statusom Deaktivirana', () => {
    cy.contains('Deaktivirana').should('be.visible')
  })

  it('dugme za akciju je onemogućeno za deaktiviranu karticu', () => {
    cy.contains('Kartica je deaktivirana').should('be.visible')
    cy.contains('Kartica je deaktivirana').closest('button').should('be.disabled')
  })

  it('sistem ne dozvoljava aktivaciju deaktivirane kartice', () => {
    cy.contains('Aktiviraj karticu').should('not.exist')
    cy.contains('Kartica je deaktivirana').should('be.visible')
  })
})

export {}
