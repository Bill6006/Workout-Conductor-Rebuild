import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const tracked = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
if (tracked.status !== 0) {
  throw new Error(`Could not enumerate tracked files: ${tracked.stderr}`);
}

const files = tracked.stdout.split('\0').filter(Boolean);
const forbiddenPaths = [
  /(^|\/)backups?\//i,
  /(^|\/)private-data\//i,
  /workout-backup\.json$/i,
  /browser-storage/i,
];
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
];

const findings = [];
for (const file of files) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    findings.push(`${file}: private export or storage path is tracked`);
    continue;
  }
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  if (statSync(file).size > 2_000_000) continue;
  const content = readFileSync(file, 'utf8');
  secretPatterns.forEach((pattern) => {
    if (pattern.test(content))
      findings.push(`${file}: secret-like value detected`);
  });
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(`Privacy scan passed for ${files.length} tracked files.`);
