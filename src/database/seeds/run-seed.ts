import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { seedAdmin } from './admin.seed';
import { seedTicketTypes } from './ticket-types.seed';

// ts-node n’injecte pas .env (contrairement à Nest). Charger explicitement la racine du projet.
loadEnv({ path: resolve(process.cwd(), '.env') });

async function runSeed() {
  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();

  if (!databaseUrl) {
    console.error(
      '❌ DATABASE_URL manquante : définissez DATABASE_URL dans .env (à la racine du projet), puis relancez le seed.',
    );
    process.exit(1);
  }

  let host = 'unknown';
  let database = 'unknown';
  try {
    const parsedUrl = new URL(databaseUrl);
    host = parsedUrl.hostname;
    database = parsedUrl.pathname.replace(/^\//, '') || 'unknown';
  } catch {
    console.warn('⚠️  DATABASE_URL invalide, impossible de parser host/database.');
  }

  console.log('✅ Using DATABASE_URL');
  console.log(`   Host: ${host}`);
  console.log(`   Database: ${database}`);
  console.log('');

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
    ssl:
      host.includes('railway.app') || host.includes('render.com')
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connected\n');

    await seedTicketTypes(dataSource);
    console.log('');

    await seedAdmin(dataSource);

    await dataSource.destroy();
    console.log('\n✅ Seed completed');
  } catch (error) {
    console.error('❌ Error running seed:', error);
    process.exit(1);
  }
}

runSeed();
