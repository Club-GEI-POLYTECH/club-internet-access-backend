import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { WiFiAccount, DurationType, BandwidthProfile } from '../../entities/wifi-account.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';
import * as bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'password123';

export async function seedDevData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const wifiAccountRepository = dataSource.getRepository(WiFiAccount);
  const paymentRepository = dataSource.getRepository(Payment);

  console.log('🌱 Seeding development data...\n');

  // 1. Créer des utilisateurs de test
  console.log('👥 Creating test users...');
  const users = await createTestUsers(userRepository);
  console.log(`✅ Created ${users.length} users\n`);

  // 2. Créer des comptes Wi-Fi de test
  console.log('📶 Creating test WiFi accounts...');
  const wifiAccounts = await createTestWiFiAccounts(wifiAccountRepository, users);
  console.log(`✅ Created ${wifiAccounts.length} WiFi accounts\n`);

  // 3. Créer des paiements de test
  console.log('💳 Creating test payments...');
  const payments = await createTestPayments(paymentRepository, users, wifiAccounts);
  console.log(`✅ Created ${payments.length} payments\n`);

  console.log('🎉 Development data seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - WiFi Accounts: ${wifiAccounts.length}`);
  console.log(`   - Payments: ${payments.length}`);
  console.log('\n🔑 Login credentials (password: password123):');
  console.log('   - Admin: admin@unikin.cd');
  console.log('   - Agent 1: agent1@unikin.cd');
  console.log('   - Agent 2: agent2@unikin.cd');
  console.log('   - Student 1: student1@student.unikin.cd');
  console.log('   - Student 2: student2@student.unikin.cd');
}

async function createTestUsers(userRepository: any) {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const users = [];

  // Admin (déjà créé par seedAdmin, on vérifie juste)
  let admin = await userRepository.findOne({ where: { email: 'admin@unikin.cd' } });
  if (!admin) {
    admin = userRepository.create({
      email: 'admin@unikin.cd',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'UNIKIN',
      role: UserRole.ADMIN,
      phone: '+243900000001',
      isActive: true,
    });
    admin = await userRepository.save(admin);
  }
  users.push(admin);

  // Agents
  const agents = [
    {
      email: 'agent1@unikin.cd',
      firstName: 'Jean',
      lastName: 'KABONGO',
      phone: '+243900000002',
    },
    {
      email: 'agent2@unikin.cd',
      firstName: 'Marie',
      lastName: 'MBALA',
      phone: '+243900000003',
    },
  ];

  for (const agentData of agents) {
    let agent = await userRepository.findOne({ where: { email: agentData.email } });
    if (!agent) {
      agent = userRepository.create({
        ...agentData,
        password: hashedPassword,
        role: UserRole.AGENT,
        isActive: true,
      });
      agent = await userRepository.save(agent);
      users.push(agent);
    } else {
      users.push(agent);
    }
  }

  // Étudiants
  const students = [
    {
      email: 'student1@student.unikin.cd',
      firstName: 'Koffi',
      lastName: 'KABONGO',
      phone: '+243900000010',
    },
    {
      email: 'student2@student.unikin.cd',
      firstName: 'Amina',
      lastName: 'MBALA',
      phone: '+243900000011',
    },
  ];

  for (const studentData of students) {
    let student = await userRepository.findOne({ where: { email: studentData.email } });
    if (!student) {
      student = userRepository.create({
        ...studentData,
        password: hashedPassword,
        role: UserRole.STUDENT,
        isActive: true,
      });
      student = await userRepository.save(student);
      users.push(student);
    } else {
      users.push(student);
    }
  }

  return users;
}

