// seed-data.js
// Standalone script to populate the EBID platform with realistic test accounts,
// seller auctions with working images, deposits, and active bids.
//
// RUN: node seed-data.js (Ensure docker compose stack is running)

const BASE = 'http://localhost';

async function req(method, path, body, token) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { }
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

async function registerOrLogin(username, email, password, role) {
  const reg = await req('POST', '/api/auth/auth/register', { username, email, password, role });
  if (reg.status === 201 || reg.status === 200) {
    console.log(`  ✅ Registered ${username} (${role})`);
    return reg.data;
  }
  const login = await req('POST', '/api/auth/auth/login', { username, password });
  if (login.status === 200) {
    console.log(`  🔑 Logged in existing ${username} (${role})`);
    return login.data;
  }
  throw new Error(`Auth failed for ${username}: ${JSON.stringify(login.data || reg.data)}`);
}

async function seed() {
  console.log('=====================================================');
  console.log('🌱 EBID Test Data & Product Seeder');
  console.log('=====================================================\n');

  // 1. Create Sellers
  console.log('📦 Step 1: Creating Sellers...');
  const techSeller = await registerOrLogin('tech_vault', 'tech@ebid.demo', 'Pass1234!', 'SELLER');
  const luxurySeller = await registerOrLogin('luxury_goods', 'luxury@ebid.demo', 'Pass1234!', 'SELLER');
  const antiqueSeller = await registerOrLogin('heritage_relics', 'heritage@ebid.demo', 'Pass1234!', 'SELLER');

  // 2. Create Bidders & Fund Wallets
  console.log('\n💳 Step 2: Creating Bidders & Depositing Funds...');
  const bidder1 = await registerOrLogin('alice_bidder', 'alice@ebid.demo', 'Pass1234!', 'BIDDER');
  const bidder2 = await registerOrLogin('bob_collector', 'bob@ebid.demo', 'Pass1234!', 'BIDDER');
  const bidder3 = await registerOrLogin('charlie_hunter', 'charlie@ebid.demo', 'Pass1234!', 'BIDDER');

  const bidders = [bidder1, bidder2, bidder3];
  for (const b of bidders) {
    const dep = await req('POST', '/api/wallet/wallet/deposit', { userId: b.userId, amount: 5000.00 }, b.token);
    console.log(`  💰 Deposited $5,000 to ${b.username || 'Bidder #' + b.userId} (Status: ${dep.status})`);
  }

  // 3. Create Sample Products / Auctions
  console.log('\n🏷️ Step 3: Listing Test Products Across Categories...');
  const products = [
    {
      seller: techSeller,
      title: 'Sony Alpha A7 IV Full-Frame Mirrorless Camera',
      description: 'Brand new in box, 33MP Exmor R CMOS sensor, 4K 60p video, 10-bit 4:2:2 color profile. Includes 28-70mm kit lens.',
      startingPrice: 1800,
      category: 'Electronics',
      durationMinutes: 180,
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'
    },
    {
      seller: techSeller,
      title: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
      description: 'Space Black edition with 16-core CPU, 40-core GPU, Liquid Retina XDR display. Battery cycle count: 4.',
      startingPrice: 2800,
      category: 'Computers',
      durationMinutes: 240,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
    },
    {
      seller: luxurySeller,
      title: 'Vintage Rolex Submariner Date (Ref: 16610 - 1998)',
      description: 'Oystersteel case with black dial and unidirectional rotatable bezel. Comes with original papers and box certificate.',
      startingPrice: 7500,
      category: 'Jewelry & Watches',
      durationMinutes: 360,
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'
    },
    {
      seller: luxurySeller,
      title: 'Hermès Birkin 30 Togo Leather Handbag',
      description: 'Authentic Noir black Togo leather with gold-plated hardware. Pristine condition with dust bag, keys, and clochette.',
      startingPrice: 9200,
      category: 'Fashion & Luxury',
      durationMinutes: 480,
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80'
    },
    {
      seller: antiqueSeller,
      title: 'First Edition "The Great Gatsby" by F. Scott Fitzgerald (1925)',
      description: 'Rare first printing collector piece in custom preservation slipcase. Minimal wear, clean original text pages.',
      startingPrice: 3200,
      category: 'Collectibles',
      durationMinutes: 120,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
    },
    {
      seller: antiqueSeller,
      title: 'Mid-Century Eames Lounge Chair & Ottoman in Walnut',
      description: 'Original Herman Miller authorized production with premium black leather upholstery and molded plywood shell.',
      startingPrice: 4200,
      category: 'Art & Design',
      durationMinutes: 300,
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const createdAuctions = [];
  for (const item of products) {
    const endTime = new Date(Date.now() + item.durationMinutes * 60 * 1000).toISOString().slice(0, 19);
    const created = await req('POST', '/api/auctions/auctions', {
      title: item.title,
      description: item.description,
      startingPrice: item.startingPrice,
      category: item.category,
      endTime,
      sellerId: item.seller.userId,
      imageUrl: item.imageUrl,
    }, item.seller.token);

    if (created.status === 201 || created.status === 200) {
      console.log(`  🎉 Listed: "${item.title}" ($${item.startingPrice}) [ID: ${created.data.id}]`);
      createdAuctions.push(created.data);
    } else {
      console.log(`  ❌ Failed to list "${item.title}":`, created.data || created.error);
    }
  }

  // 4. Place Initial Bids on first few items to demonstrate live activity
  console.log('\n🔥 Step 4: Placing Realistic Test Bids...');
  if (createdAuctions.length > 0) {
    const a1 = createdAuctions[0]; // Camera ($1800)
    const bid1 = await req('POST', `/api/auctions/auctions/${a1.id}/bid`, { bidderId: bidder1.userId, amount: 1850 }, bidder1.token);
    console.log(`  ⚡ ${bidder1.username} bid $1,850 on "${a1.title}" (Status: ${bid1.status})`);

    const bid2 = await req('POST', `/api/auctions/auctions/${a1.id}/bid`, { bidderId: bidder2.userId, amount: 1900 }, bidder2.token);
    console.log(`  ⚡ ${bidder2.username} outbid with $1,900 on "${a1.title}" (Status: ${bid2.status})`);
  }

  if (createdAuctions.length > 1) {
    const a2 = createdAuctions[1]; // MacBook ($2800)
    const bid3 = await req('POST', `/api/auctions/auctions/${a2.id}/bid`, { bidderId: bidder3.userId, amount: 2950 }, bidder3.token);
    console.log(`  ⚡ ${bidder3.username} bid $2,950 on "${a2.title}" (Status: ${bid3.status})`);
  }

  console.log('\n=====================================================');
  console.log('✅ Seeding Complete!');
  console.log('=====================================================');
  console.log('👥 Demo Credentials:');
  console.log('   - Seller (Tech):    tech_vault    / Pass1234!');
  console.log('   - Seller (Luxury):  luxury_goods  / Pass1234!');
  console.log('   - Bidder 1 (Alice): alice_bidder  / Pass1234! (Balance: $5,000)');
  console.log('   - Bidder 2 (Bob):   bob_collector / Pass1234! (Balance: $5,000)');
  console.log('   - Bidder 3 (Charlie): charlie_hunter / Pass1234! (Balance: $5,000)');
  console.log('\nOpen http://localhost in your browser to view your live marketplace!\n');
}

seed().catch(err => {
  console.error('Fatal seeder error:', err);
  process.exit(1);
});
