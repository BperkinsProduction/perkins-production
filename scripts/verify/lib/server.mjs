// A tiny static file server so `--cand dist` works without any other tooling.
// It serves files as-is, like Vercel's static output, but knows nothing about
// vercel.json (no rewrites, redirects, headers or /api functions).
import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
    '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
};

function statOrNull(p) { try { return statSync(p); } catch { return null; } }

export function serveFolder(folder) {
    const root = resolve(folder);
    if (!existsSync(join(root, 'index.html'))) {
        throw new Error(`${folder} has no index.html. Run "npm run build" first.`);
    }
    const server = http.createServer((req, res) => {
        let pathname;
        try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
        catch { res.writeHead(400).end(); return; }
        let file = normalize(join(root, pathname));
        if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
        let st = statOrNull(file);
        if (st?.isDirectory()) {
            if (!pathname.endsWith('/')) { res.writeHead(301, { Location: pathname + '/' }).end(); return; }
            file = join(file, 'index.html');
            st = statOrNull(file);
        }
        if (!st?.isFile()) {
            const notFound = join(root, '404.html');
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            if (req.method !== 'HEAD' && existsSync(notFound)) createReadStream(notFound).pipe(res); else res.end('Not found');
            return;
        }
        const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
        const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (range && (range[1] || range[2])) {
            const start = range[1] ? +range[1] : Math.max(0, st.size - +range[2]);
            const end = range[1] && range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
            if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
            res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
            if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).pipe(res);
            return;
        }
        res.writeHead(200, { ...headers, 'Content-Length': st.size });
        if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
    });
    return new Promise((res, rej) => {
        server.once('error', rej);
        server.listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close(), root }));
    });
}
