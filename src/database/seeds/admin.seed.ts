import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const adminEmail = 'admin@unikin.cd';
  const adminPassword = 'admin123'; // Change this in production!

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
  console.log(`   Password: ${adminPassword}`);
  console.log('   ⚠️  Please change the password after first login!');
}

