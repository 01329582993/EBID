package com.ebid.auction;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BidRequestDto {
    private Long bidderId;
    private BigDecimal amount;
}
