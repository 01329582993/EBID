package com.ebid.wallet.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PayoutRequestDto {

    @NotNull(message = "fromUserId is required")
    private Long fromUserId;

    @NotNull(message = "toUserId is required")
    private Long toUserId;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be at least $0.01")
    private BigDecimal amount;

    // Getters & Setters
    public Long getFromUserId() { return fromUserId; }
    public void setFromUserId(Long fromUserId) { this.fromUserId = fromUserId; }

    public Long getToUserId() { return toUserId; }
    public void setToUserId(Long toUserId) { this.toUserId = toUserId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
