import { rmSync } from 'node:fs';
import { join } from 'node:path';

const packageNames = ['chakra-email', 'chakra-email-v2', 'core', 'preview'];

for (const packageName of packageNames) {
  for (const outputDir of ['dist', 'out-tsc', 'test-output']) {
    rmSync(join('packages', packageName, outputDir), {
      force: true,
      recursive: true,
    });
  }
}
