import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

const DEFAULT_ADMIN_EMAIL = 'president@clubgei-polytech.org';
const DEFAULT_ADMIN_PASSWORD = 'ClubGEI2026++';

/**
 * Crée l’administrateur initial si absent.
 * Identifiants : `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` dans `.env`, sinon valeurs par défaut club.
 */
export async function seedAdmin(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? '').trim() || DEFAULT_ADMIN_EMAIL;
  const adminPassword = (process.env.ADMIN_SEED_PASSWORD ?? '').trim() || DEFAULT_ADMIN_PASSWORD;

  const existingAdmin = await userRepository.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = userRepository.create({
    email: adminEmail,
    password: hashedPassword,
    firstName: 'Président',
    lastName: 'Club GEI',
    role: UserRole.ADMIN,
    isActive: true,
  });

  await userRepository.save(admin);
  console.log('✅ Admin user created successfully');
  console.log(`   Email: ${adminEmail}`);
}
