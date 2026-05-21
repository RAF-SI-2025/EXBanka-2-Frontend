/**
 * Feature: Porez tracking — Scenariji 78, 79, 80, 81
 * Feature: Berze (Exchanges) — Scenario 82
 *
 * Auth strategy: Admin JWT stub (S78–S81) | Supervisor JWT stub (S82).
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 *
 * S78: Automatski obračun poreza (cron) — frontend prikazuje 15% dug od ostvarene dobiti
 * S79: Supervizor ručno pokreće obračun — klik → dijalog → POST → toast sa potvrdom
 * S80: Porez se konvertuje u RSD — dugovanje za EUR račun prikazano u RSD
 * S81: Nema poreza ako nema dobitka — taxDebt=0 prikazan sivom bojom
 * S82: Lista berzi sa svim kolonama + toggle dugme za test radno vreme (SUPERVISOR)
 */

// ─── JWT helpers ────────────────────────────────────────────────────────────────

function makeAdminJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '1', email: 'admin@test.com', user_type: 'ADMIN',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

function makeSupervisorJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '20', email: 'supervisor@test.com', user_type: 'EMPLOYEE',
    permissions: ['SUPERVISOR'], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const ADMIN_JWT      = makeAdminJwt()
const SUPERVISOR_JWT = makeSupervisorJwt()

// ─── Mock tax data ─────────────────────────────────────────────────────────────

// Korisnik sa dobitkom 150 RSD → porez 15% = 22.5 RSD (S78, S79)
const TAX_USER_22 = {
  userId: '30', userType: 'CLIENT', firstName: 'Marko', lastName: 'Marković', taxDebt: 22.5,
}

// Korisnik sa EUR računom — dugovanje je već konvertovano u RSD (S80)
const TAX_USER_EUR = {
  userId: '31', userType: 'CLIENT', firstName: 'Ana', lastName: 'Anić', taxDebt: 135,
}

// Korisnik koji nije ostvario dobit — porez = 0 (S81)
const TAX_USER_ZERO = {
  userId: '32', userType: 'CLIENT', firstName: 'Petra', lastName: 'Petrić', taxDebt: 0,
}

// ─── Mock exchange data ─────────────────────────────────────────────────────────

const MOCK_EXCHANGES = [
  {
    id: '1', name: 'New York Stock Exchange', acronym: 'NYSE', micCode: 'XNYS',
    polity: 'United States', currencyId: '1', timezone: 'America/New_York',
    currencyName: 'Američki dolar', marketStatus: 'OPEN',
  },
  {
    id: '2', name: 'London Stock Exchange', acronym: 'LSE', micCode: 'XLON',
    polity: 'United Kingdom', currencyId: '2', timezone: 'Europe/London',
    currencyName: 'Britanska funta', marketStatus: 'CLOSED',
  },
]

// ─── Auth setup ────────────────────────────────────────────────────────────────

