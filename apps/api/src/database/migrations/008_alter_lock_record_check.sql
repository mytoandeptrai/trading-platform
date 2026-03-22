-- Allow lock_amount >= 0 so that fully consumed locks can be stored as 0 (status UNLOCKED).
ALTER TABLE lock_record DROP CONSTRAINT IF EXISTS check_lock_amount;
ALTER TABLE lock_record ADD CONSTRAINT check_lock_amount CHECK (lock_amount >= 0);
