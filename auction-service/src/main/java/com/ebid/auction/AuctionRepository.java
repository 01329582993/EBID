package com.ebid.auction;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    @Cacheable(value = "activeAuctions")
    List<Auction> findByStatus(AuctionStatus status);
    List<Auction> findBySellerId(Long sellerId);

    @Query("SELECT a FROM Auction a WHERE a.status = :status AND a.endTime <= :now")
    List<Auction> findExpiredAuctions(@Param("status") AuctionStatus status, @Param("now") LocalDateTime now);
}
