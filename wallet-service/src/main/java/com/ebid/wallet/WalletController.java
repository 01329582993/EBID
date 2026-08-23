package com.ebid.wallet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/wallet")
public class WalletController {

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    // Used by the read-only GET endpoint — no lock needed, a stale-by-a-few-ms
    // read of your own balance is harmless and shouldn't block other writers.
    private Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(userId);
            w.setBalance(BigDecimal.ZERO);
            w.setFrozenBalance(BigDecimal.ZERO);
            return walletRepository.save(w);
        });
    }

    // Used by every write endpoint below (deposit/freeze/release/payout) so
    // the read-modify-write on balance/frozenBalance is safe under
    // concurrent requests for the same user.
    private Wallet getOrCreateWalletForUpdate(Long userId) {
        return walletRepository.findByUserIdForUpdate(userId).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(userId);
            w.setBalance(BigDecimal.ZERO);
            w.setFrozenBalance(BigDecimal.ZERO);
            return walletRepository.save(w);
        });
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getWallet(@PathVariable Long userId) {
        Wallet wallet = getOrCreateWallet(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("userId", wallet.getUserId());
        response.put("balance", wallet.getBalance());
        response.put("frozenBalance", wallet.getFrozenBalance());
        response.put("availableBalance", wallet.getBalance().subtract(wallet.getFrozenBalance()));
        return ResponseEntity.ok(response);
    }

    @Transactional
    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
        }

        Wallet wallet = getOrCreateWalletForUpdate(userId);
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);

        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(amount);
        tx.setType(TransactionType.DEPOSIT);
        tx.setDescription("Deposit of $" + amount);
        transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of("message", "Deposited successfully", "newBalance", wallet.getBalance()));
    }

    @Transactional
    @PostMapping("/freeze")
    public ResponseEntity<?> freeze(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String description = body.getOrDefault("description", "Bid freeze").toString();

        Wallet wallet = getOrCreateWalletForUpdate(userId);
        BigDecimal available = wallet.getBalance().subtract(wallet.getFrozenBalance());

        if (available.compareTo(amount) < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Insufficient available balance", "available", available));
        }

        wallet.setFrozenBalance(wallet.getFrozenBalance().add(amount));
        walletRepository.save(wallet);

        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(amount);
        tx.setType(TransactionType.FREEZE);
        tx.setDescription(description);
        transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of("message", "Funds frozen", "frozenBalance", wallet.getFrozenBalance()));
    }

    @Transactional
    @PostMapping("/release")
    public ResponseEntity<?> release(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String description = body.getOrDefault("description", "Bid release").toString();

        Wallet wallet = walletRepository.findByUserIdForUpdate(userId).orElse(null);

        if (wallet == null) {
            return ResponseEntity.notFound().build();
        }

        BigDecimal newFrozen = wallet.getFrozenBalance().subtract(amount);
        if (newFrozen.compareTo(BigDecimal.ZERO) < 0) newFrozen = BigDecimal.ZERO;
        wallet.setFrozenBalance(newFrozen);
        walletRepository.save(wallet);

        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(amount);
        tx.setType(TransactionType.RELEASE);
        tx.setDescription(description);
        transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of("message", "Funds released"));
    }

    @Transactional
    @PostMapping("/payout")
    public ResponseEntity<?> payout(@RequestBody Map<String, Object> body) {
        Long fromUserId = Long.valueOf(body.get("fromUserId").toString());
        Long toUserId = Long.valueOf(body.get("toUserId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());

        // Lock both wallets in a fixed order (by userId) rather than
        // "from then to" — if two payouts ever ran concurrently involving
        // the same pair of users in opposite directions, locking in
        // request order could deadlock (A waits for B while B waits for A).
        // Always locking the lower userId first makes that impossible.
        Long firstId = fromUserId < toUserId ? fromUserId : toUserId;
        Long secondId = fromUserId < toUserId ? toUserId : fromUserId;

        Wallet firstWallet = walletRepository.findByUserIdForUpdate(firstId).orElse(null);
        if (firstId.equals(fromUserId) && firstWallet == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bidder wallet not found"));
        }
        Wallet secondWallet = secondId.equals(toUserId)
                ? getOrCreateWalletForUpdate(secondId)
                : walletRepository.findByUserIdForUpdate(secondId).orElse(null);
        if (secondId.equals(fromUserId) && secondWallet == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bidder wallet not found"));
        }

        Wallet fromWallet = firstId.equals(fromUserId) ? firstWallet : secondWallet;
        Wallet toWallet = firstId.equals(toUserId) ? firstWallet : secondWallet;

        // Deduct from buyer's balance and frozen balance
        fromWallet.setFrozenBalance(fromWallet.getFrozenBalance().subtract(amount));
        fromWallet.setBalance(fromWallet.getBalance().subtract(amount));
        if (fromWallet.getFrozenBalance().compareTo(BigDecimal.ZERO) < 0) {
            fromWallet.setFrozenBalance(BigDecimal.ZERO);
        }
        walletRepository.save(fromWallet);

        // Credit to seller
        toWallet.setBalance(toWallet.getBalance().add(amount));
        walletRepository.save(toWallet);

        // Log buyer debit
        Transaction txFrom = new Transaction();
        txFrom.setUserId(fromUserId);
        txFrom.setAmount(amount.negate());
        txFrom.setType(TransactionType.PAYOUT);
        txFrom.setDescription("Auction payout to seller #" + toUserId);
        transactionRepository.save(txFrom);

        // Log seller credit
        Transaction txTo = new Transaction();
        txTo.setUserId(toUserId);
        txTo.setAmount(amount);
        txTo.setType(TransactionType.PAYOUT);
        txTo.setDescription("Auction earnings from buyer #" + fromUserId);
        transactionRepository.save(txTo);

        return ResponseEntity.ok(Map.of("message", "Payout completed"));
    }

    @GetMapping("/{userId}/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@PathVariable Long userId) {
        return ResponseEntity.ok(transactionRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }
}