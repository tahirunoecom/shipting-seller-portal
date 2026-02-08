-- ============================================
-- PAYOUT APPROVAL SYSTEM - Database Setup
-- ============================================

-- Step 1: Add index to wh_warehouse_user table (if not exists)
-- This is required for the foreign key constraint
CREATE INDEX IF NOT EXISTS idx_wh_account_id ON wh_warehouse_user(wh_account_id);

-- Step 2: Create payout_approval_requests table
CREATE TABLE IF NOT EXISTS payout_approval_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wh_account_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT NULL,
  rejection_reason TEXT NULL,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  stripe_payout_id BIGINT UNSIGNED NULL COMMENT 'Links to stripe_payouts.id when approved',
  processed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX idx_wh_account_id (wh_account_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_wh_status (wh_account_id, status),

  -- Foreign key (optional - uncomment if you want database-level enforcement)
  CONSTRAINT fk_payout_wh_account
    FOREIGN KEY (wh_account_id)
    REFERENCES wh_warehouse_user(wh_account_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores payout approval requests from sellers to admins';

-- Step 3: Verify table creation
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payout_approval_requests';

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert a test payout approval request
-- Replace 1016 with your actual test seller wh_account_id
INSERT INTO payout_approval_requests (
  wh_account_id,
  amount,
  notes,
  status,
  created_at,
  updated_at
) VALUES (
  1016,  -- Your test seller ID
  100.00,
  'Test payout request for development',
  'pending',
  NOW(),
  NOW()
);

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- View all pending requests with seller info
SELECT
  par.*,
  wu.locationname as store_name,
  wu.email as seller_email,
  wu.Shipper_earnings as current_balance
FROM payout_approval_requests par
LEFT JOIN wh_warehouse_user wu ON wu.wh_account_id = par.wh_account_id
WHERE par.status = 'pending'
ORDER BY par.created_at DESC;

-- Get approval request statistics
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM payout_approval_requests
GROUP BY status;

-- Get seller's request history
SELECT
  id,
  amount,
  status,
  notes,
  admin_notes,
  rejection_reason,
  created_at,
  processed_at
FROM payout_approval_requests
WHERE wh_account_id = 1016  -- Replace with actual seller ID
ORDER BY created_at DESC;

-- Find sellers with pending requests
SELECT
  wu.wh_account_id,
  wu.locationname as store_name,
  wu.email,
  COUNT(par.id) as pending_count,
  SUM(par.amount) as total_pending_amount,
  wu.Shipper_earnings as current_balance
FROM wh_warehouse_user wu
INNER JOIN payout_approval_requests par ON par.wh_account_id = wu.wh_account_id
WHERE par.status = 'pending'
GROUP BY wu.wh_account_id
ORDER BY total_pending_amount DESC;

-- ============================================
-- CLEANUP (if you need to start over)
-- ============================================

-- WARNING: This will delete all data!
-- Uncomment only if you want to reset the table

-- DROP TABLE IF EXISTS payout_approval_requests;

-- To delete only test data:
-- DELETE FROM payout_approval_requests WHERE notes LIKE '%test%' OR notes LIKE '%development%';
