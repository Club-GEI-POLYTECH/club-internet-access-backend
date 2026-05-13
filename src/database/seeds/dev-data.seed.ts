import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedDevData(dataSource: DataSource) {
  const devPassword = (process.env.SEED_DEV_PASSWORD ?? '').trim();
  if (!devPassword) {
    console.log(
      '⚠️  Seed dev ignoré : définissez SEED_DEV_PASSWORD dans votre .env pour créer 2 agents + 5 étudiants de test.',
    );
    return;
  }

  const userRepository = dataSource.getRepository(User);

  console.log('🌱 Seeding development users...\n');

  const hashedPassword = await bcrypt.hash(devPassword, 10);

  /** Deux agents de test. */
  const agents = [
    { email: 'agent1@unikin.cd', firstName: 'Agent', lastName: 'Test 1', phone: '+243900000002' },
    { email: 'agent2@unikin.cd', firstName: 'Agent', lastName: 'Test 2', phone: '+243900000003' },
  ];

  for (const a of agents) {
    const exists = await userRepository.findOne({ where: { email: a.email } });
    if (!exists) {
      await userRepository.save(
        userRepository.create({
          ...a,
          password: hashedPassword,
          role: UserRole.AGENT,
          isActive: true,
        }),
      );
      console.log(`✅ Agent créé: ${a.email}`);
    }
  }

  const students = [
    {
      email: 'student1@student.unikin.cd',
      firstName: 'Etudiant',
      lastName: 'Test 1',
      phone: '+243900000011',
    },
    {
      email: 'student2@student.unikin.cd',
      firstName: 'Etudiant',
      lastName: 'Test 2',
      phone: '+243900000012',
    },
    {
      email: 'student3@student.unikin.cd',
      firstName: 'Etudiant',
      lastName: 'Test 3',
      phone: '+243900000013',
    },
    {
      email: 'student4@student.unikin.cd',
      firstName: 'Etudiant',
      lastName: 'Test 4',
      phone: '+243900000014',
    },
    {
      email: 'student5@student.unikin.cd',
      firstName: 'Etudiant',
      lastName: 'Test 5',
      phone: '+243900000015',
    },
  ];

  for (const s of students) {
    const exists = await userRepository.findOne({ where: { email: s.email } });
    if (!exists) {
      await userRepository.save(
        userRepository.create({
          ...s,
          password: hashedPassword,
          role: UserRole.STUDENT,
          isActive: true,
        }),
      );
      console.log(`✅ Étudiant créé: ${s.email}`);
    }
  }

  console.log('\n🎉 Données de dev (utilisateurs) prêtes.');
  console.log('\n🔑 Mot de passe test : défini via SEED_DEV_PASSWORD dans .env');
}
