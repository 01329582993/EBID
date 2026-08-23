package com.ebid.wallet;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {
    Optional<Wallet> findByUserId(Long userId);

    /**
     * Locks the wallet row for the duration of the enclosing @Transactional
     * method (SELECT ... FOR UPDATE). Prevents lost updates when the same
     * user's wallet is touched concurrently — e.g. bidding on two different
     * auctions from two browser tabs at the same instant, both of which
     * call /wallet/freeze on this same row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") Long userId);
}