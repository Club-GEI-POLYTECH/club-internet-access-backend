import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * Crée l’administrateur initial si absent.
 * Identifiants : variables d’environnement ADMIN_SEED_EMAIL et ADMIN_SEED_PASSWORD (fichier .env).
 */
export async function seedAdmin(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? '').trim();
  const adminPassword = (process.env.ADMIN_SEED_PASSWORD ?? '').trim();

  if (!adminEmail || !adminPassword) {
    console.log(
      '⚠️  Seed admin ignoré : définissez ADMIN_SEED_EMAIL et ADMIN_SEED_PASSWORD dans votre .env',
    );
    return;
  }

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
    firstName: 'Admin',
    lastName: 'UNIKIN',
    role: UserRole.ADMIN,
    isActive: true,
  });

  await userRepository.save(admin);
  console.log('✅ Admin user created successfully');
  console.log(`   Email: ${adminEmail}`);
  console.log('   ⚠️  Changez le mot de passe après la première connexion.');
}
