package com.ebid.auction;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import org.springframework.cache.annotation.CacheEvict;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/auctions")
public class AuctionController {

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Value("${wallet.service.url}")
    private String walletServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // ─── List all active auctions ───────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Auction>> getAllActive() {
        return ResponseEntity.ok(auctionRepository.findByStatus(AuctionStatus.ACTIVE));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Auction>> getAll() {
        return ResponseEntity.ok(auctionRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAuction(@PathVariable Long id) {
        return auctionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<Auction>> getBySeller(@PathVariable Long sellerId) {
        return ResponseEntity.ok(auctionRepository.findBySellerId(sellerId));
    }

    // ─── Create a new auction ────────────────────────────────────────────────────
    @PostMapping
    @CacheEvict(value = "activeAuctions", allEntries = true)
    public ResponseEntity<?> createAuction(@RequestBody CreateAuctionDto dto) {
        Auction auction = new Auction();
        auction.setTitle(dto.getTitle());
        auction.setDescription(dto.getDescription() != null ? dto.getDescription() : "");
        auction.setSellerId(dto.getSellerId());
        auction.setStartingPrice(dto.getStartingPrice());
        auction.setCurrentBid(auction.getStartingPrice());
        auction.setStartTime(LocalDateTime.now());
        auction.setEndTime(dto.getEndTime());
        auction.setStatus(AuctionStatus.ACTIVE);
        auction.setCategory(dto.getCategory() != null ? dto.getCategory() : "General");
        auction.setImageUrl(dto.getImageUrl());

        return ResponseEntity.status(HttpStatus.CREATED).body(auctionRepository.save(auction));
    }

    // ─── Place a bid ─────────────────────────────────────────────────────────────
    @PostMapping("/{id}/bid")
    @CacheEvict(value = "activeAuctions", allEntries = true)
    @org.springframework.transaction.annotation.Transactional(rollbackFor = Exception.class)
    public ResponseEntity<?> placeBid(@PathVariable Long id, @RequestBody BidRequestDto dto) {
        Optional<Auction> optAuction = auctionRepository.findByIdForUpdate(id);
        if (optAuction.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Auction auction = optAuction.get();

        if (auction.getStatus() != AuctionStatus.ACTIVE) {
            return ResponseEntity.badRequest().body(Map.of("error", "Auction is not active"));
        }
        if (LocalDateTime.now().isAfter(auction.getEndTime())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Auction has ended"));
        }

        Long bidderId = dto.getBidderId();
        BigDecimal bidAmount = dto.getAmount();

        if (bidderId.equals(auction.getSellerId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Seller cannot bid on own auction"));
        }
        BigDecimal maxBid = bidRepository.findMaxBidAmount(id);
        BigDecimal currentBid = maxBid != null ? maxBid : auction.getStartingPrice();
        if (bidAmount.compareTo(currentBid) <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Bid must be higher than current bid of $" + currentBid));
        }

        // Freeze funds for new bidder via wallet-service
        try {
            Map<String, Object> freezeRequest = new HashMap<>();
            freezeRequest.put("userId", bidderId);
            freezeRequest.put("amount", bidAmount);
            freezeRequest.put("description", "Bid freeze for auction #" + id);
            restTemplate.postForObject(walletServiceUrl + "/wallet/freeze", freezeRequest, Map.class);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(Map.of("error", "Insufficient wallet balance to place bid: " + e.getMessage()));
        }

        // Release previous highest bidder's funds
        Long prevBidderId = auction.getHighestBidderId();
        BigDecimal prevBid = auction.getCurrentBid();
        if (prevBidderId != null && !prevBidderId.equals(bidderId)) {
            try {
                Map<String, Object> releaseRequest = new HashMap<>();
                releaseRequest.put("userId", prevBidderId);
                releaseRequest.put("amount", prevBid);
                releaseRequest.put("description", "Bid release — outbid on auction #" + id);
                restTemplate.postForObject(walletServiceUrl + "/wallet/release", releaseRequest, Map.class);
            } catch (Exception e) {
                // log but continue — funds will be reconciled
            }
        }

        // Update auction
        auction.setCurrentBid(bidAmount);
        auction.setHighestBidderId(bidderId);
        auctionRepository.save(auction);

        // Record bid history
        Bid bid = new Bid();
        bid.setAuctionId(id);
        bid.setBidderId(bidderId);
        bid.setAmount(bidAmount);
        bid.setPlacedAt(LocalDateTime.now());
        bidRepository.save(bid);

        // Broadcast via WebSocket
        Map<String, Object> update = new HashMap<>();
        update.put("auctionId", id);
        update.put("currentBid", bidAmount);
        update.put("bidderId", bidderId);
        update.put("timestamp", LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/auction/" + id, update);

        return ResponseEntity.ok(Map.of(
                "message", "Bid placed successfully",
                "auctionId", id,
                "currentBid", bidAmount));
    }

    @GetMapping("/{id}/bids")
    public ResponseEntity<List<Bid>> getBidHistory(@PathVariable Long id) {
        return ResponseEntity.ok(bidRepository.findByAuctionIdOrderByAmountDesc(id));
    }

    // ─── Scheduled: close expired auctions and trigger payout ───────────────────
    @Scheduled(fixedDelay = 10000) // every 10 seconds
    @CacheEvict(value = "activeAuctions", allEntries = true)
    public void closeExpiredAuctions() {
        List<Auction> expiredAuctions = auctionRepository.findExpiredAuctions(AuctionStatus.ACTIVE, LocalDateTime.now());
        for (Auction auction : expiredAuctions) {
            auction.setStatus(AuctionStatus.ENDED);
            auctionRepository.save(auction);

            // If there was a winner, trigger payout
            if (auction.getHighestBidderId() != null) {
                try {
                    Map<String, Object> payoutRequest = new HashMap<>();
                    payoutRequest.put("fromUserId", auction.getHighestBidderId());
                    payoutRequest.put("toUserId", auction.getSellerId());
                    payoutRequest.put("amount", auction.getCurrentBid());
                    restTemplate.postForObject(walletServiceUrl + "/wallet/payout", payoutRequest, Map.class);
                } catch (Exception e) {
                    // log payout failure
                }
            }

            // Broadcast auction ended
            Map<String, Object> endUpdate = new HashMap<>();
            endUpdate.put("auctionId", auction.getId());
            endUpdate.put("status", "ENDED");
            endUpdate.put("winnerId", auction.getHighestBidderId());
            endUpdate.put("finalPrice", auction.getCurrentBid());
            messagingTemplate.convertAndSend("/topic/auction/" + auction.getId(), endUpdate);
        }
    }
}
