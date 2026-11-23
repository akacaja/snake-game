// Tiny static file server (Node only, no dependencies).
// Usage: node scripts/serve.js [port] [--base /subfolder/]
//   node scripts/serve.js                       ->  http://localhost:8000/demo/
//   node scripts/serve.js 8001                  ->  another port
//   node scripts/serve.js --base /snake-game/   ->  http://localhost:8000/snake-game/demo/
//                                                   (simulates GitHub Pages, which serves the site in a subfolder)
// It also prints the address on your network, to open the demo on a phone on the same Wi-Fi.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};

// '' or '/' -> ''. 'x', '/x' or '/x/' -> '/x'. Refuses '..', '?', '#' and '//'.
export function normalizeBase(value) {
  const text = String(value ?? '').trim();
  if (text === '' || text === '/') return '';
  if (/\.\.|[?#]|\/\//.test(text)) throw new Error(`Invalid --base: ${text}`);
  return '/' + text.replace(/^\/+/, '').replace(/\/+$/, '');
}

// The port is the first argument that is not an option, else env.PORT, else 8000.
export function parseArgs(argv = process.argv.slice(2), env = process.env) {
  let port;
  let base = '';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) throw new Error('--base needs a value, for example --base /snake-game/');
      base = normalizeBase(next);
      i++;
    } else if (arg.startsWith('--base=')) {
      base = normalizeBase(arg.slice('--base='.length));
    } else if (!arg.startsWith('-') && port === undefined) {
      port = Number(arg);
    }
  }
  return { port: port ?? Number(env.PORT || 8000), base };
}

// IPv4 addresses of this computer on the network (no loopback, no repeats).
export function lanAddresses(interfaces = networkInterfaces()) {
  const found = [];
  for (const list of Object.values(interfaces)) {
    for (const info of list || []) {
      if ((info.family === 'IPv4' || info.family === 4) && !info.internal && !found.includes(info.address)) {
        found.push(info.address);
      }
    }
  }
  return found;
}

export function serverUrls({ port, base = '', addresses = [] }) {
  const local = [`http://localhost:${port}${base}/demo/`, `http://localhost:${port}${base}/examples/module.html`];
  if (base) local.push(`http://localhost:${port}${base}`);
  const network = addresses.map((ip) => `http://${ip}:${port}${base}/demo/`);
  return { local, network };
}

// Returns an http.Server that is not listening yet.
export function createStaticServer({ root, base = '' }) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (base) {
        if (pathname === base) pathname = '/';
        else if (pathname.startsWith(base + '/')) pathname = pathname.slice(base.length);
        else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
          return;
        }
      }
      // Hidden files and folders (.git, .crew, .DS_Store...) are never served: anyone on the Wi-Fi could read them.
      if (pathname.split(/[\\/]/).some((part) => part.startsWith('.'))) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
      let path = normalize(join(root, pathname));
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(path).catch(() => null);
      if (info && info.isDirectory()) path = join(path, 'index.html');
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  let options;
  try {
    options = parseArgs();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const { port, base } = options;
  const server = createStaticServer({ root, base });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is busy. Stop the other server (Control+C in its window) or use another port: node scripts/serve.js 8001`);
      process.exit(1);
    }
    throw error;
  });
  server.listen(port, () => {
    const addresses = lanAddresses();
    const urls = serverUrls({ port, base, addresses });
    console.log(`Serving ${root}${base ? `   (base: ${base})` : ''}`);
    console.log('On this computer:');
    for (const u of urls.local) console.log(`  ${u}`);
    if (urls.network.length) {
      console.log('On your network (phone on the same Wi-Fi):');
      for (const u of urls.network) console.log(`  ${u}`);
    } else {
      console.log('No network address found (is Wi-Fi on?)');
    }
  });
}
