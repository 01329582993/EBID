package com.ebid.wallet;

import com.ebid.wallet.dto.DepositRequestDto;
import com.ebid.wallet.dto.FreezeRequestDto;
import com.ebid.wallet.dto.PayoutRequestDto;
import com.ebid.wallet.dto.ReleaseRequestDto;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/wallet", "/wallets"})
public class WalletController {

    @Autowired
    private WalletService walletService;

    // ─── Health check ────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "Wallet Service"));
    }

    // ─── GET wallet balance ───────────────────────────────────────────────────
    @GetMapping("/{userId}")
    public ResponseEntity<?> getWallet(@PathVariable Long userId) {
        try {
            Map<String, Object> details = walletService.getWalletDetails(userId);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── DEPOSIT ──────────────────────────────────────────────────────────────
    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(@Valid @RequestBody DepositRequestDto dto) {
        try {
            BigDecimal newBalance = walletService.deposit(dto.getUserId(), dto.getAmount());
            return ResponseEntity.ok(Map.of(
                    "message", "Deposited successfully",
                    "newBalance", newBalance
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── FREEZE (bid lock) ────────────────────────────────────────────────────
    @PostMapping("/freeze")
    public ResponseEntity<?> freeze(@Valid @RequestBody FreezeRequestDto dto) {
        try {
            BigDecimal frozen = walletService.freezeFunds(dto.getUserId(), dto.getAmount(), dto.getDescription());
            return ResponseEntity.ok(Map.of(
                    "message", "Funds frozen",
                    "frozenBalance", frozen
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── RELEASE (unfreeze) ───────────────────────────────────────────────────
    @PostMapping("/release")
    public ResponseEntity<?> release(@Valid @RequestBody ReleaseRequestDto dto) {
        try {
            walletService.releaseFunds(dto.getUserId(), dto.getAmount(), dto.getDescription());
            return ResponseEntity.ok(Map.of("message", "Funds released"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── PAYOUT (buyer → seller after auction win) ────────────────────────────
    @PostMapping("/payout")
    public ResponseEntity<?> payout(@Valid @RequestBody PayoutRequestDto dto) {
        try {
            walletService.processPayout(dto.getFromUserId(), dto.getToUserId(), dto.getAmount());
            return ResponseEntity.ok(Map.of("message", "Payout completed"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ─── TRANSACTION HISTORY ──────────────────────────────────────────────────
    @GetMapping("/{userId}/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@PathVariable Long userId) {
        return ResponseEntity.ok(walletService.getUserTransactions(userId));
    }
}