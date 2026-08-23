package com.ebid.auction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    List<Auction> findByStatus(AuctionStatus status);
    List<Auction> findBySellerId(Long sellerId);

    /**
     * Locks the auction row for the duration of the enclosing @Transactional
     * method (SELECT ... FOR UPDATE at the DB level). Concurrent bid
     * placements on the SAME auction id will block here until the previous
     * transaction commits, so each one sees the true current bid instead of
     * a stale value read before another bid's write.
     *
     * Bids on DIFFERENT auctions are unaffected — this only serializes
     * writers competing for the same row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Auction a where a.id = :id")
    Optional<Auction> findByIdForUpdate(@Param("id") Long id);
}