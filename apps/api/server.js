/**
 * Electro API - Lightweight Medusa Store API compatible backend
 * ZERO dependencies - uses only Node.js built-ins.
 * 
 * Implements the subset of Medusa's Store API that the storefront uses:
 *   GET /health
 *   GET /store/products (list with filters, pagination)
 *   GET /store/products/:id (single product)
 *   GET /store/product-categories
 * 
 * Data: bundled JSON in ./data/ (100 products, 35 categories).
 * Memory footprint: ~30-50MB.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 9000;
const STORE_CORS = (process.env.STORE_CORS || 'http://localhost:3000').split(',').map(s => s.trim());

// Load data
let products = [];
let categories = [];
try {
  const dataDir = path.join(__dirname, 'data');
  products = JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf8'));
  categories = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf8'));
  console.log(`Loaded ${products.length} products, ${categories.length} categories`);
} catch (e) {
  console.error('Failed to load data:', e.message);
}

function filterProducts({ handle, categoryId, search }) {
  let list = products;
  if (handle) list = list.filter(p => p.handle === handle);
  if (categoryId) list = list.filter(p => (p.categories || []).some(c => c.id === categoryId));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.handle || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function sendJson(res, status, obj, origin) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-publishable-api-key',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const allowedOrigin = STORE_CORS.includes(origin) ? origin : STORE_CORS[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-publishable-api-key',
    });
    return res.end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'method_not_allowed' }, allowedOrigin);
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const params = url.searchParams;

  // GET /health
  if (pathname === '/health') {
    return sendJson(res, 200, { status: 'ok' }, allowedOrigin);
  }

  // GET /store/products
  if (pathname === '/store/products') {
    const limit = Math.min(parseInt(params.get('limit')) || 12, 100);
    const offset = parseInt(params.get('offset')) || 0;
    const handle = params.get('handle');
    const search = params.get('q') || params.get('search');
    const categoryId = params.get('category_id') || params.get('categories[]') || params.get('categories');

    const filtered = filterProducts({ handle, categoryId, search });
    const paged = filtered.slice(offset, offset + limit);
    return sendJson(res, 200, {
      products: paged,
      count: filtered.length,
      limit,
      offset,
    }, allowedOrigin);
  }

  // GET /store/products/:id
  const productMatch = pathname.match(/^\/store\/products\/([^\/]+)$/);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]);
    const found = products.find(p => p.id === id || p.handle === id);
    if (!found) return sendJson(res, 404, { error: 'not_found' }, allowedOrigin);
    return sendJson(res, 200, { product: found }, allowedOrigin);
  }

  // GET /store/product-categories
  if (pathname === '/store/product-categories') {
    return sendJson(res, 200, { product_categories: categories }, allowedOrigin);
  }

  // Unimplemented store routes -> 501 so storefront falls back gracefully
  if (pathname.startsWith('/store/')) {
    return sendJson(res, 501, { error: 'not_implemented', path: pathname }, allowedOrigin);
  }

  return sendJson(res, 404, { error: 'not_found' }, allowedOrigin);
});

server.listen(PORT, () => {
  console.log(`Electro API listening on port ${PORT}`);
});
