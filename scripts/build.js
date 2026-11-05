import { mkdir, cp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'style.css', 'src']) await cp(file, `dist/${file}`, { recursive: true });
// Changed assets get a new URL so mobile browsers cannot reuse an older renderer.
const hash = createHash('sha256');
for (const file of (await readdir('src')).sort()) hash.update(await readFile(`src/${file}`));
hash.update(await readFile('style.css'));
const version = hash.digest('hex').slice(0, 12);
const html = (await readFile('dist/index.html', 'utf8'))
  .replace('./src/app.js', `./src/app.js?v=${version}`)
  .replace('./style.css', `./style.css?v=${version}`);
await writeFile('dist/index.html', html);
const app = (await readFile('dist/src/app.js', 'utf8')).replace("'./physics.js'", `'./physics.js?v=${version}'`).replace("'./audio.js'", `'./audio.js?v=${version}'`);
await writeFile('dist/src/app.js', app);
console.log(`Static build ready in dist/ (assets ${version})`);
