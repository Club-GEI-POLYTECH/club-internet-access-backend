import { DataSource } from 'typeorm';
import { seedAdmin } from './admin.seed';
import { seedDevData } from './dev-data.seed';

async function runSeed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'internet_access',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connected\n');

    // Seed admin user
    await seedAdmin(dataSource);

    // Seed development data if NODE_ENV is development
    if (process.env.NODE_ENV !== 'production') {
      console.log('');
      await seedDevData(dataSource);
    }

    await dataSource.destroy();
    console.log('\n✅ Seed completed');
  } catch (error) {
    console.error('❌ Error running seed:', error);
    process.exit(1);
  }
}

runSeed();

