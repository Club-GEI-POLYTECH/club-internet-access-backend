const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Créer le dossier de destination
const distSeedsDir = path.join(__dirname, '../dist/database/seeds');
console.log(`📁 Creating seeds directory: ${distSeedsDir}`);

// S'assurer que dist/ existe
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`✅ Created dist directory`);
}

// S'assurer que dist/database existe
const distDatabaseDir = path.join(__dirname, '../dist/database');
if (!fs.existsSync(distDatabaseDir)) {
  fs.mkdirSync(distDatabaseDir, { recursive: true });
  console.log(`✅ Created database directory`);
}

// Créer le dossier seeds avec gestion d'erreur
try {
  if (!fs.existsSync(distSeedsDir)) {
    fs.mkdirSync(distSeedsDir, { recursive: true, mode: 0o755 });
    console.log(`✅ Created seeds directory`);
  } else {
    console.log(`✅ Seeds directory already exists`);
  }
} catch (error) {
  if (error.code === 'EACCES') {
    console.error(`❌ Permission denied: Cannot create ${distSeedsDir}`);
    console.error(`   Please run: sudo chown -R $USER:$USER dist/`);
    console.error(`   Or fix permissions on dist/ directory`);
    process.exit(1);
  }
  throw error;
}

// Trouver tous les fichiers seeds
const seedsDir = path.join(__dirname, '../src/database/seeds');

// Vérifier que le dossier existe
if (!fs.existsSync(seedsDir)) {
  console.log('⚠️  Seeds directory not found, skipping seeds compilation');
  console.log(`   Expected path: ${seedsDir}`);
  process.exit(0);
}

const seedFiles = fs.readdirSync(seedsDir)
  .filter(file => file.endsWith('.ts') && file !== 'README.md')
  .map(file => path.join(seedsDir, file));

if (seedFiles.length === 0) {
  console.log('⚠️  No seed files found in src/database/seeds/ directory');
  process.exit(0);
}

console.log(`Found ${seedFiles.length} seed file(s)`);

// Compiler chaque fichier seed directement dans distSeedsDir
// Utiliser la même approche que build-migrations.js
seedFiles.forEach(file => {
  const fileName = path.basename(file);
  const baseName = fileName.replace('.ts', '');
  console.log(`Compiling ${fileName}...`);

  try {
    // Compiler le fichier - TypeScript créera la structure complète
    // On compile dans dist/ et on déplace ensuite
    const tempOutDir = path.join(__dirname, '../dist/.temp-seeds');
    if (fs.existsSync(tempOutDir)) {
      fs.rmSync(tempOutDir, { recursive: true, force: true });
    }

    // Compiler avec --rootDir pour contrôler la structure
    const srcRoot = path.join(__dirname, '../src');
    execSync(
      `tsc "${file}" --outDir "${tempOutDir}" --rootDir "${srcRoot}" --module commonjs --target ES2021 --esModuleInterop --skipLibCheck --moduleResolution node --resolveJsonModule --declaration false --experimentalDecorators --emitDecoratorMetadata`,
      { stdio: 'inherit' }
    );

    // Chercher le fichier compilé
    const compiledFile = path.join(tempOutDir, 'database', 'seeds', `${baseName}.js`);
    const targetFile = path.join(distSeedsDir, `${baseName}.js`);

    if (fs.existsSync(compiledFile)) {
      // Copier le fichier compilé au bon endroit
      fs.copyFileSync(compiledFile, targetFile);
    } else {
      // Si le fichier n'est pas trouvé, chercher récursivement
      const findFile = (dir, filename) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = findFile(fullPath, filename);
            if (found) return found;
          } else if (entry.name === filename) {
            return fullPath;
          }
        }
        return null;
      };

      const foundFile = findFile(tempOutDir, `${baseName}.js`);
      if (foundFile) {
        fs.copyFileSync(foundFile, targetFile);
      } else {
        throw new Error(`Compiled file ${baseName}.js not found in ${tempOutDir}`);
      }
    }

    // Nettoyer le dossier temporaire
    fs.rmSync(tempOutDir, { recursive: true, force: true });
    console.log(`✅ ${fileName} compiled successfully`);
  } catch (error) {
    console.error(`❌ Failed to compile ${fileName}:`, error.message);
    process.exit(1);
  }
});

console.log('✅ All seeds compiled successfully');
