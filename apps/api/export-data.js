// Export products and categories from local Medusa DB to JSON
// Run: node export-data.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/electro';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to DB');

  // Export categories
  const catRes = await client.query(`
    SELECT id, name, handle, description, parent_category_id, metadata, rank
    FROM product_category 
    WHERE deleted_at IS NULL 
    ORDER BY rank, name
  `);
  console.log(`Categories: ${catRes.rows.length}`);

  // Export products with variants, prices, categories
  const prodRes = await client.query(`
    SELECT id, title, handle, subtitle, description, thumbnail, metadata, status
    FROM product 
    WHERE status = 'published' AND deleted_at IS NULL
    ORDER BY title
  `);
  console.log(`Products: ${prodRes.rows.length}`);

  const products = [];
  for (const p of prodRes.rows) {
    // Get variants
    const varRes = await client.query(
      `SELECT id, title, sku, metadata, allow_backorder, manage_inventory
       FROM product_variant 
       WHERE product_id = $1 AND deleted_at IS NULL`,
      [p.id]
    );

    const variants = [];
    for (const v of varRes.rows) {
      // Get price
      const priceRes = await client.query(`
        SELECT pr.amount, pr.currency_code
        FROM price pr
        JOIN price_set ps ON pr.price_set_id = ps.id
        JOIN product_variant_price_set pvps ON pvps.price_set_id = ps.id
        WHERE pvps.variant_id = $1
        LIMIT 1
      `, [v.id]);
      const price = priceRes.rows[0];

      // Get inventory
      const invRes = await client.query(`
        SELECT COALESCE(SUM(il.stocked_quantity), 0) as qty
        FROM inventory_level il
        JOIN inventory_item ii ON il.inventory_item_id = ii.id
        JOIN product_variant_inventory_item pvii ON pvii.inventory_item_id = ii.id
        WHERE pvii.variant_id = $1 AND il.deleted_at IS NULL
      `, [v.id]);
      const invQty = parseInt(invRes.rows[0]?.qty || '0');

      variants.push({
        id: v.id,
        title: v.title,
        sku: v.sku,
        metadata: v.metadata || {},
        allow_backorder: v.allow_backorder,
        manage_inventory: v.manage_inventory,
        inventory_quantity: invQty,
        calculated_price: price ? {
          calculated_amount: parseInt(price.amount),
          currency_code: price.currency_code,
        } : null,
      });
    }

    // Get categories
    const prodCatRes = await client.query(`
      SELECT pc.id, pc.name, pc.handle
      FROM product_category pc
      JOIN product_category_product pcp ON pcp.product_category_id = pc.id
      WHERE pcp.product_id = $1 AND pc.deleted_at IS NULL
    `, [p.id]);

    // Get images
    const imgRes = await client.query(`
      SELECT i.url
      FROM image i
      JOIN product_variant_product_image pvpi ON pvpi.image_id = i.id
      JOIN product_variant pv ON pv.id = pvpi.variant_id
      WHERE pv.product_id = $1 AND i.deleted_at IS NULL
      LIMIT 5
    `, [p.id]);

    products.push({
      id: p.id,
      title: p.title,
      handle: p.handle,
      subtitle: p.subtitle,
      description: p.description,
      thumbnail: p.thumbnail,
      metadata: p.metadata || {},
      variants,
      categories: prodCatRes.rows,
      images: imgRes.rows.map(r => ({ url: r.url })),
    });
  }

  // Write files
  const dataDir = path.join(__dirname, 'data');
  fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(products, null, 1));
  fs.writeFileSync(path.join(dataDir, 'categories.json'), JSON.stringify(catRes.rows, null, 1));
  
  console.log(`Wrote ${products.length} products and ${catRes.rows.length} categories`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