async function createTestWiFiAccounts(
  wifiAccountRepository: any,
  users: User[],
) {
  const admin = users.find((u) => u.role === UserRole.ADMIN);
  const agent1 = users.find((u) => u.email === 'agent1@unikin.cd');

  const accounts = [];

  // Compte actif 24h
  let account1 = await wifiAccountRepository.findOne({
    where: { username: 'etu1001' },
  });
  if (!account1) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    account1 = wifiAccountRepository.create({
      username: 'etu1001',
      password: 'P@ssw0rd1',
      duration: DurationType.HOURS_24,
      bandwidthProfile: BandwidthProfile.STANDARD_2MB,
      maxDevices: 1,
      expiresAt,
      isActive: true,
      isExpired: false,
      comment: 'Compte test 24h - Actif',
      createdById: agent1?.id || admin?.id,
    });
    account1 = await wifiAccountRepository.save(account1);
    accounts.push(account1);
  } else {
    accounts.push(account1);
  }

  // Compte actif 7 jours
  let account2 = await wifiAccountRepository.findOne({
    where: { username: 'etu1002' },
  });
  if (!account2) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    account2 = wifiAccountRepository.create({
      username: 'etu1002',
      password: 'P@ssw0rd2',
      duration: DurationType.DAYS_7,
      bandwidthProfile: BandwidthProfile.PREMIUM_5MB,
      maxDevices: 1,
      expiresAt,
      isActive: true,
      isExpired: false,
      comment: 'Compte test 7 jours - Actif',
      createdById: agent1?.id || admin?.id,
    });
    account2 = await wifiAccountRepository.save(account2);
    accounts.push(account2);
  } else {
    accounts.push(account2);
  }

  // Compte expiré
  let account3 = await wifiAccountRepository.findOne({
    where: { username: 'etu1003' },
  });
  if (!account3) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() - 1); // Expiré hier
    account3 = wifiAccountRepository.create({
      username: 'etu1003',
      password: 'P@ssw0rd3',
      duration: DurationType.HOURS_24,
      bandwidthProfile: BandwidthProfile.BASIC_1MB,
      maxDevices: 1,
      expiresAt,
      isActive: false,
      isExpired: true,
      comment: 'Compte test - Expiré',
      createdById: agent1?.id || admin?.id,
    });
    account3 = await wifiAccountRepository.save(account3);
    accounts.push(account3);
  } else {
    accounts.push(account3);
  }

  // Compte 30 jours
  let account4 = await wifiAccountRepository.findOne({
    where: { username: 'etu1004' },
  });
  if (!account4) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    account4 = wifiAccountRepository.create({
      username: 'etu1004',
      password: 'P@ssw0rd4',
      duration: DurationType.DAYS_30,
      bandwidthProfile: BandwidthProfile.PREMIUM_5MB,
      maxDevices: 2,
      expiresAt,
      isActive: true,
      isExpired: false,
      comment: 'Compte test 30 jours - Premium',
      createdById: agent1?.id || admin?.id,
    });
    account4 = await wifiAccountRepository.save(account4);
    accounts.push(account4);
  } else {
    accounts.push(account4);
  }

  // Compte 48h
  let account5 = await wifiAccountRepository.findOne({
    where: { username: 'etu1005' },
  });
  if (!account5) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    account5 = wifiAccountRepository.create({
      username: 'etu1005',
      password: 'P@ssw0rd5',
      duration: DurationType.HOURS_48,
      bandwidthProfile: BandwidthProfile.STANDARD_2MB,
      maxDevices: 1,
      expiresAt,
      isActive: true,
      isExpired: false,
      comment: 'Compte test 48h',
      createdById: agent1?.id || admin?.id,
    });
    account5 = await wifiAccountRepository.save(account5);
    accounts.push(account5);
  } else {
    accounts.push(account5);
  }

  return accounts;
}

async function createTestPayments(
  paymentRepository: any,
  users: User[],
  wifiAccounts: WiFiAccount[],
) {
  const admin = users.find((u) => u.role === UserRole.ADMIN);
  const agent1 = users.find((u) => u.email === 'agent1@unikin.cd');
  const account1 = wifiAccounts.find((a) => a.username === 'etu1001');
  const account2 = wifiAccounts.find((a) => a.username === 'etu1002');

  const payments = [];

  // Paiement complété avec compte Wi-Fi
  let payment1 = await paymentRepository.findOne({
    where: { transactionId: 'MTN001' },
  });
  if (!payment1) {
    payment1 = paymentRepository.create({
      amount: 1000,
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.MOBILE_MONEY,
      transactionId: 'MTN001',
      phoneNumber: '+243900000010',
      wifiAccountId: account1?.id,
      createdById: agent1?.id || admin?.id,
      notes: 'Paiement test Mobile Money - Complété',
    });
    payment1 = await paymentRepository.save(payment1);
    payments.push(payment1);
  } else {
    payments.push(payment1);
  }

  // Paiement complété
  let payment2 = await paymentRepository.findOne({
    where: { transactionId: 'MTN002' },
  });
  if (!payment2) {
    payment2 = paymentRepository.create({
      amount: 2000,
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.MOBILE_MONEY,
      transactionId: 'MTN002',
      phoneNumber: '+243900000011',
      wifiAccountId: account2?.id,
      createdById: agent1?.id || admin?.id,
      notes: 'Paiement test - 7 jours',
    });
    payment2 = await paymentRepository.save(payment2);
    payments.push(payment2);
  } else {
    payments.push(payment2);
  }

  // Paiement en attente
  let payment3 = await paymentRepository.findOne({
    where: { transactionId: 'MTN003' },
  });
  if (!payment3) {
    payment3 = paymentRepository.create({
      amount: 1500,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.MOBILE_MONEY,
      transactionId: 'MTN003',
      phoneNumber: '+243900000012',
      createdById: agent1?.id || admin?.id,
      notes: 'Paiement test - En attente',
    });
    payment3 = await paymentRepository.save(payment3);
    payments.push(payment3);
  } else {
    payments.push(payment3);
  }

  // Paiement cash
  let payment4 = await paymentRepository.findOne({
    where: { transactionId: 'CASH001' },
  });
  if (!payment4) {
    payment4 = paymentRepository.create({
      amount: 5000,
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.CASH,
      transactionId: 'CASH001',
      createdById: agent1?.id || admin?.id,
      notes: 'Paiement test - Espèces',
    });
    payment4 = await paymentRepository.save(payment4);
    payments.push(payment4);
  } else {
    payments.push(payment4);
  }

  // Paiement échoué
  let payment5 = await paymentRepository.findOne({
    where: { transactionId: 'MTN004' },
  });
  if (!payment5) {
    payment5 = paymentRepository.create({
      amount: 1000,
      status: PaymentStatus.FAILED,
      method: PaymentMethod.MOBILE_MONEY,
      transactionId: 'MTN004',
      phoneNumber: '+243900000013',
      createdById: agent1?.id || admin?.id,
      notes: 'Paiement test - Échoué',
    });
    payment5 = await paymentRepository.save(payment5);
    payments.push(payment5);
  } else {
    payments.push(payment5);
  }

  return payments;
}

