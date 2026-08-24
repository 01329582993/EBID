package com.ebid.auction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuctionIdOrderByAmountDesc(Long auctionId);
    List<Bid> findByBidderIdOrderByPlacedAtDesc(Long bidderId);

    @Query("SELECT MAX(b.amount) FROM Bid b WHERE b.auctionId = :auctionId")
    BigDecimal findMaxBidAmount(@Param("auctionId") Long auctionId);
}
