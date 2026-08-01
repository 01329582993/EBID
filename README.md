# ⚡ EBID — Live Auction & Marketplace Platform

A full-stack **microservices** semester project for the Web Architecture course.

## 🏗️ Architecture

| Service | Tech | Port |
|---------|------|------|
| API Gateway | Nginx | `80` |
| Auth Service | Spring Boot + JWT | `8081` |
| Auction Service | Spring Boot + WebSocket | `8082` |
| Wallet Service | Spring Boot | `8083` |
| Frontend | React + Vite | `5173` (dev) |
| Database | PostgreSQL | `5432` |

```
React (Vite) → Nginx Gateway → Auth Service   → auth_db
                             → Auction Service → auction_db
                             → Wallet Service  → wallet_db
```

## 🚀 Quick Start (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Node.js 20+](https://nodejs.org/) (for local frontend dev)

### Run all services
```bash
docker-compose up --build
```

Then open **http://localhost** in your browser.

## 🔧 Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```
> Requires the backend services running (via docker-compose).

## 📡 API Endpoints

### Auth Service (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/validate` | Validate JWT token |

### Auction Service (`/api/auctions`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auctions` | List active auctions |
| GET | `/auctions/{id}` | Get auction details |
| POST | `/auctions` | Create auction (Seller) |
| POST | `/auctions/{id}/bid` | Place a bid (Bidder) |
| GET | `/auctions/{id}/bids` | Bid history |

### Wallet Service (`/api/wallet`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet/{userId}` | Get wallet balance |
| POST | `/wallet/deposit` | Deposit funds |
| GET | `/wallet/{userId}/transactions` | Transaction history |

### WebSocket
Connect to `ws://localhost/ws` and subscribe to `/topic/auction/{id}` for real-time bid updates.

## 👥 Team

EBID Project — Web Architecture Course

## 📋 Features

- 🔐 JWT Authentication with Role-Based Access (Bidder / Seller / Admin)
- 🏷️ Live auction listing with countdown timers
- 🔨 Real-time bidding via WebSocket (STOMP)
- 💰 Integrated digital wallet with fund freezing
- 🐳 Full Docker microservices deployment
- 📱 Responsive dark-mode UI
