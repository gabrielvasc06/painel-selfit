import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/', import.meta.url));
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
test('frontend usa a organizacao de telas, contextos, hooks, services e utils', () => {
  for (const folder of ['assets', 'components', 'contexts', 'hooks', 'pages', 'services', 'utils']) {
    assert.ok(fs.statSync(path.join(root, folder)).isDirectory(), folder);
  }
  for (const file of files(root)) {
    const source = fs.readFileSync(file, 'utf8');
    if (!file.startsWith(path.join(root, 'services') + path.sep)) {
      assert.doesNotMatch(source, /\bfetch\s*\(/, 'Chamadas externas devem ficar em services');
    }
  }
});
