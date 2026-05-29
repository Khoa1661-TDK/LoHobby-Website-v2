// scripts/run-prisma-studio.cjs — launches Prisma Studio with a sanitized Postgres URL
require('dotenv/config');
const { spawn } = require('node:child_process');
const path = require('node:path');

const raw = process.env.STUDIO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!raw) {
  console.error(
    'Missing DATABASE_URL. Add it to .env, then retry.',
  );
  process.exit(1);
}

const url = new URL(raw);
// Prisma 7 Studio passes the URL to postgres.js; non-libpq params break introspection.
const strip = [
  'schema',
  'connection_limit',
  'pool_timeout',
  'sslidentity',
  'sslaccept',
  'pool',
  'socket_timeout',
  'pgbouncer',
  'statement_cache_size',
  'uselibpqcompat',
];
for (const key of strip) {
  url.searchParams.delete(key);
}

if (!URL.canParse(url.toString())) {
  console.error('DATABASE_URL is not a valid PostgreSQL connection string.');
  process.exit(1);
}

const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
const args = ['studio', '--url', url.toString(), ...process.argv.slice(2)];

const child = spawn(process.execPath, [prismaCli, ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('exit', (code) => process.exit(code ?? 0));
