/**
 * Feature: Margin i AON nalozi — Scenariji 63, 64, 65, 66
 * Feature: Moj portfolio — Scenariji 69, 70, 73
 *
 * Auth strategy: Admin JWT stub (S65, S66) | Client JWT stub sa TRADE_STOCKS (S63, S64, S69–S73).
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 *
 * S63: Margin checkbox je skriven klijentu bez odobrenog kredita
 * S64: Klijent sa ODOBREN kreditom vidi Margin checkbox i može potvrditi BUY sa margin=true
 * S65: Admin ima automatsku marginalnu permisiju — Margin checkbox vidljiv, order prihvaćen
 * S66: AON checkbox uvek vidljiv — order se kreira sa allOrNone=true u telu zahteva
 * S69: Portfolio prikazuje plaćen i neplaćen porez
 * S70: Akcije u portfoliju imaju OTC (javni) režim sa brojem javnih akcija
 * S73: Hartija u portfoliju po difoltu je privatna (publicQuantity=0 → "nije javno")
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

function makeClientJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '30', email: 'klijent@test.com', user_type: 'CLIENT',
    permissions: ['TRADE_STOCKS'], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const ADMIN_JWT  = makeAdminJwt()
const CLIENT_JWT = makeClientJwt()

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_LISTING_BASE = {
  id: '1', ticker: 'AAPL', name: 'Apple Inc.', listingType: 'STOCK',
  exchangeId: '1', price: 175.25, ask: 175.30, bid: 175.20,
  volume: '52000000', changePercent: 1.23,
  dollarVolume: 9_112_000_000, initialMarginCost: 17.52, lastRefresh: '',
}

const MOCK_LISTING_DETAIL = {
  base: MOCK_LISTING_BASE,
  nominalValue: 175.25,
  contractSize: 1,
  maintenanceMargin: 10,
  detailsJson: '',
}

// Kredit sa statusom ODOBREN — daje klijentu hasMarginPermission=true
const MOCK_CREDIT = {
  id: '10', status: 'ODOBREN', iznosKredita: '50000', valuta: 'RSD',
}

// Klijentski račun sa dovoljnim stanjem (>initialMarginCost)
const MOCK_CLIENT_ACCOUNT = {
  id: '5', brojRacuna: '111-000001-00', nazivRacuna: 'Tekući račun',
  kategorijaRacuna: 'TEKUCI', vrstaRacuna: 'LICNI', valutaOznaka: 'RSD',
  stanjeRacuna: '250000', rezervisanaSredstva: '0', raspolozivoStanje: '250000',
}

const DEFAULT_CALC = {
  pricePerUnit: '175.2500',
  approximatePrice: '175.2500',
  commission: '7.0000',
}

// ─── Auth setup ────────────────────────────────────────────────────────────────

function setupAdminAuth() {
  cy.intercept('GET', '/api/permissions*', { statusCode: 200, body: { permissions: [] } })
  cy.intercept('GET', '/api/bank/bank-accounts*', { statusCode: 200, body: [] })
  cy.intercept('GET', '/api/bank/funds*', { statusCode: 200, body: { funds: [] } })
  cy.intercept('GET', '/api/bank/exchanges*', { statusCode: 200, body: { exchanges: [] } })
  cy.intercept('POST', '/api/bank/trading/calculate', {
    statusCode: 200,
    body: DEFAULT_CALC,
  }).as('calculate')
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: ADMIN_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('admin@test.com', 'Admin123')
  cy.wait('@loginReq')
}

function setupClientAuth() {
  cy.intercept('GET', '/api/bank/exchanges*', { statusCode: 200, body: { exchanges: [] } })
  cy.intercept('POST', '/api/bank/trading/calculate', {
    statusCode: 200,
    body: DEFAULT_CALC,
  }).as('calculate')
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Navigation helpers ─────────────────────────────────────────────────────────

function navigateAdminToOrderForm() {
  cy.intercept('GET', '/api/bank/listings*', {
    statusCode: 200,
    body: { listings: [MOCK_LISTING_BASE], total: 1 },
  }).as('getListings')
  cy.intercept('GET', '/api/bank/listings/1', {
    statusCode: 200,
    body: MOCK_LISTING_DETAIL,
  }).as('getListingDetail')
  setupAdminAuth()
  cy.get('aside').contains('Hartije od vrednosti').click()
  cy.wait('@getListings')
  cy.contains('button', 'Kupi').first().click()
  cy.wait('@getListingDetail')
}

function navigateClientToOrderForm(hasApprovedCredit: boolean) {
  cy.intercept('GET', '/api/v1/client/credits', {
    statusCode: 200,
    body: { krediti: hasApprovedCredit ? [MOCK_CREDIT] : [] },
  }).as('getCredits')
  cy.intercept('GET', '/api/bank/client/accounts', {
    statusCode: 200,
    body: { accounts: [MOCK_CLIENT_ACCOUNT] },
  }).as('getClientAccounts')
  cy.intercept('GET', '/api/bank/listings*', {
    statusCode: 200,
    body: { listings: [MOCK_LISTING_BASE], total: 1 },
  }).as('getListings')
  cy.intercept('GET', '/api/bank/listings/1', {
    statusCode: 200,
    body: MOCK_LISTING_DETAIL,
  }).as('getListingDetail')
  setupClientAuth()
  cy.get('aside').contains('Hartije od vrednosti').click()
  cy.wait('@getListings')
  cy.contains('button', 'Kupi').first().click()
  cy.wait('@getListingDetail')
  cy.wait('@getCredits')
  cy.wait('@getClientAccounts')
}

// ─── Scenario 63: Margin order nije dozvoljen bez permisije ──────────────────

describe('Scenario 63: Margin order nije dozvoljen klijentu bez odobrenog kredita', () => {
  beforeEach(() => {
    navigateClientToOrderForm(false)
  })

  it('prikazuje formu za kreiranje naloga za AAPL', () => {
    cy.contains('Kreiraj nalog').should('be.visible')
    cy.contains('AAPL').should('be.visible')
  })

  it('Margin checkbox nije prikazan — sistem ne nudi margin bez kredita', () => {
    // hasMarginPermission=false → label se ne renderuje uopšte
    cy.get('form').should('not.contain', 'Margin — trgovanje kreditom')
  })

  it('forma sadrži AON ali ne i Margin opciju', () => {
    cy.contains('All or None (AON)').should('be.visible')
    cy.get('form').should('not.contain', 'Margin — trgovanje kreditom')
  })
})

// ─── Scenario 64: Margin order dozvoljen — klijent sa kreditom ───────────────

describe('Scenario 64: Margin order dozvoljen — klijent sa ODOBREN kreditom', () => {
  beforeEach(() => {
    navigateClientToOrderForm(true)
  })

  it('prikazuje Margin checkbox jer klijent ima odobren kredit', () => {
    cy.contains('Margin — trgovanje kreditom (zahteva odobren kredit)').should('be.visible')
  })

  it('korisnik može označiti Margin i forma ostaje validna', () => {
    cy.contains('label', 'Margin').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').should('not.be.disabled')
  })

  it('potvrdom BUY naloga sa margin=true order se prihvata', () => {
    cy.intercept('POST', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { order: {} },
    }).as('createOrder')

    cy.contains('label', 'Margin').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrder').then((interception) => {
      expect(interception.request.body).to.have.property('margin', true)
    })
    cy.contains('Nalog je kreiran').should('be.visible')
  })
})

// ─── Scenario 65: Margin order dozvoljen — admin (sredstva na računu) ─────────

describe('Scenario 65: Margin order dozvoljen — admin ima automatsku marginalnu permisiju', () => {
  beforeEach(() => {
    navigateAdminToOrderForm()
  })

  it('prikazuje Margin checkbox adminu bez potrebe za kreditom', () => {
    // isActuaryTrader=true → setHasMarginPermission(true) automatski
    cy.contains('Margin — trgovanje kreditom (zahteva ulogu aktuara)').should('be.visible')
  })

  it('admin može označiti Margin i forma ostaje validna', () => {
    cy.contains('label', 'Margin').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').should('not.be.disabled')
  })

  it('potvrdom BUY naloga sa margin=true order se prihvata', () => {
    cy.intercept('POST', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { order: {} },
    }).as('createOrder')

    cy.contains('label', 'Margin').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrder').then((interception) => {
      expect(interception.request.body).to.have.property('margin', true)
    })
    cy.contains('Nalog je kreiran').should('be.visible')
  })
})

// ─── Scenario 66: AON oznaka se čuva uz order ─────────────────────────────────

describe('Scenario 66: AON oznaka se čuva uz order — allOrNone=true u POST body-u', () => {
  beforeEach(() => {
    navigateAdminToOrderForm()
  })

  it('AON checkbox je vidljiv sa opisom o celokupnom izvršenju', () => {
    cy.contains('All or None (AON) — izvršiti samo ako je moguće u celosti').should('be.visible')
  })

  it('AON checkbox se može označiti i forma ostaje validna', () => {
    cy.contains('label', 'All or None').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').should('not.be.disabled')
  })

  it('potvrdom naloga sa AON order se šalje sa allOrNone=true', () => {
    cy.intercept('POST', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { order: {} },
    }).as('createOrder')

    cy.contains('label', 'All or None').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrder').then((interception) => {
      expect(interception.request.body).to.have.property('allOrNone', true)
    })
    cy.contains('Nalog je kreiran').should('be.visible')
  })

  it('AON bez Margin — margin ostaje false u POST body-u', () => {
    cy.intercept('POST', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { order: {} },
    }).as('createOrderAon')

    cy.contains('label', 'All or None').find('input[type="checkbox"]').check()
    cy.get('form button[type="submit"]').click()
    cy.contains('button', 'Potvrdi kupovinu').click()

    cy.wait('@createOrderAon').then((interception) => {
      expect(interception.request.body).to.have.property('allOrNone', true)
      expect(interception.request.body).to.have.property('margin', false)
    })
  })
})

// ─── Scenario 69: Portfolio prikazuje podatke o porezu ───────────────────────

describe('Scenario 69: Portfolio prikazuje plaćen i neplaćen porez', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/portfolio/my', {
      statusCode: 200,
      body: {
        holdings: [],
        totalProfit: 0,
        taxPaidRsd: 12500,
        taxUnpaid: 3000,
      },
    }).as('getPortfolio')
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: [] },
    })
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
    }).as('loginReq')
    cy.login('klijent@test.com', 'TestPass12')
    cy.wait('@loginReq')
    cy.get('aside').contains('Portfolio').click()
    cy.wait('@getPortfolio')
  })

  it('prikazuje sekciju Porez u portfoliu', () => {
    cy.contains('Porez (tekuća godina)').should('be.visible')
  })

  it('prikazuje plaćen porez za tekuću godinu', () => {
    cy.contains('Plaćen porez (god.):').should('be.visible')
    cy.contains('12.500,00 RSD').should('be.visible')
  })

  it('prikazuje neplaćen porez za tekući mesec', () => {
    cy.contains('Neplaćen (mes.):').should('be.visible')
    cy.contains('3.000,00 RSD').should('be.visible')
  })

})

// ─── Scenario 70: Za akcije postoji opcija javnog režima ─────────────────────

describe('Scenario 70: Za akcije postoji opcija javnog (OTC) režima', () => {
  const STOCK_WITH_PUBLIC = {
    listingId: '1', ticker: 'AAPL', name: 'Apple Inc.', listingType: 'STOCK',
    quantity: 10, availableQuantity: 10, accountId: '5',
    publicShares: 3, publicQuantity: 3, reservedInContracts: 0,
    currentPrice: 180.00, avgBuyPrice: 175.00, profit: 50.00,
    lastModified: '2026-01-01T00:00:00Z', detailsJson: '', buyLots: [],
  }

  beforeEach(() => {
    cy.intercept('GET', '/api/bank/portfolio/my', {
      statusCode: 200,
      body: {
        holdings: [STOCK_WITH_PUBLIC],
        totalProfit: 50,
        taxPaidRsd: 0,
        taxUnpaid: 0,
      },
    }).as('getPortfolio')
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: [] },
    })
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
    }).as('loginReq')
    cy.login('klijent@test.com', 'TestPass12')
    cy.wait('@loginReq')
    cy.get('aside').contains('Portfolio').click()
    cy.wait('@getPortfolio')
  })

  it('prikazuje AAPL u portfoliju', () => {
    cy.contains('AAPL').should('be.visible')
  })

  it('prikazuje broj akcija u javnom režimu u OTC koloni', () => {
    // publicQuantity=3 → kolona prikazuje "3 javno"
    cy.contains('3 javno').should('be.visible')
  })

  it('prikazuje OTC dugme sa brojem javno objavljenih akcija', () => {
    // maxPublic = quantity(10) - publicShares(3) = 7 > 0 → dugme vidljivo
    cy.contains('button', 'OTC (3 javno)').should('be.visible')
  })

  it('klikom na OTC dugme otvara se dijalog za objavljivanje akcija', () => {
    cy.contains('button', 'OTC (3 javno)').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Objavi akcije AAPL za OTC').should('be.visible')
  })
})

// ─── Scenario 73: Hartija prelazi u portfolio privatna po difoltu ─────────────

describe('Scenario 73: Hartija u portfoliju je privatna po difoltu nakon BUY ordera', () => {
  // Simulira stanje posle izvršenog BUY ordera: holding postoji, publicQuantity=0 (privatno)
  const STOCK_PRIVATE = {
    listingId: '2', ticker: 'MSFT', name: 'Microsoft Corp.', listingType: 'STOCK',
    quantity: 5, availableQuantity: 5, accountId: '5',
    publicShares: 0, publicQuantity: 0, reservedInContracts: 0,
    currentPrice: 390.00, avgBuyPrice: 380.00, profit: 50.00,
    lastModified: '2026-01-01T00:00:00Z', detailsJson: '', buyLots: [],
  }

  beforeEach(() => {
    cy.intercept('GET', '/api/bank/portfolio/my', {
      statusCode: 200,
      body: {
        holdings: [STOCK_PRIVATE],
        totalProfit: 50,
        taxPaidRsd: 0,
        taxUnpaid: 0,
      },
    }).as('getPortfolio')
    cy.intercept('GET', '/api/bank/client/accounts', {
      statusCode: 200,
      body: { accounts: [] },
    })
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
    }).as('loginReq')
    cy.login('klijent@test.com', 'TestPass12')
    cy.wait('@loginReq')
    cy.get('aside').contains('Portfolio').click()
    cy.wait('@getPortfolio')
  })

  it('hartija MSFT se pojavljuje u portfoliju nakon izvršenog BUY', () => {
    cy.contains('MSFT').should('be.visible')
    cy.contains('Microsoft Corp.').should('be.visible')
  })

  it('hartija je po difoltu označena kao privatna — nije javno', () => {
    // publicQuantity=0 → OTC kolona prikazuje "nije javno"
    cy.contains('nije javno').should('be.visible')
  })

  it('STOCK badge je vidljiv uz hartiju', () => {
    cy.contains('STOCK').should('be.visible')
  })

  it('količina od 5 komada je prikazana u tabeli', () => {
    cy.contains('MSFT').closest('tr').within(() => {
      cy.contains('5').should('be.visible')
    })
  })
})

export {}
