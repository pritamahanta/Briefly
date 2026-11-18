import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const files = readdirSync('src', { recursive: true }).filter((file) => file.endsWith('.js'));

for (const file of files.map((file) => join('src', file))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Syntax check passed: ${files.length} JavaScript files.`);