function setupAdminAuth() {
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

// ─── Navigation helpers ─────────────────────────────────────────────────────────

function navigateToTaxTracking(users: object[]) {
  cy.intercept('GET', '/api/bank/tax/users*', {
    statusCode: 200,
    body: { users },
  }).as('getTaxUsers')
  setupAdminAuth()
  cy.get('aside').contains('Porez Tracking').click()
  cy.wait('@getTaxUsers')
}

function navigateToExchanges() {
  cy.intercept('GET', '/api/bank/admin/exchanges/test-mode', {
    statusCode: 200,
    body: { enabled: false },
  }).as('getTestMode')
  cy.intercept('GET', '/api/bank/exchanges*', {
    statusCode: 200,
    body: { exchanges: MOCK_EXCHANGES },
  }).as('getExchanges')
  setupSupervisorAuth()
  cy.get('aside').contains('Berze').click()
  cy.wait('@getTestMode')
  cy.wait('@getExchanges')
}

// ─── Scenario 78: Automatski obračun poreza na kraju meseca ──────────────────

describe('Scenario 78: Automatski obračun poreza — 15% od ostvarene dobiti', () => {
  beforeEach(() => {
    navigateToTaxTracking([TAX_USER_22])
  })

  it('prikazuje portal Porez Tracking', () => {
    cy.contains('Porez Tracking').should('be.visible')
  })

  it('prikazuje korisnika sa poreskim dugovanjem u tabeli', () => {
    cy.contains('Marko Marković').should('be.visible')
    // scope to tbody — avoids matching <option>Klijenti</option> in the closed select (0×0 px)
    cy.get('tbody').contains('Klijent').should('be.visible')
  })

  it('prikazuje dugovanje od 22,50 RSD — odgovara 15% poreza na dobit 150 RSD', () => {
    // 15% × 150 RSD = 22.5 RSD → format Serbian locale: 22,50 RSD
    cy.contains('22,50 RSD').should('be.visible')
  })

  it('dugovanje prikazano podebljanom sivom bojom jer je veće od nule', () => {
    cy.contains('22,50 RSD').should('have.class', 'font-semibold')
  })
})

// ─── Scenario 79: Ručno pokretanje obračuna poreza od strane supervizora ──────

describe('Scenario 79: Supervizor ručno pokreće obračun poreza', () => {
  beforeEach(() => {
    navigateToTaxTracking([TAX_USER_22])
  })

  it('prikazuje dugme Pokreni obračun poreza', () => {
    cy.contains('button', 'Pokreni obračun poreza').should('be.visible')
  })

  it('klik na dugme otvara dijalog za potvrdu', () => {
    cy.contains('button', 'Pokreni obračun poreza').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Da li ste sigurni da želite da pokrenete obračun poreza').should('be.visible')
  })

  it('dijalog prikazuje upozorenje da akcija nije reverzibilna', () => {
    cy.contains('button', 'Pokreni obračun poreza').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Ova akcija nije reverzibilna').should('be.visible')
    })
  })

  it('potvrdom obračuna pokreće POST /bank/tax/calculate i prikazuje toast', () => {
    cy.intercept('POST', '/api/bank/tax/calculate', {
      statusCode: 200,
      body: {
        processedUsers: 1,
        totalCollectedRsd: 22.5,
        message: 'Obračun završen. Obrađeno 1 korisnika.',
      },
    }).as('taxCalculate')

    cy.contains('button', 'Pokreni obračun poreza').click()
    cy.get('[role="dialog"]').should('be.visible')
    // scope to dialog — avoids clicking "Pokreni obračun poreza" header button (substring match)
    cy.get('[role="dialog"]').contains('button', 'Pokreni obračun').click()

    cy.wait('@taxCalculate')
    cy.contains('Obračun završen. Obrađeno 1 korisnika.', { timeout: 8_000 }).should('be.visible')
  })

  it('dijalog se zatvara nakon uspešnog obračuna', () => {
    cy.intercept('POST', '/api/bank/tax/calculate', {
      statusCode: 200,
      body: { processedUsers: 1, totalCollectedRsd: 22.5, message: 'Obračun završen.' },
    }).as('taxCalculate')

    cy.contains('button', 'Pokreni obračun poreza').click()
    cy.get('[role="dialog"]').contains('button', 'Pokreni obračun').click()
    cy.wait('@taxCalculate')

    cy.get('[role="dialog"]').should('not.exist')
  })
})

// ─── Scenario 80: Porez se konvertuje u RSD za korisnike sa EUR računom ───────

describe('Scenario 80: Porez konvertovan u RSD za korisnika sa EUR računom', () => {
  beforeEach(() => {
    navigateToTaxTracking([TAX_USER_EUR])
  })

  it('poresko dugovanje prikazano je u RSD (konverzija EUR→RSD na backendu)', () => {
    // Backend je konvertovao EUR profit u RSD i vratio taxDebt=135 RSD
    cy.contains('135,00 RSD').should('be.visible')
  })

  it('ukupno dugovanje u footeru odgovara zbirnoj vrednosti u RSD', () => {
    cy.contains('Ukupno dugovanje:').should('be.visible')
    cy.contains('135,00 RSD').should('be.visible')
  })
})

// ─── Scenario 81: Nema poreza ako nije ostvarena dobit ───────────────────────

