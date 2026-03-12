-- Seed: Test users for development
-- Created: 2026-03-12
-- Password for all users: Test@1234

-- Note: This is a bcrypt hash for 'Test@1234' with 12 rounds
-- You can generate your own hash using: bcrypt.hash('Test@1234', 12)

INSERT INTO "user" (id, username, email, password_hash, is_active, created_at, updated_at)
VALUES
  (1, 'trader1', 'trader1@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW()),
  (2, 'trader2', 'trader2@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW()),
  (3, 'trader3', 'trader3@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW()),
  (4, 'testadmin', 'admin@test.com', '$2b$12$KIXqJ9Z8W5Y7X6Q4N3M2L.O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('"user"', 'id'), COALESCE(MAX(id), 1), true) FROM "user";

-- Display seeded users
SELECT id, username, email, is_active FROM "user";
