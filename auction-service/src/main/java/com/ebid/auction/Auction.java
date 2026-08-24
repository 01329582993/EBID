package com.ebid.auction;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "auctions", indexes = {
    @Index(name = "idx_auctions_status_endtime", columnList = "status, end_time")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Auction implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Long sellerId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal startingPrice;

    @Column(precision = 15, scale = 2)
    private BigDecimal currentBid;

    @Column
    private Long highestBidderId;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuctionStatus status = AuctionStatus.ACTIVE;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column
    private String category;
}
