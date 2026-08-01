package com.ebid.auction;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuctionIdOrderByAmountDesc(Long auctionId);
    List<Bid> findByBidderIdOrderByPlacedAtDesc(Long bidderId);
}