describe('Scenario 81: Nema poreza ako korisnik nije ostvario dobit', () => {
  beforeEach(() => {
    navigateToTaxTracking([TAX_USER_ZERO])
  })

  it('prikazuje korisnika sa nultim dugovanjem', () => {
    cy.contains('Petra Petrić').should('be.visible')
  })

  it('poresko dugovanje je 0,00 RSD kada nema dobitka', () => {
    cy.contains('0,00 RSD').should('be.visible')
  })

  it('dugovanje 0 RSD prikazuje se sivom bojom — nema skidanja sa računa', () => {
    // DebtCell: amount===0 → 'text-gray-400' (nema bold, nema skidanja)
    cy.contains('0,00 RSD').should('have.class', 'text-gray-400')
  })
})

// ─── Scenario 82: Prikaz liste berzi i toggle za radno vreme ─────────────────

describe('Scenario 82: Lista berzi sa kolonama i toggle za radno vreme', () => {
  beforeEach(() => {
    navigateToExchanges()
  })

  it('prikazuje stranicu Berze sa listom berzi', () => {
    cy.contains('Berze').should('be.visible')
    cy.contains('New York Stock Exchange').should('be.visible')
    cy.contains('London Stock Exchange').should('be.visible')
  })

  it('prikazuje kolonu Naziv berze', () => {
    cy.contains('th', 'Naziv berze').should('be.visible')
    cy.contains('New York Stock Exchange').should('be.visible')
  })

  it('prikazuje kolonu Akronim', () => {
    cy.contains('th', 'Akronim').should('be.visible')
    cy.contains('NYSE').should('be.visible')
    cy.contains('LSE').should('be.visible')
  })

  it('prikazuje kolonu Država', () => {
    cy.contains('th', 'Država').should('be.visible')
    cy.contains('United States').should('be.visible')
    cy.contains('United Kingdom').should('be.visible')
  })

  it('prikazuje kolonu Valuta', () => {
    cy.contains('th', 'Valuta').should('be.visible')
    cy.contains('Američki dolar').should('be.visible')
  })

  it('prikazuje kolonu Vremenska zona', () => {
    cy.contains('th', 'Vremenska zona').should('be.visible')
    cy.contains('America/New_York').should('be.visible')
  })

  it('prikazuje kolonu Status sa badge-ovima', () => {
    cy.contains('th', 'Status').should('be.visible')
    cy.contains('Otvoreno').should('be.visible')
    cy.contains('Zatvoreno').should('be.visible')
  })

  it('prikazuje dugme za uključivanje test moda (SUPERVISOR)', () => {
    cy.contains('button', 'Aktiviraj Test Mod').should('be.visible')
  })

  it('klikom na Aktiviraj Test Mod šalje POST sa enabled=true', () => {
    cy.intercept('POST', '/api/bank/admin/exchanges/test-mode', {
      statusCode: 200,
      body: {},
    }).as('toggleTestMode')

    cy.contains('button', 'Aktiviraj Test Mod').click()
    cy.wait('@toggleTestMode').then((interception) => {
      expect(interception.request.body).to.have.property('enabled', true)
    })
  })

  it('posle aktivacije Test Moda prikazuje se Deaktiviraj Test Mod', () => {
    cy.intercept('POST', '/api/bank/admin/exchanges/test-mode', {
      statusCode: 200,
      body: {},
    }).as('toggleTestMode')

    cy.contains('button', 'Aktiviraj Test Mod').click()
    cy.wait('@toggleTestMode')
    cy.contains('button', 'Deaktiviraj Test Mod').should('be.visible')
  })

  it('posle aktivacije prikazuje banner o aktivnom Test Modu', () => {
    cy.intercept('POST', '/api/bank/admin/exchanges/test-mode', {
      statusCode: 200,
      body: {},
    }).as('toggleTestMode')

    cy.contains('button', 'Aktiviraj Test Mod').click()
    cy.wait('@toggleTestMode')
    cy.contains('Market Test Mode je trenutno AKTIVAN').should('be.visible')
  })

  it('prikazuje toast o uspešnoj aktivaciji Test Moda', () => {
    cy.intercept('POST', '/api/bank/admin/exchanges/test-mode', {
      statusCode: 200,
      body: {},
    }).as('toggleTestMode')

    cy.contains('button', 'Aktiviraj Test Mod').click()
    cy.wait('@toggleTestMode')
    cy.contains('Market Test Mode je aktiviran.', { timeout: 6_000 }).should('be.visible')
  })
})

export {}
