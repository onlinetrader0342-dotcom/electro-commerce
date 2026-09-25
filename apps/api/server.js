/**
 * Electro API - Lightweight Medusa Store API compatible backend
 * 
 * Implements the subset of Medusa's Store API that the storefront uses:
 *   GET /health
 *   GET /store/products (list with filters, pagination)
 *   GET /store/products/:id (single product)
 *   GET /store/product-categories
 * 
 * Data source: Postgres (if DATABASE_URL set and tables have data),
 * otherwise bundled JSON in ./data/.
 * 
 * Memory footprint: ~50-80MB (vs Medusa's 577MB).
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 9000;

// CORS - allow the storefront
app.use(cors({
  origin: (process.env.STORE_CORS || 'http://localhost:3000').split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json());

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let products = [];
let categories = [];
let useDb = false;
let dbClient = null;

function loadFromJson() {
  try {
    const dataDir = path.join(__dirname, 'data');
    products = JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf8'));
    categories = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf8'));
    console.log(`Loaded ${products.length} products, ${categories.length} categories from JSON`);
  } catch (e) {
    console.error('Failed to load JSON data:', e.message);
  }
}

async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('No DATABASE_URL, using JSON data');
    loadFromJson();
    return;
  }
  try {
    const { Client } = require('pg');
    dbClient = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await dbClient.connect();
    const r = await dbClient.query(
      "SELECT count(*) as c FROM product WHERE status='published' AND deleted_at IS NULL"
    );
    const count = parseInt(r.rows[0].c);
    if (count > 0) {
      useDb = true;
      console.log(`Using Postgres database (${count} published products)`);
    } else {
      console.log('Database is empty, using JSON data');
      loadFromJson();
    }
  } catch (e) {
    console.log('DB connection failed, using JSON data:', e.message);
    loadFromJson();
  }
}

async function queryProductsFromDb({ handle, categoryId, search, limit, offset }) {
  // Build a Medusa-shaped product list from the DB
  let where = "p.status='published' AND p.deleted_at IS NULL";
  const params = [];
  if (handle) {
    params.push(handle);
    where += ` AND p.handle = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }
  if (categoryId) {
    params.push(categoryId);
    where += ` AND EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id = p.id AND pcp.product_category_id = $${params.length})`;
  }

  const countRes = await dbClient.query(
    `SELECT count(*) as c FROM product p WHERE ${where}`, params
  );
  const total = parseInt(countRes.rows[0].c);

  params.push(limit, offset);
  const prodRes = await dbClient.query(
    `SELECT p.id, p.title, p.handle, p.subtitle, p.description, p.thumbnail, p.metadata
     FROM product p WHERE ${where}
     ORDER BY p.title LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const out = [];
  for (const p of prodRes.rows) {
    const varRes = await dbClient.query(
      `SELECT id, title, sku, metadata, allow_backorder, manage_inventory
       FROM product_variant WHERE product_id=$1 AND deleted_at IS NULL`,
      [p.id]
    );
    const variants = [];
    for (const v of varRes.rows) {
      const priceRes = await dbClient.query(`
        SELECT pr.amount, pr.currency_code FROM price pr
        JOIN price_set ps ON pr.price_set_id = ps.id
        JOIN product_variant_price_set pvps ON pvps.price_set_id = ps.id
        WHERE pvps.variant_id = $1 LIMIT 1`, [v.id]);
      const price = priceRes.rows[0];
      const invRes = await dbClient.query(`
        SELECT COALESCE(SUM(il.stocked_quantity),0) as qty
        FROM inventory_level il
        JOIN inventory_item ii ON il.inventory_item_id = ii.id
        JOIN product_variant_inventory_item pvii ON pvii.inventory_item_id = ii.id
        WHERE pvii.variant_id=$1 AND il.deleted_at IS NULL`, [v.id]);
      variants.push({
        id: v.id, title: v.title, sku: v.sku,
        metadata: v.metadata || {},
        allow_backorder: v.allow_backorder,
        manage_inventory: v.manage_inventory,
        inventory_quantity: parseInt(invRes.rows[0].qty),
        calculated_price: price ? {
          calculated_amount: parseInt(price.amount),
          currency_code: price.currency_code,
        } : null,
      });
    }
    const catRes = await dbClient.query(`
      SELECT pc.id, pc.name, pc.handle FROM product_category pc
      JOIN product_category_product pcp ON pcp.product_category_id = pc.id
      WHERE pcp.product_id=$1 AND pc.deleted_at IS NULL`, [p.id]);
    const imgRes = await dbClient.query(`
      SELECT i.url FROM image i
      JOIN product_variant_product_image pvpi ON pvpi.image_id = i.id
      JOIN product_variant pv ON pv.id = pvpi.variant_id
      WHERE pv.product_id=$1 AND i.deleted_at IS NULL LIMIT 5`, [p.id]);

    out.push({
      id: p.id, title: p.title, handle: p.handle,
      subtitle: p.subtitle, description: p.description,
      thumbnail: p.thumbnail, metadata: p.metadata || {},
      variants,
      categories: catRes.rows,
      images: imgRes.rows.map(r => ({ url: r.url })),
    });
  }
  return { products: out, count: total };
}

async function queryCategoriesFromDb() {
  const r = await dbClient.query(`
    SELECT id, name, handle, description, parent_category_id, metadata, rank
    FROM product_category WHERE deleted_at IS NULL ORDER BY rank, name
  `);
  return r.rows;
}

// ---------------------------------------------------------------------------
// JSON-mode helpers
// ---------------------------------------------------------------------------

function filterProductsJson({ handle, categoryId, search }) {
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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/store/products', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 100);
    const offset = parseInt(req.query.offset) || 0;
    const handle = req.query.handle;
    const search = req.query.q || req.query.search;
    // category filter: support ?category_id= or ?categories[]= via Medusa-style params
    const categoryId = req.query.category_id || req.query['categories[]'] || req.query.categories;

    if (useDb && dbClient) {
      const { products: list, count } = await queryProductsFromDb({
        handle, categoryId, search, limit, offset,
      });
      return res.json({ products: list, count, limit, offset });
    }

    const filtered = filterProductsJson({ handle, categoryId, search });
    const paged = filtered.slice(offset, offset + limit);
    res.json({ products: paged, count: filtered.length, limit, offset });
  } catch (e) {
    console.error('GET /store/products error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/store/products/:id', async (req, res) => {
  try {
    if (useDb && dbClient) {
      const { products: list } = await queryProductsFromDb({});
      const found = list.find(p => p.id === req.params.id || p.handle === req.params.id);
      if (!found) return res.status(404).json({ error: 'not_found' });
      return res.json({ product: found });
    }
    const found = products.find(p => p.id === req.params.id || p.handle === req.params.id);
    if (!found) return res.status(404).json({ error: 'not_found' });
    res.json({ product: found });
  } catch (e) {
    console.error('GET /store/products/:id error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/store/product-categories', async (req, res) => {
  try {
    if (useDb && dbClient) {
      const cats = await queryCategoriesFromDb();
      return res.json({ product_categories: cats });
    }
    res.json({ product_categories: categories });
  } catch (e) {
    console.error('GET /store/product-categories error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Catch-all for unimplemented store routes (so the storefront falls back gracefully)
app.all('/store/*', (req, res) => {
  res.status(501).json({ error: 'not_implemented', path: req.path });
});

// ---------------------------------------------------------------------------

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Electro API listening on port ${PORT} (db: ${useDb ? 'postgres' : 'json'})`);
  });
});
