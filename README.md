# ⚡ EBID — Online Auction & Marketplace Platform

A full-stack, real-time **Microservices E-Commerce Platform** combining eBay-style competitive bidding with a StockX-style integrated digital wallet.

Built as a semester project for the **Web Architecture Course**.

---

## 👥 Team Members

| Name | Student ID | Core Responsibilities |
|------|------------|-----------------------|
| **Bello** | 220041158 | Lead - Auth Service & Security (JWT, Security Filter Chain, Validation) |
| **Zinnia** | 220041106 | Lead - Wallet Service & Database Integrity (ACID Transactions, Locking, Ledger) |
| **Alizah** | 220041265 | Lead - Auction Service & Real-time Messaging (WebSockets, STOMP, Scheduler, JPQL) |
| **Maliha** | 220041202 | Lead - Frontend UI & Nginx Gateway (React, Glassmorphic UI, Proxying, End-to-End) |

---

## 🏗️ Microservice Architecture

```
[ Client Browser ]
        │
        ▼ (HTTP / WebSockets on Port 80)
┌─────────────────────────────────────────────────────────────┐
│                 Nginx API Gateway (Port 80)                 │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Auth Service │   │Auction Service│  │Wallet Service│
│ (Port 8081)  │   │ (Port 8082)  │   │ (Port 8083)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ PostgreSQL   │   │ PostgreSQL   │   │ PostgreSQL   │
│  (auth_db)   │   │ (auction_db) │   │ (wallet_db)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Component Stack
* **Frontend:** React.js (Vite), Vanilla CSS Glassmorphism, React Router, STOMP.js / SockJS WebSockets, React Hot Toast.
* **Backend Microservices:** Java 17, Spring Boot 3.2, Spring Security (JWT), Spring Data JPA, PostgreSQL Driver, WebSockets (STOMP).
* **Gateway & Web Server:** Nginx.
* **Databases:** PostgreSQL 15 (isolated DBs per service: `auth_db`, `auction_db`, `wallet_db`).
* **Containerization:** Docker & Docker Compose.

---

## 🚀 Quick Start (One-Command Running via Docker)

### 1. Prerequisites
- **Docker Desktop** installed and running.
- **WSL 2 Engine** enabled in Windows (Run `wsl --install --no-distribution` in PowerShell as Administrator if not already installed).

### 2. Launch the Application
Open your terminal in the project root directory and run:

```bash
docker compose up --build
```

> **Note:** The initial build takes 3–5 minutes as Maven downloads base images and project dependencies. Subsequent launches take under 10 seconds.

### 3. Open in Browser
Navigate to:
👉 **[http://localhost](http://localhost)**

---

## 🔧 Local Development Setup (Manual / Standalone)

If you wish to run the React frontend locally with Hot Module Replacement (HMR) while using the containerized backend microservices:

### 1. Start Backend Microservices via Docker
```bash
docker compose up -d db auth-service wallet-service auction-service gateway
```

### 2. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser. Requests are automatically proxied to backend services via `vite.config.js`.

---

## 📡 API Reference & Endpoints

### 1. Auth Service (`/api/auth`)
| Method | Endpoint | Description | Sample Body / Parameters |
|--------|----------|-------------|--------------------------|
| `POST` | `/auth/register` | Register a new user | `{ "username": "bello", "email": "bello@ebid.com", "password": "password123", "role": "BIDDER" }` |
| `POST` | `/auth/login` | Authenticate user & receive JWT | `{ "username": "bello", "password": "password123" }` |
| `GET` | `/auth/validate` | Verify JWT token validity | Header: `Authorization: Bearer <token>` |
| `GET` | `/auth/users/{id}` | Fetch public user profile | None |

### 2. Wallet Service (`/api/wallet`)
| Method | Endpoint | Description | Sample Body / Parameters |
|--------|----------|-------------|--------------------------|
| `GET` | `/wallet/{userId}` | Get wallet balance & frozen funds | None |
| `POST` | `/wallet/deposit` | Add funds to wallet | `{ "userId": 1, "amount": 500.00 }` |
| `POST` | `/wallet/freeze` | Freeze funds for an active bid | `{ "userId": 1, "amount": 150.00, "description": "Bid freeze" }` |
| `POST` | `/wallet/release` | Unfreeze funds when outbid | `{ "userId": 1, "amount": 150.00, "description": "Outbid refund" }` |
| `POST` | `/wallet/payout` | Transfer winner funds to seller | `{ "fromUserId": 1, "toUserId": 2, "amount": 150.00 }` |
| `GET` | `/wallet/{userId}/transactions` | Full ledger transaction history | None |

### 3. Auction Service (`/api/auctions`)
| Method | Endpoint | Description | Sample Body / Parameters |
|--------|----------|-------------|--------------------------|
| `GET` | `/auctions` | List active live auctions | None |
| `GET` | `/auctions/{id}` | Get auction details by ID | None |
| `POST` | `/auctions` | Create new auction (Seller) | `{ "title": "Rolex Submariner", "description": "Mint condition", "sellerId": 2, "startingPrice": 2500, "endTime": "2026-12-31T23:59:59", "category": "Jewelry" }` |
| `POST` | `/auctions/{id}/bid` | Place a bid on auction | `{ "bidderId": 1, "amount": 2600.00 }` |
| `GET` | `/auctions/{id}/bids` | Get bid history for auction | None |

### 4. WebSockets (`/ws`)
* **Endpoint:** `ws://localhost/ws` (STOMP via SockJS)
* **Topic Subscription:** `/topic/auction/{id}`
* **Payload Broadcast:** `{ "auctionId": 1, "currentBid": 2600.00, "bidderId": 1, "timestamp": "..." }`

---

## 🛠️ Troubleshooting & Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| **`docker-compose: command not found`** | Legacy docker-compose CLI syntax | Use `docker compose up --build` (with a space) |
| **`failed to connect to docker API 500`** | WSL2 engine not running in Docker Desktop | Run `wsl --install --no-distribution` in PowerShell (Admin), restart PC, then reopen Docker Desktop |
| **`value too long for type character varying(255)`** | Long Base64 Image URLs | Fixed in `Auction.java` (`@Column(columnDefinition = "TEXT")`) & DB column altered to `TEXT` |
| **Blank White/Black Screen on React Load** | SockJS looking for legacy Node `global` variable in browser | Fixed via global polyfill script in `index.html` and `define: { global: 'window' }` in `vite.config.js` |

---

## 📜 Repository & Source Code

* **GitHub Repository:** [https://github.com/01329582993/EBID](https://github.com/01329582993/EBID)
