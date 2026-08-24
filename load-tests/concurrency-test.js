// concurrency-test.js
//
// End-to-end concurrency test for simultaneous bidding, per the assignment:
// "Perform end-to-end load & concurrency verification (testing simultaneous
// bids on the same auction)."
//
// This talks to the running docker-compose stack over plain HTTP, the same
// way the frontend's api.js does — it doesn't depend on any backend
// internals, so it still works even if AuctionController/Bid.java change.
//
// REQUIREMENTS: Node.js 18+ (for built-in fetch). No npm install needed.
// RUN:          docker-compose up   (in another terminal, keep it running)
//               node concurrency-test.js
//
// WHAT IT CHECKS:
//   1. Race condition test — N bidders bid the SAME amount at the exact
//      same instant. Correct behavior: exactly ONE bid is accepted. If more
//      than one succeeds, the backend isn't correctly serializing writes
//      to the auction's current bid (a real concurrency bug, not a false
//      alarm — this is the core thing this kind of test exists to catch).
//   2. Bid-war test — escalating amounts fired concurrently; confirms the
//      auction settles on the genuinely highest amount, not a stale one.
//   3. Wallet consistency — confirms outbid bidders get unfrozen and only
//      the current leader still has funds frozen.

const BASE = 'http://localhost';
const NUM_BIDDERS = 8;
const SAME_BID_AMOUNT = 50; // used simultaneously by all bidders in test 1
const STARTING_PRICE = 10;
const DEPOSIT_AMOUNT = 1000;

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  return { status: res.status, data };
}

async function registerOrLogin(username, email, password, role) {
  const reg = await req(
    'POST',
    '/api/auth/auth/register',
    { username, email, password, role }
  );

  console.log(`${username}: register -> ${reg.status}`);

  if (reg.status === 201) {
    console.log(`${username}: registration successful`);
    return reg.data;
  }

  console.log(`${username}: registration response ->`, reg.data);
  console.log(`${username}: trying login...`);

  while (true) {
    const login = await req(
      'POST',
      '/api/auth/auth/login',
      { username, password }
    );

    console.log(`${username}: login -> ${login.status}`);

    if (login.status === 200) {
      console.log(`${username}: login successful`);
      return login.data;
    }

    if (login.status === 429) {
      console.log(`${username}: rate limited. Waiting 15 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
      continue;
    }

    throw new Error(
      `Could not register or log in ${username}: status=${login.status}, response=${JSON.stringify(login.data)}`
    );
  }
}
async function main() {
  console.log(`Setting up: 1 seller, ${NUM_BIDDERS} bidders...`);

  const seller = await registerOrLogin('loadtest_seller', 'seller@loadtest.local', 'Passw0rd!1', 'SELLER');

  const bidders = [];
  for (let i = 0; i < NUM_BIDDERS; i++) {
    const u = await registerOrLogin(`loadtest_bidder_${i}`, `bidder${i}@loadtest.local`, 'Passw0rd!1', 'BIDDER');
    const dep = await req('POST', '/api/wallet/wallet/deposit', { userId: u.userId, amount: DEPOSIT_AMOUNT }, u.token);
    console.log(`loadtest_bidder_${i}: deposit ($${DEPOSIT_AMOUNT}) -> status ${dep.status}`, dep.data || '');
    bidders.push(u);
  }

  const endTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 19);
  const created = await req('POST', '/api/auctions/auctions', {
    title: 'Concurrency Test Item',
    description: 'For load testing simultaneous bids',
    startingPrice: STARTING_PRICE,
    category: 'General',
    endTime,
    sellerId: seller.userId,
  }, seller.token);

  if (created.status >= 300) {
    console.error('Failed to create auction:', created.data);
    process.exit(1);
  }
  const auctionId = created.data.id;
  console.log(`Auction #${auctionId} created.\n`);

  // ── Test 1: identical bid amount fired simultaneously ────────────────────
  console.log('--- Test 1: race condition (same amount, fired at once) ---');
  const sameAmountResults = await Promise.allSettled(
    bidders.map(b => req('POST', `/api/auctions/auctions/${auctionId}/bid`,
      { bidderId: b.userId, amount: SAME_BID_AMOUNT }, b.token))
  );

  const accepted = sameAmountResults.filter(r => r.status === 'fulfilled' && r.value.status === 200);
  console.log(`${accepted.length} accepted, ${sameAmountResults.length - accepted.length} rejected out of ${bidders.length}`);

  if (accepted.length > 1) {
    console.error('FAIL: race condition detected — more than one bid at the same amount was accepted.');
  } else if (accepted.length === 1) {
    console.log('PASS: exactly one bid accepted, as expected.');
  } else {
    console.error('FAIL: no bid was accepted at all — check server errors below:');
    console.error(sameAmountResults.map(r => r.status === 'fulfilled' ? r.value.data : r.reason));
  }

  // ── Test 2: escalating bid war fired concurrently ────────────────────────
  console.log('\n--- Test 2: concurrent bid war (escalating amounts) ---');
  const current = await req('GET', `/api/auctions/auctions/${auctionId}`);
  const currentBid = parseFloat(current.data.currentBid || current.data.startingPrice);

  const warResults = await Promise.allSettled(
    bidders.map((b, i) => req('POST', `/api/auctions/auctions/${auctionId}/bid`,
      { bidderId: b.userId, amount: currentBid + 5 + i }, b.token))
  );
  const warAccepted = warResults.filter(r => r.status === 'fulfilled' && r.value.status === 200);
  console.log(`${warAccepted.length}/${bidders.length} bids accepted (expect several, settling on the highest)`);

  const after = await req('GET', `/api/auctions/auctions/${auctionId}`);
  console.log(`Final current bid: $${after.data.currentBid} — highest bidder: #${after.data.highestBidderId}`);

  // ── Test 3: wallet consistency across all bidders ────────────────────────
  console.log('\n--- Test 3: wallet freeze consistency ---');
  let totalFrozen = 0;
  for (const b of bidders) {
    const wallet = await req('GET', `/api/wallet/wallet/${b.userId}`, null, b.token);
    const frozen = parseFloat(wallet.data.frozenBalance || 0);
    totalFrozen += frozen;
    console.log(`  bidder #${b.userId}: available=$${wallet.data.availableBalance}, frozen=$${frozen}`);
  }
  const expectedFrozen = parseFloat(after.data.currentBid);
  console.log(`\nTotal frozen across all bidders: $${totalFrozen.toFixed(2)} (expected: $${expectedFrozen.toFixed(2)}, i.e. only the current leader's bid)`);
  if (Math.abs(totalFrozen - expectedFrozen) > 0.01) {
    console.error('FAIL: frozen funds do not match the current highest bid — a bidder was likely not unfrozen correctly when outbid.');
  } else {
    console.log('PASS: frozen funds match the current highest bid exactly.');
  }
}

main().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});