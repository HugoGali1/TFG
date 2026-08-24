/**
 * Arranca el backend contra un MongoDB efímero en memoria.
 *
 * Pensado para desarrollo y para la demo del TFG cuando no hay un Mongo local
 * ni acceso al cluster de Atlas. Cada arranque parte de cero: se lanza el
 * servidor en memoria, se ejecuta el seed y después el backend.
 *
 * Uso: npm run dev:mem
 */
const { spawn } = require('child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DB_NAME = 'brasa-ascuas';

/** Ejecuta un script de npm heredando la salida y esperando a que termine. */
function runNpm(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], { env, stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`"npm run ${script}" salió con código ${code}`)),
    );
  });
}

async function main() {
  console.log('Levantando MongoDB en memoria (la primera vez descarga el binario)...');
  const mongo = await MongoMemoryServer.create({ instance: { dbName: DB_NAME } });
  const uri = mongo.getUri(DB_NAME);
  console.log(`MongoDB en memoria listo: ${uri}\n`);

  // dotenv (vía @nestjs/config) no pisa variables ya presentes en process.env,
  // así que esto tiene prioridad sobre el MONGODB_URI del .env.
  const env = { ...process.env, MONGODB_URI: uri };

  let backend = null;
  let shuttingDown = false;

  const shutdown = async (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (backend && backend.exitCode === null) backend.kill();
    await mongo.stop().catch(() => {});
    process.exit(code);
  };

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));

  try {
    console.log('Ejecutando seed...\n');
    await runNpm('seed', env);
  } catch (err) {
    console.error(`\nEl seed ha fallado: ${err.message}`);
    await shutdown(1);
    return;
  }

  console.log('\nArrancando el backend...\n');
  backend = spawn('npm', ['run', 'start:dev'], { env, stdio: 'inherit', shell: true });
  backend.on('exit', (code) => void shutdown(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
