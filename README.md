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

---

## 🚀 How to Run the Project Properly (Complete Guide)

### Option A: Standard One-Command Docker Run (Recommended)

1. **Start Docker Desktop:**
   Ensure Docker Desktop is launched and shows **"Engine running"** in the bottom left corner.

2. **Run Docker Compose:**
   Open a terminal in the root `EBID` project directory and run:
   ```bash
   docker compose up --build
   ```

3. **Access the App:**
   Open your browser to: **[http://localhost](http://localhost)**

---

### Option B: Frontend Developer Workflow (For Maliha — No Docker Needed)

If you are working on the React UI and want fast live-reloading (HMR) without compiling Java microservices or running Docker:

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Vite Development Server:**
   ```bash
   npm run dev
   ```

4. **Access Dev Frontend:**
   Open your browser at **[http://localhost:5173](http://localhost:5173)**.  
   > `vite.config.js` is already configured to automatically proxy `/api/auth`, `/api/auctions`, `/api/wallet`, and `/ws` to the backend services!

---

## 🎓 Troubleshooting Campus / University Wi-Fi (IUT Network Issues)

If you are on campus Wi-Fi (e.g., **IUT Wi-Fi / Eduroam**) and experience container build failures or sign-in errors, follow these solutions:

### ❌ Issue 1: `repo.maven.apache.org` or `registry.npmjs.org` Connection Timed Out
Campus firewalls often block or restrict raw DNS calls from Docker containers to external package repositories.

* **Solution 1 — Use Mobile Hotspot (Fastest):**  
  Connect your computer to a **Mobile Hotspot** or home Wi-Fi for the first `docker compose up --build` or `npm install`. Once packages are cached, you can switch back to campus Wi-Fi.

* **Solution 2 — Add Google DNS to Docker Desktop Settings:**  
  1. Open **Docker Desktop Settings** (⚙️ gear icon).  
  2. Select **Docker Engine** from the left menu.  
  3. Add `"dns": ["8.8.8.8", "1.1.1.1"]` to the JSON configuration:
     ```json
     {
       "builder": {
         "gc": {
           "defaultKeepStorage": "20GB",
           "enabled": true
         }
       },
       "dns": [
         "8.8.8.8",
         "1.1.1.1"
       ]
     }
     ```
  4. Click **Apply & Restart**.

---

### ❌ Issue 2: `failed to connect to docker API npipe:////./pipe/dockerDesktopLinuxEngine`
This error means **Docker Desktop is not currently running** on your laptop.

* **Solution:**
  1. Search for **Docker Desktop** in your Windows Start Menu and click to launch it.
  2. Wait ~1-2 minutes until the whale icon in your system tray stops animating and shows **Engine running**.
  3. Re-run `docker compose up --build`.

---

### ❌ Issue 3: "Cannot Sign In / Sign Up" on Frontend
If clicking Login or Sign Up returns an error or fails to respond:

* **Cause:** The `auth-service` microservice is not reachable or database connection failed.
* **Solution:**
  1. Ensure containers are running by typing: `docker ps`. You should see `ebid-auth-service` running on port `8081`.
  2. Check Auth Service logs:
     ```bash
     docker compose logs auth-service
     ```
  3. If using local `npm run dev` (Port 5173), ensure the backend Docker containers are running (`docker compose up -d`).

---

## 📡 API Reference & Endpoints

### 1. Auth Service (`/api/auth`)
| Method | Endpoint | Description | Sample Body |
|--------|----------|-------------|-------------|
| `POST` | `/auth/register` | Register new user | `{ "username": "maliha", "email": "maliha@ebid.com", "password": "password123", "role": "SELLER" }` |
| `POST` | `/auth/login` | Authenticate & get JWT | `{ "username": "maliha", "password": "password123" }` |
| `GET` | `/auth/validate` | Verify JWT token validity | Header: `Authorization: Bearer <token>` |

### 2. Wallet Service (`/api/wallet`)
| Method | Endpoint | Description | Sample Body |
|--------|----------|-------------|-------------|
| `GET` | `/wallet/{userId}` | Get balance & frozen funds | None |
| `POST` | `/wallet/deposit` | Add funds | `{ "userId": 1, "amount": 500.00 }` |
| `POST` | `/wallet/freeze` | Freeze funds for active bid | `{ "userId": 1, "amount": 150.00 }` |

### 3. Auction Service (`/api/auctions`)
| Method | Endpoint | Description | Sample Body |
|--------|----------|-------------|-------------|
| `GET` | `/auctions` | List active auctions | None |
| `POST` | `/auctions` | Create auction (Seller) | `{ "title": "Laptop", "startingPrice": 500, "sellerId": 1, "endTime": "2026-12-31T23:59:59" }` |
| `POST` | `/auctions/{id}/bid` | Place a bid (Bidder) | `{ "bidderId": 2, "amount": 550.00 }` |

---

## 📜 Source Code & Repository
* **GitHub Repository:** [https://github.com/01329582993/EBID](https://github.com/01329582993/EBID)
