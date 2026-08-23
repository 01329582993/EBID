package com.ebid.wallet;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByIdDesc(Long userId);

    List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);

}