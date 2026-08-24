package com.ebid.auction;

import jakarta.persistence.LockModeType;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    @Cacheable(value = "activeAuctions")
    List<Auction> findByStatus(AuctionStatus status);
    List<Auction> findBySellerId(Long sellerId);

    @Query("SELECT a FROM Auction a WHERE a.status = :status AND a.endTime <= :now")
    List<Auction> findExpiredAuctions(@Param("status") AuctionStatus status, @Param("now") LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Auction a WHERE a.id = :id")
    Optional<Auction> findByIdForUpdate(@Param("id") Long id);
}
