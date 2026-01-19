const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Créer le dossier de destination
const distMigrationsDir = path.join(__dirname, '../dist/migrations');
console.log(`📁 Creating migrations directory: ${distMigrationsDir}`);

// S'assurer que dist/ existe
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`✅ Created dist directory`);
}

// Créer le dossier migrations avec gestion d'erreur
try {
  if (!fs.existsSync(distMigrationsDir)) {
    fs.mkdirSync(distMigrationsDir, { recursive: true, mode: 0o755 });
    console.log(`✅ Created migrations directory`);
  } else {
    console.log(`✅ Migrations directory already exists`);
  }
} catch (error) {
  if (error.code === 'EACCES') {
    console.error(`❌ Permission denied: Cannot create ${distMigrationsDir}`);
    console.error(`   Please run: sudo chown -R $USER:$USER dist/`);
    console.error(`   Or fix permissions on dist/ directory`);
    process.exit(1);
  }
  throw error;
}

// Trouver tous les fichiers de migration
const migrationsDir = path.join(__dirname, '../migrations');

// Vérifier que le dossier existe
if (!fs.existsSync(migrationsDir)) {
  console.log('⚠️  Migrations directory not found, skipping migration compilation');
  console.log(`   Expected path: ${migrationsDir}`);
  process.exit(0);
}

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(migrationsDir, file));

if (migrationFiles.length === 0) {
  console.log('⚠️  No migration files found in migrations/ directory');
  process.exit(0);
}

console.log(`Found ${migrationFiles.length} migration file(s)`);

// Compiler chaque fichier de migration
migrationFiles.forEach(file => {
  const fileName = path.basename(file);
  console.log(`Compiling ${fileName}...`);
  
  try {
    execSync(
      `tsc "${file}" --outDir "${distMigrationsDir}" --module commonjs --target ES2021 --esModuleInterop --skipLibCheck --moduleResolution node --resolveJsonModule --declaration false`,
      { stdio: 'inherit' }
    );
    console.log(`✅ ${fileName} compiled successfully`);
  } catch (error) {
    console.error(`❌ Failed to compile ${fileName}:`, error.message);
    process.exit(1);
  }
});

console.log('✅ All migrations compiled successfully');

// Compiler aussi data-source.ts pour les migrations en production (si existe)
const dataSourceFile = path.join(__dirname, '../src/config/data-source.ts');
const distConfigDir = path.join(__dirname, '../dist/config');

if (fs.existsSync(dataSourceFile)) {
  console.log(`📁 Creating config directory: ${distConfigDir}`);
  if (!fs.existsSync(distConfigDir)) {
    fs.mkdirSync(distConfigDir, { recursive: true });
    console.log(`✅ Created config directory`);
  } else {
    console.log(`✅ Config directory already exists`);
  }

  console.log('Compiling data-source.ts...');
  try {
    execSync(
      `tsc "${dataSourceFile}" --outDir "${distConfigDir}" --module commonjs --target ES2021 --esModuleInterop --skipLibCheck --moduleResolution node --resolveJsonModule --declaration false`,
      { stdio: 'inherit' }
    );
    console.log('✅ data-source.ts compiled successfully');
  } catch (error) {
    console.error('❌ Failed to compile data-source.ts:', error.message);
    process.exit(1);
  }
} else {
  console.log('⚠️  data-source.ts not found, skipping');
}
