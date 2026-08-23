# Implementation Plan & Team Distribution — EBID Platform

This document presents the **Feature Audit** and **4-Person Engineering Team Work Distribution** for the EBID Online Auction & Marketplace platform.

---

## 🔍 Audit of Feature Implementation

| Feature Domain | Status | Target Upgrade |
|----------------|--------|----------------|
| **DTOs & Mappers** | **COMPLETED for Auth Service** ✅ | Strongly-typed DTOs (`RegisterRequest`, `LoginRequest`, `CreateAuctionDto`, `BidDto`, `WalletDto`) |
| **Input Validation** | **COMPLETED for Auth Service** ✅ | `jakarta.validation` (`@Valid`, `@NotBlank`, `@Email`, `@Size`, `@Min`, `@Future`) |
| **Global Exception Handling** | **COMPLETED for Auth Service** ✅ | `@RestControllerAdvice` returning structured `ApiResponse` & validation error maps |
| **Database Indexing** | **COMPLETED for Auth Service** ✅ | Composite DB Indexes (`@Index`) on high-frequency query columns |
| **ACID & Transactions** | Pending (Assigned to Zinnia) | `@Transactional(rollbackFor = Exception.class)` + Pessimistic Locking (`@Lock`) |
| **Advanced JPQL Queries** | Pending (Assigned to Alizah) | Custom JPQL `@Query` with JOINs, aggregates (`MAX`, `COUNT`, `SUM`), and statistics |
| **Caching & Performance** | Pending (Assigned to Alizah) | Redis Caching (`@Cacheable`, `@CacheEvict`) for high-throughput active auctions |
| **Frontend & Rate-Limiting** | Pending (Assigned to Maliha) | Token propagation, UI error boundaries, and Nginx DDOS rate limiting (`limit_req_zone`) |

---

## 👥 4-Person Team Task Distribution

### 👤 Member 1: Bello (Lead — Auth & Security) — [COMPLETED ✅]
- [x] Add `spring-boot-starter-validation` dependency to `auth-service/pom.xml`.
- [x] Refactor `AuthController` to use `RegisterRequest` and `LoginRequest` DTOs.
- [x] Add Bean Validation (`@Valid`, `@NotBlank`, `@Email`, `@Size`) to DTOs and Controller parameters.
- [x] Create Global Exception Handler (`GlobalExceptionHandler.java`) using `@RestControllerAdvice` for standard JSON validation error maps.
- [x] Add Database Indexing (`@Index`) on `username` and `email` columns in `User.java` entity.
- [x] Verify JWT authentication flow and commit code.

---

### 👤 Member 2: Zinnia (Lead — Wallet & ACID Transactions) — [COMPLETED ✅]
- [x] Refactor `WalletController` to use DTOs (`DepositRequestDto`, `FreezeRequestDto`, `ReleaseRequestDto`, `PayoutRequestDto`).
- [x] Annotate balance mutation methods (`deposit`, `freeze`, `release`, `payout`) with `@Transactional(rollbackFor = Exception.class)`.
- [x] Implement Pessimistic Locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) on `findByUserIdWithLock` in `WalletRepository`.
- [x] Add composite database indexing on `Wallet` (`userId`) and `Transaction` (`userId, createdAt DESC`).
- [x] Add `GlobalExceptionHandler` to wallet-service for consistent JSON error responses.
- [x] Add `spring-boot-starter-validation` dependency to `wallet-service/pom.xml`.
- [x] Deadlock prevention: ordered lock acquisition in `processPayout()` (bonus — beyond plan).

---

### 👤 Member 3: Alizah (Lead — Auction, JPQL & Caching) — [ASSIGNED / PENDING ⏳]
- [ ] Refactor `AuctionController` to use DTOs (`CreateAuctionDto`, `BidRequestDto`).
- [ ] Write custom JPQL aggregate & query methods in `AuctionRepository` and `BidRepository`:
  - `@Query("SELECT MAX(b.amount) FROM Bid b WHERE b.auctionId = :auctionId")`
  - `@Query("SELECT a FROM Auction a WHERE a.status = :status AND a.endTime <= :now")`
- [ ] Add composite database indexing on `auctions(status, endTime)` and `bids(auctionId, amount DESC)`.
- [ ] Add Redis container service to `docker-compose.yml` and apply Spring `@Cacheable`.

---

### 👤 Member 4: Maliha (Lead — Frontend, Gateway & Verification) — [COMPLETED ✅]
- [x] Update frontend API client (`api.js`, `authEvents.jsx`) for JWT header propagation and auth event listeners.
- [x] Enhance React UI error boundaries (`errorBoundary.jsx`, `apiError.jsx`) to handle standard `ErrorDetails` payload from `@RestControllerAdvice`.
- [x] Configure Nginx Gateway rate-limiting (`limit_req_zone`, `login_zone`, `bid_zone`, `limit_req_status 429`) for DDOS protection.
- [x] Perform end-to-end load & concurrency verification (`load-tests/concurrency-test.js`) testing simultaneous bids, race conditions, and escrow freeze consistency.

---

## 🛠️ Step-by-Step Execution Guide for Teammates

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Work on assigned service:**
   - Zinnia: `wallet-service/`
   - Alizah: `auction-service/`
   - Maliha: `frontend/` & `nginx/`

3. **Verify and Commit:**
   ```bash
   git add .
   git commit -m "feat(service): description of changes"
   git push origin main
   ```
