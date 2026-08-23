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
@RequestMapping({"/wallet", "/wallets"})
public class WalletController {

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    // Root status check to prevent 404s when testing in browser
    @GetMapping
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "Wallet Service"));
    }

    @Transactional
    public Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
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

    @PostMapping("/deposit")
    @Transactional
    public ResponseEntity<?> deposit(@RequestBody Map<String, Object> body) {
        try {
            Long userId = Long.valueOf(body.get("userId").toString());
            BigDecimal amount = new BigDecimal(body.get("amount").toString());

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
            }

            Wallet wallet = getOrCreateWallet(userId);
            wallet.setBalance(wallet.getBalance().add(amount));
            walletRepository.save(wallet);

            Transaction tx = new Transaction();
            tx.setUserId(userId);
            tx.setAmount(amount);
            tx.setType(TransactionType.DEPOSIT);
            tx.setDescription("Deposit of $" + amount);
            transactionRepository.save(tx);

            return ResponseEntity.ok(Map.of("message", "Deposited successfully", "newBalance", wallet.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/freeze")
    @Transactional
    public ResponseEntity<?> freeze(@RequestBody Map<String, Object> body) {
        try {
            Long userId = Long.valueOf(body.get("userId").toString());
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            String description = body.getOrDefault("description", "Bid freeze").toString();

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
            }

            Wallet wallet = getOrCreateWallet(userId);
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
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/release")
    @Transactional
    public ResponseEntity<?> release(@RequestBody Map<String, Object> body) {
        try {
            Long userId = Long.valueOf(body.get("userId").toString());
            BigDecimal amount = new BigDecimal(body.get("amount").toString());
            String description = body.getOrDefault("description", "Bid release").toString();

            Wallet wallet = walletRepository.findByUserId(userId).orElse(null);

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
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/payout")
    @Transactional
    public ResponseEntity<?> payout(@RequestBody Map<String, Object> body) {
        try {
            Long fromUserId = Long.valueOf(body.get("fromUserId").toString());
            Long toUserId = Long.valueOf(body.get("toUserId").toString());
            BigDecimal amount = new BigDecimal(body.get("amount").toString());

            Wallet fromWallet = walletRepository.findByUserId(fromUserId).orElse(null);
            if (fromWallet == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Bidder wallet not found"));
            }

            // Deduct from buyer's balance and frozen balance
            fromWallet.setFrozenBalance(fromWallet.getFrozenBalance().subtract(amount));
            fromWallet.setBalance(fromWallet.getBalance().subtract(amount));
            if (fromWallet.getFrozenBalance().compareTo(BigDecimal.ZERO) < 0) {
                fromWallet.setFrozenBalance(BigDecimal.ZERO);
            }
            walletRepository.save(fromWallet);

            // Credit to seller
            Wallet toWallet = getOrCreateWallet(toUserId);
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
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@PathVariable Long userId) {
        return ResponseEntity.ok(transactionRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }
}