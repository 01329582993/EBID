package com.ebid.auction;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAuctionDto {
    private String title;
    private String description;
    private Long sellerId;
    private BigDecimal startingPrice;
    private LocalDateTime endTime;
    private String category;
    private String imageUrl;
}
