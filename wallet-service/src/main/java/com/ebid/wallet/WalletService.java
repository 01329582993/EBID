package com.ebid.wallet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WalletService {

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

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

    @Transactional(readOnly = true)
    public Map<String, Object> getWalletDetails(Long userId) {
        Wallet wallet = getOrCreateWallet(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("userId", wallet.getUserId());
        response.put("balance", wallet.getBalance());
        response.put("frozenBalance", wallet.getFrozenBalance());
        response.put("availableBalance", wallet.getAvailableBalance());
        return response;
    }

    @Transactional
    public BigDecimal deposit(Long userId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Wallet wallet = walletRepository.findByUserIdWithLock(userId).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(userId);
            w.setBalance(BigDecimal.ZERO);
            w.setFrozenBalance(BigDecimal.ZERO);
            return walletRepository.save(w);
        });

        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);

        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(amount);
        tx.setType(TransactionType.DEPOSIT);
        tx.setDescription("Deposit of $" + amount);
        transactionRepository.save(tx);

        return wallet.getBalance();
    }

    @Transactional
    public BigDecimal freezeFunds(Long userId, BigDecimal amount, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Wallet wallet = walletRepository.findByUserIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

        BigDecimal available = wallet.getAvailableBalance();
        if (available.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient available balance");
        }

        wallet.setFrozenBalance(wallet.getFrozenBalance().add(amount));
        walletRepository.save(wallet);

        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(amount);
        tx.setType(TransactionType.FREEZE);
        tx.setDescription(description != null ? description : "Bid freeze");
        transactionRepository.save(tx);

        return wallet.getFrozenBalance();
    }

    @Transactional
    public void releaseFunds(Long userId, BigDecimal amount, String description) {
        Wallet wallet = walletRepository.findByUserIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

        BigDecimal currentFrozen = wallet.getFrozenBalance();
        BigDecimal actualRelease = amount.min(currentFrozen);

        if (actualRelease.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        wallet.setFrozenBalance(currentFrozen.subtract(actualRelease));
        walletRepository.save(wallet);

        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setAmount(actualRelease);
        tx.setType(TransactionType.RELEASE);
        tx.setDescription(description != null ? description : "Bid release");
        transactionRepository.save(tx);
    }

    @Transactional
    public void processPayout(Long fromUserId, Long toUserId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("Cannot payout to the same account");
        }

        Long firstLock = fromUserId < toUserId ? fromUserId : toUserId;
        Long secondLock = fromUserId < toUserId ? toUserId : fromUserId;

        walletRepository.findByUserIdWithLock(firstLock);
        walletRepository.findByUserIdWithLock(secondLock);

        Wallet buyerWallet = walletRepository.findByUserIdWithLock(fromUserId)
                .orElseThrow(() -> new IllegalArgumentException("Buyer wallet not found"));

        // Check total balance sufficiency
        if (buyerWallet.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient wallet balance for payout");
        }

        // Deduct from frozen balance if present, calculated via min() so frozen stays proportional
        BigDecimal frozenToDeduct = buyerWallet.getFrozenBalance().min(amount);
        buyerWallet.setFrozenBalance(buyerWallet.getFrozenBalance().subtract(frozenToDeduct));

        BigDecimal newBalance = buyerWallet.getBalance().subtract(amount);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Transaction rejected: Would result in negative balance");
        }

        buyerWallet.setBalance(newBalance);

        // Ensure available balance (Balance - FrozenBalance) never falls below 0
        if (buyerWallet.getAvailableBalance().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Insufficient available balance for payout");
        }

        walletRepository.save(buyerWallet);

        Wallet sellerWallet = walletRepository.findByUserIdWithLock(toUserId).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(toUserId);
            w.setBalance(BigDecimal.ZERO);
            w.setFrozenBalance(BigDecimal.ZERO);
            return walletRepository.save(w);
        });
        sellerWallet.setBalance(sellerWallet.getBalance().add(amount));
        walletRepository.save(sellerWallet);

        // Sender Transaction Record
        Transaction txFrom = new Transaction();
        txFrom.setUserId(fromUserId);
        txFrom.setAmount(amount.negate());
        txFrom.setType(TransactionType.PAYOUT);
        txFrom.setDescription("Auction payout to seller #" + toUserId);
        transactionRepository.save(txFrom);

        // Recipient Transaction Record
        Transaction txTo = new Transaction();
        txTo.setUserId(toUserId);
        txTo.setAmount(amount);
        txTo.setType(TransactionType.PAYOUT);
        txTo.setDescription("Auction earnings from buyer #" + fromUserId);
        transactionRepository.save(txTo);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getUserTransactions(Long userId) {
        return transactionRepository.findByUserIdOrderByIdDesc(userId);
    }
}