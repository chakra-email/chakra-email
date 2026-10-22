import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const siteRoot = new URL('../apps/site/', import.meta.url);
const require = createRequire(new URL('package.json', siteRoot));
const portServer = createServer();
portServer.listen(0, '127.0.0.1');
await once(portServer, 'listening');
const { port } = portServer.address();
await new Promise((resolve, reject) =>
  portServer.close((error) => (error ? reject(error) : resolve())),
);

const server = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    cwd: fileURLToPath(siteRoot),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let log = '';
for (const stream of [server.stdout, server.stderr])
  stream.on('data', (chunk) => {
    log = (log + chunk).slice(-8000);
  });
const origin = `http://127.0.0.1:${port}`;
const request = (route, options) =>
  fetch(origin + route, { ...options, signal: AbortSignal.timeout(10_000) });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error('Next server exited before becoming ready.');
    try {
      ready = (await request('/')).ok;
    } catch {
      /* Wait for the local listener. */
    }
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, 'Next production server must start');

  for (const [route, title] of [
    ['/', 'Chakra Email'],
    ['/docs/getting-started', 'Getting Started'],
    ['/docs', 'Getting Started'],
    ['/examples', 'Template examples'],
    ['/packages', 'Packages'],
    ['/withoss', 'Made with open-source software'],
  ]) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    const document = new JSDOM(await response.text()).window.document;
    assert.equal(document.querySelectorAll('main').length, 1, route);
    assert.equal(document.querySelectorAll('h1').length, 1, route);
    const heading = document.querySelector('h1');
    assert.equal(
      heading.getAttribute('aria-label') ?? heading.textContent,
      title,
      route,
    );
    assert.equal(
      document.querySelectorAll('link[rel="canonical"]').length,
      1,
      route,
    );
    assert.equal(
      document.querySelector('link[rel="canonical"]').href,
      'https://chakra.email' +
        (route === '/docs' ? '/docs/getting-started' : route),
    );
    assert.equal(
      document.querySelectorAll('#page-structured-data').length,
      1,
      route,
    );
    assert.ok(
      document.querySelector(
        'link[href="https://kits.fontstack.com/kit/o0v0t0oi.css"]',
      ),
      route,
    );
    if (route === '/docs/getting-started')
      assert.ok(
        document.querySelector('h2#install'),
        'Markdown must be in the HTML before JavaScript',
      );
  }

  for (const file of [
    'llms.txt',
    'llms-full.txt',
    'sitemap.xml',
    'robots.txt',
  ]) {
    const response = await request('/' + file);
    assert.equal(response.status, 200, file);
    assert.match(
      response.headers.get('content-type'),
      file === 'sitemap.xml' ? /application\/xml/ : /text\/plain/,
    );
    assert.ok((await response.text()).length > 50, file);
    assert.equal((await request('/' + file, { method: 'HEAD' })).status, 200);
    assert.equal((await request('/' + file, { method: 'POST' })).status, 405);
  }
  const search = await request('/api/docs/search?q=render');
  assert.equal(search.status, 200);
  const { results } = await search.json();
  assert.ok(results.length > 0 && results.length <= 20);
  assert.ok(
    results.every((result) => !('body' in result) && !('text' in result)),
  );
  assert.equal(
    (await request('/api/docs/search?q=' + 'x'.repeat(201))).status,
    400,
  );
  assert.equal(
    (await request('/api/docs/search', { method: 'POST' })).status,
    405,
  );
  for (const route of ['/og-image', '/docs/getting-started/social-image']) {
    const response = await request(route);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    const document = new JSDOM(await response.text()).window.document;
    assert.match(
      document.querySelector('meta[name="robots"]').content,
      /noindex/,
    );
    assert.equal(document.querySelector('header'), null);
    assert.equal(document.querySelector('#page-structured-data'), null);
  }
  for (const route of ['/not-a-page', '/social-image.png', '/docs/missing']) {
    const response = await request(route);
    assert.equal(response.status, 404, route);
    const document = new JSDOM(await response.text()).window.document;
    assert.equal(document.querySelector('h1')?.textContent, 'Page not found');
    assert.match(
      document.querySelector('meta[name="robots"]').content,
      /noindex/,
    );
  }
  console.log(
    'Next docs production smoke passed: prerendered content, metadata, JSON-LD, discovery, API search, capture headers, and real 404s.',
  );
} catch (error) {
  console.error(log);
  throw error;
} finally {
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}
