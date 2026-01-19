-- Script SQL pour insérer des données de test
-- ⚠️ ATTENTION: Ce script utilise un hash bcrypt fixe pour "password123"
-- Pour un hash unique et sécurisé, UTILISEZ LE SCRIPT TYPESCRIPT: npm run seed:admin
-- Le script TypeScript génère un hash unique à chaque exécution avec bcrypt

-- Hash bcrypt pour "password123" (utilisé pour tous les utilisateurs)
-- Ce hash est fixe et moins sécurisé que celui généré par le script TypeScript8q

-- 1. Utilisateurs
-- Admin (déjà créé par seedAdmin, on vérifie juste)
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt")
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'admin@unikin.cd',
  '$2b$10$rOzJ5J8q8q8q8q8q8q8q8u8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q',
  'Admin',
  'UNIKIN',
  '+243900000001',
  'admin',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@unikin.cd');

-- Agent 1
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt")
SELECT 
  '00000000-0000-0000-0000-000000000002',
  'agent1@unikin.cd',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Jean',
  'KABONGO',
  '+243900000002',
  'agent',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'agent1@unikin.cd');

-- Agent 2
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt")
SELECT 
  '00000000-0000-0000-0000-000000000003',
  'agent2@unikin.cd',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Marie',
  'MBALA',
  '+243900000003',
  'agent',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'agent2@unikin.cd');

-- Étudiant 1
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt")
SELECT 
  '00000000-0000-0000-0000-000000000004',
  'student1@student.unikin.cd',
  '$2b$10$rOzJ5J8q8q8q8q8q8q8q8u8q8q8q8q8q8q8q8q8q8q8q8q8q',
  'Koffi',
  'KABONGO',
  '+243900000010',
  'student',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student1@student.unikin.cd');

-- Étudiant 2
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt")
SELECT 
  '00000000-0000-0000-0000-000000000005',
  'student2@student.unikin.cd',
  '$2b$10$rOzJ5J8q8q8q8q8q8q8q8u8q8q8q8q8q8q8q8q8q8q8q8q8q',
  'Amina',
  'MBALA',
  '+243900000011',
  'student',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student2@student.unikin.cd');

-- 2. Comptes Wi-Fi
-- Compte actif 24h
INSERT INTO wifi_accounts (id, username, password, duration, "bandwidthProfile", "maxDevices", "expiresAt", "isActive", "isExpired", comment, "createdById", "createdAt", "updatedAt")
SELECT 
  '10000000-0000-0000-0000-000000000001',
  'etu1001',
  'P@ssw0rd1',
  '24h',
  '2mbps',
  1,
  NOW() + INTERVAL '24 hours',
  true,
  false,
  'Compte test 24h - Actif',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM wifi_accounts WHERE username = 'etu1001');

-- Compte actif 7 jours
INSERT INTO wifi_accounts (id, username, password, duration, "bandwidthProfile", "maxDevices", "expiresAt", "isActive", "isExpired", comment, "createdById", "createdAt", "updatedAt")
SELECT 
  '10000000-0000-0000-0000-000000000002',
  'etu1002',
  'P@ssw0rd2',
  '7d',
  '5mbps',
  1,
  NOW() + INTERVAL '7 days',
  true,
  false,
  'Compte test 7 jours - Actif',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM wifi_accounts WHERE username = 'etu1002');

-- Compte expiré
INSERT INTO wifi_accounts (id, username, password, duration, "bandwidthProfile", "maxDevices", "expiresAt", "isActive", "isExpired", comment, "createdById", "createdAt", "updatedAt")
SELECT 
  '10000000-0000-0000-0000-000000000003',
  'etu1003',
  'P@ssw0rd3',
  '24h',
  '1mbps',
  1,
  NOW() - INTERVAL '1 day',
  false,
  true,
  'Compte test - Expiré',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  NOW() - INTERVAL '2 days',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM wifi_accounts WHERE username = 'etu1003');

-- Compte 30 jours
INSERT INTO wifi_accounts (id, username, password, duration, "bandwidthProfile", "maxDevices", "expiresAt", "isActive", "isExpired", comment, "createdById", "createdAt", "updatedAt")
SELECT 
  '10000000-0000-0000-0000-000000000004',
  'etu1004',
  'P@ssw0rd4',
  '30d',
  '5mbps',
  2,
  NOW() + INTERVAL '30 days',
  true,
  false,
  'Compte test 30 jours - Premium',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM wifi_accounts WHERE username = 'etu1004');

-- Compte 48h
INSERT INTO wifi_accounts (id, username, password, duration, "bandwidthProfile", "maxDevices", "expiresAt", "isActive", "isExpired", comment, "createdById", "createdAt", "updatedAt")
SELECT 
  '10000000-0000-0000-0000-000000000005',
  'etu1005',
  'P@ssw0rd5',
  '48h',
  '2mbps',
  1,
  NOW() + INTERVAL '48 hours',
  true,
  false,
  'Compte test 48h',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM wifi_accounts WHERE username = 'etu1005');

-- 3. Paiements
-- Paiement complété avec compte Wi-Fi
INSERT INTO payments (id, amount, status, method, "transactionId", "phoneNumber", "wifiAccountId", "createdById", notes, "createdAt", "updatedAt")
SELECT 
  '20000000-0000-0000-0000-000000000001',
  1000,
  'completed',
  'mobile_money',
  'MTN001',
  '+243900000010',
  (SELECT id FROM wifi_accounts WHERE username = 'etu1001' LIMIT 1),
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  'Paiement test Mobile Money - Complété',
  NOW() - INTERVAL '2 days',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE "transactionId" = 'MTN001');

-- Paiement complété
INSERT INTO payments (id, amount, status, method, "transactionId", "phoneNumber", "wifiAccountId", "createdById", notes, "createdAt", "updatedAt")
SELECT 
  '20000000-0000-0000-0000-000000000002',
  2000,
  'completed',
  'mobile_money',
  'MTN002',
  '+243900000011',
  (SELECT id FROM wifi_accounts WHERE username = 'etu1002' LIMIT 1),
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  'Paiement test - 7 jours',
  NOW() - INTERVAL '1 day',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE "transactionId" = 'MTN002');

-- Paiement en attente
INSERT INTO payments (id, amount, status, method, "transactionId", "phoneNumber", "createdById", notes, "createdAt", "updatedAt")
SELECT 
  '20000000-0000-0000-0000-000000000003',
  1500,
  'pending',
  'mobile_money',
  'MTN003',
  '+243900000012',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  'Paiement test - En attente',
  NOW() - INTERVAL '1 hour',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE "transactionId" = 'MTN003');

-- Paiement cash
INSERT INTO payments (id, amount, status, method, "transactionId", "createdById", notes, "createdAt", "updatedAt")
SELECT 
  '20000000-0000-0000-0000-000000000004',
  5000,
  'completed',
  'cash',
  'CASH001',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  'Paiement test - Espèces',
  NOW() - INTERVAL '3 days',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE "transactionId" = 'CASH001');

-- Paiement échoué
INSERT INTO payments (id, amount, status, method, "transactionId", "phoneNumber", "createdById", notes, "createdAt", "updatedAt")
SELECT 
  '20000000-0000-0000-0000-000000000005',
  1000,
  'failed',
  'mobile_money',
  'MTN004',
  '+243900000013',
  (SELECT id FROM users WHERE email = 'agent1@unikin.cd' LIMIT 1),
  'Paiement test - Échoué',
  NOW() - INTERVAL '5 hours',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE "transactionId" = 'MTN004');

