/**
 * Feature: Odobravanje i pregled naloga — Scenariji 48, 49, 50, 53, 54
 * Feature: Izvršavanje naloga — Scenario 59
 *
 * Auth strategy: admin / client (TRADE_STOCKS) / agent (EMPLOYEE) JWT stub.
 * Nema realnih API poziva — svi odgovori su stub-ovani.
 *
 * S48: Klijentov order automatski dobija status Approved
 * S49: Agentov order sa needApproval=true ide na čekanje (pogled agenta + supervizora)
 * S50: Agentov order iznad dnevnog limita ide na čekanje
 * S53: Supervizor odbija pending order
 * S54: Pokušaj odobravanja odbačen za nalog na istekloj hartiji — Odbij ostaje dostupan
 * S59: Market BUY order se izvršava u delovima (partial fills, auto-refresh)
 */

// ─── JWT helpers ───────────────────────────────────────────────────────────────

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

function makeAgentJwt(): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({
    sub: '20', email: 'agent@test.com', user_type: 'EMPLOYEE',
    permissions: [], exp: 9_999_999_999, iat: 1_000_000_000,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${header}.${payload}.fakesig`
}

const ADMIN_JWT  = makeAdminJwt()
const CLIENT_JWT = makeClientJwt()
const AGENT_JWT  = makeAgentJwt()

// ─── Mock orders ────────────────────────────────────────────────────────────────

const MOCK_ORDER_APPROVED = {
  id: '42', userId: '30', accountId: '5', listingId: '1',
  orderType: 'MARKET', direction: 'BUY',
  quantity: 5, contractSize: 1,
  status: 'APPROVED', isDone: false, remainingPortions: 5,
  afterHours: false, allOrNone: false, margin: false,
  lastModified: '2026-05-13T10:00:00Z', createdAt: '2026-05-13T10:00:00Z',
}

const MOCK_ORDER_PENDING = {
  ...MOCK_ORDER_APPROVED,
  id: '43', userId: '20', status: 'PENDING',
}

const MOCK_ORDER_DECLINED = {
  ...MOCK_ORDER_PENDING,
  status: 'DECLINED',
}

// Order za S59 — quantity=10, initially unfilled
const MOCK_MARKET_ORDER_10 = {
  id: '99', userId: '1', accountId: '0', listingId: '1',
  orderType: 'MARKET', direction: 'BUY',
  quantity: 10, contractSize: 1,
  status: 'APPROVED', isDone: false, remainingPortions: 10,
  afterHours: false, allOrNone: false, margin: false,
  lastModified: '2026-05-13T10:00:00Z', createdAt: '2026-05-13T10:00:00Z',
}

// ─── Auth setups ────────────────────────────────────────────────────────────────

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

function setupClientAuth() {
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: CLIENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('klijent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

function setupAgentAuth(needApproval: boolean, usedLimit: string) {
  cy.intercept('GET', '/api/bank/currencies', { statusCode: 200, body: { valute: [] } })
  cy.intercept('GET', '/api/bank/delatnosti', { statusCode: 200, body: { delatnosti: [] } })
  cy.intercept('GET', '/api/actuary/me', {
    statusCode: 200,
    body: {
      actuary: {
        id: '2', employeeId: '20', actuaryType: 'ACTUARY_TYPE_AGENT',
        limit: '100000', usedLimit: usedLimit, needApproval: needApproval,
      },
    },
  })
  cy.intercept('POST', '/api/login', {
    statusCode: 200,
    body: { accessToken: AGENT_JWT, refreshToken: 'fake-refresh' },
  }).as('loginReq')
  cy.login('agent@test.com', 'TestPass12')
  cy.wait('@loginReq')
}

// ─── Scenario 48: Klijentov order automatski dobija status Approved ─────────────

describe('Scenario 48: Klijentov order automatski dobija status Approved', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_APPROVED] },
    }).as('getMyOrders')

    setupClientAuth()
    cy.get('aside').contains('Moji nalozi').click()
    cy.wait('@getMyOrders')
  })

  it('prikazuje stranicu Moji nalozi', () => {
    cy.contains('Moji nalozi').should('be.visible')
  })

  it('klijentov order ima status Odobreno (automatski odobren, bez čekanja na supervizora)', () => {
    cy.contains('Odobreno').should('be.visible')
  })

  it('odobreni klijentov order ne prikazuje oznaku Čeka odobrenje', () => {
    cy.contains('Čeka odobrenje').should('not.exist')
  })
})

// ─── Scenario 49: Agentov PENDING order — pogled agenta ───────────────────────

describe('Scenario 49 (agent pogled): Agentov order sa needApproval=true dobija status Pending', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_PENDING] },
    }).as('getMyOrders')

    setupAgentAuth(true, '30000')
    cy.get('aside').contains('Moji nalozi').click()
    cy.wait('@getMyOrders')
  })

  it('agentov order prikazuje status Na čekanju', () => {
    cy.contains('Na čekanju').should('be.visible')
  })

  it('prikazuje oznaku Čeka odobrenje za PENDING order agenta sa needApproval=true', () => {
    cy.contains('Čeka odobrenje').should('be.visible')
  })
})

// ─── Scenario 49: Agentov PENDING order — pogled supervizora ──────────────────

describe('Scenario 49 (supervizor pogled): Agentov PENDING order vidljiv u portalu supervizora', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_PENDING] },
    }).as('getOrders')
    // Enrich user names → 404 fallback prikazuje #userId (ne utiče na test)
    cy.intercept('GET', '/api/client/*', { statusCode: 404, body: {} })
    cy.intercept('GET', '/api/employee/*', { statusCode: 404, body: {} })

    setupAdminAuth()
    cy.get('aside').contains('Nalozi (trading)').click()
    cy.wait('@getOrders')
  })

  it('supervizor vidi portal za pregled naloga', () => {
    cy.contains('Pregled naloga').should('be.visible')
  })

  it('agentov PENDING order je vidljiv u portalu supervizora', () => {
    cy.contains('Na čekanju').should('be.visible')
  })

  it('supervizor može odobriti ili odbiti PENDING order agenta', () => {
    // scope to tbody — avoids matching "Odbijeno" status filter; scrollIntoView for wide table
    cy.get('tbody').contains('button', 'Odobri').scrollIntoView().should('be.visible')
    cy.get('tbody').contains('button', 'Odbij').scrollIntoView().should('be.visible')
  })
})

// ─── Scenario 50: Agentov order iznad dnevnog limita ide na čekanje ────────────

describe('Scenario 50: Agentov order iznad dnevnog limita dobija status Pending', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_PENDING] },
    }).as('getMyOrders')

    // Agent: needApproval=false, ali usedLimit=90000 od 100000 → sledeći order prelazi limit
    setupAgentAuth(false, '90000')
    cy.get('aside').contains('Moji nalozi').click()
    cy.wait('@getMyOrders')
  })

  it('prikazuje status Na čekanju za order koji prelazi dnevni limit', () => {
    cy.contains('Na čekanju').should('be.visible')
  })

  it('prikazuje oznaku Čeka odobrenje (order čeka supervisora i kad needApproval=false)', () => {
    cy.contains('Čeka odobrenje').should('be.visible')
  })
})

// ─── Scenario 53: Supervizor odbija pending order ─────────────────────────────

describe('Scenario 53: Supervizor odbija pending order', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_PENDING] },
    }).as('getOrders')
    cy.intercept('GET', '/api/client/*', { statusCode: 404, body: {} })
    cy.intercept('GET', '/api/employee/*', { statusCode: 404, body: {} })

    setupAdminAuth()
    cy.get('aside').contains('Nalozi (trading)').click()
    cy.wait('@getOrders')
  })

  it('prikazuje portal za pregled naloga sa PENDING orderom', () => {
    cy.contains('Pregled naloga').should('be.visible')
    cy.contains('Na čekanju').should('be.visible')
  })

  it('klikom na Odbij prikazuje toast potvrdu o odbijanju', () => {
    cy.intercept('POST', '/api/bank/trading/orders/43/decline', {
      statusCode: 200,
      body: { order: MOCK_ORDER_DECLINED },
    }).as('declineOrder')

    cy.intercept('GET', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_DECLINED] },
    }).as('getOrdersRefresh')

    cy.get('tbody').contains('button', 'Odbij').click()
    cy.wait('@declineOrder')
    cy.contains('Nalog #43 je odbijen.', { timeout: 8_000 }).should('be.visible')
  })

  it('status ordera postaje Odbijeno posle akcije odbijanja', () => {
    cy.intercept('POST', '/api/bank/trading/orders/43/decline', {
      statusCode: 200,
      body: { order: MOCK_ORDER_DECLINED },
    }).as('declineOrder')

    cy.intercept('GET', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_DECLINED] },
    }).as('getOrdersRefresh')

    cy.get('tbody').contains('button', 'Odbij').click()
    cy.wait('@declineOrder')
    cy.wait('@getOrdersRefresh')
    cy.contains('Odbijeno').should('be.visible')
  })
})

// ─── Scenario 54: Odobravanje odbačeno za isteklu hartiju — Odbij ostaje ───────
// Adaptirano: frontend prikazuje 'Odobri' za sve PENDING naloge (nema klijentske
// provjere isteka settlement date-a). Backend odbija odobravanje greškom kad je
// rok istekao. Test verifikuje error handling i da 'Odbij' ostaje dostupan.

describe('Scenario 54: Pokušaj odobravanja istekle hartije vraća grešku, Odbij ostaje dostupan', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_PENDING] },
    }).as('getOrders')
    cy.intercept('GET', '/api/client/*', { statusCode: 404, body: {} })
    cy.intercept('GET', '/api/employee/*', { statusCode: 404, body: {} })

    setupAdminAuth()
    cy.get('aside').contains('Nalozi (trading)').click()
    cy.wait('@getOrders')
  })

  it('dugme Odbij je dostupno za PENDING order na istekloj hartiji', () => {
    cy.get('tbody').contains('button', 'Odbij').scrollIntoView().should('be.visible')
  })

  it('pokušaj odobravanja istekle hartije prikazuje grešku od backenda', () => {
    cy.intercept('POST', '/api/bank/trading/orders/43/approve', {
      statusCode: 400,
      body: { code: 3, message: 'Rok hartije je istekao' },
    }).as('approveOrder')

    cy.get('tbody').contains('button', 'Odobri').click()
    cy.wait('@approveOrder')
    cy.contains('Rok hartije je istekao', { timeout: 8_000 }).should('be.visible')
  })

  it('dugme Odbij je i dalje dostupno posle neuspelog odobravanja', () => {
    cy.intercept('POST', '/api/bank/trading/orders/43/approve', {
      statusCode: 400,
      body: { code: 3, message: 'Rok hartije je istekao' },
    }).as('approveOrder')

    cy.get('tbody').contains('button', 'Odobri').click()
    cy.wait('@approveOrder')
    // fetchOrders se ne poziva pri grešci — order ostaje PENDING u UI-u
    cy.get('tbody').contains('button', 'Odbij').scrollIntoView().should('be.visible')
  })

  it('odbijanje uspeva i posle neuspelog pokušaja odobravanja', () => {
    cy.intercept('POST', '/api/bank/trading/orders/43/approve', {
      statusCode: 400,
      body: { code: 3, message: 'Rok hartije je istekao' },
    }).as('approveOrder')
    cy.intercept('POST', '/api/bank/trading/orders/43/decline', {
      statusCode: 200,
      body: { order: MOCK_ORDER_DECLINED },
    }).as('declineOrder')
    cy.intercept('GET', '/api/bank/trading/orders*', {
      statusCode: 200,
      body: { orders: [MOCK_ORDER_DECLINED] },
    }).as('getOrdersRefresh')

    cy.get('tbody').contains('button', 'Odobri').click()
    cy.wait('@approveOrder')
    cy.get('tbody').contains('button', 'Odbij').click()
    cy.wait('@declineOrder')
    cy.contains('Nalog #43 je odbijen.', { timeout: 8_000 }).should('be.visible')
  })
})

// ─── Scenario 59: Market BUY order — partial fills (auto-refresh) ─────────────

describe('Scenario 59: Market order se izvršava u delovima (partial fills)', () => {
  // cy.clock() mora biti pre cy.login() kako bi setInterval bio registrovan na fake clock-u
  beforeEach(() => {
    cy.clock()

    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: { orders: [MOCK_MARKET_ORDER_10] },
    }).as('getMyOrders')

    setupAdminAuth()
    cy.get('aside').contains('Moji nalozi').click()
    cy.wait('@getMyOrders')
  })

  it('prikazuje inicijalno stanje — 0 od 10 portija popunjeno, status Odobreno', () => {
    cy.contains('0/10').should('be.visible')
    cy.contains('Odobreno').should('be.visible')
  })

  it('posle prvog partial fill-a prikazuje 3 od 10 popunjene portije', () => {
    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: {
        orders: [{ ...MOCK_MARKET_ORDER_10, remainingPortions: 7 }],
      },
    }).as('getMyOrdersPartial')

    cy.tick(10_000)
    cy.wait('@getMyOrdersPartial')
    cy.contains('3/10').should('be.visible')
  })

  it('posle drugog partial fill-a prikazuje 7 od 10 popunjenih portija', () => {
    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: {
        orders: [{ ...MOCK_MARKET_ORDER_10, remainingPortions: 3 }],
      },
    }).as('getMyOrdersPartial2')

    cy.tick(10_000)
    cy.wait('@getMyOrdersPartial2')
    cy.contains('7/10').should('be.visible')
  })

  it('order dobija status Izvršeno kada su sve portije popunjene (isDone=true)', () => {
    cy.intercept('GET', '/api/bank/trading/my-orders*', {
      statusCode: 200,
      body: {
        orders: [{
          ...MOCK_MARKET_ORDER_10,
          remainingPortions: 0,
          isDone: true,
          status: 'DONE',
        }],
      },
    }).as('getMyOrdersDone')

    cy.tick(10_000)
    cy.wait('@getMyOrdersDone')
    cy.contains('10/10').should('be.visible')
    cy.contains('Izvršeno').should('be.visible')
  })
})

export {}
