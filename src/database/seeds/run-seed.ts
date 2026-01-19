import { DataSource } from 'typeorm';
import { seedAdmin } from './admin.seed';
import { seedDevData } from './dev-data.seed';

async function runSeed() {
  // Priorité 1 : Variables PG* (Railway)
  // Priorité 2 : Variables DB_* (local/Docker)
  const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);
  const username = process.env.PGUSER || process.env.DB_USERNAME || process.env.DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'password';
  const database = process.env.PGDATABASE || process.env.DB_DATABASE || process.env.DB_NAME || 'internet_access';

  if (process.env.PGHOST) {
    console.log('✅ Using PG* variables (Railway nomenclature)');
  } else {
    console.log('⚠️  Using DB_* variables (local/Docker)');
  }
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   Database: ${database}`);
  console.log(`   User: ${username}\n`);

  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
    // SSL pour Railway
    ssl: host.includes('railway.app') || host.includes('render.com')
      ? { rejectUnauthorized: false }
      : false,
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

