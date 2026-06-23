import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const dbUrl = process.env.DATABASE_URL;

function codeToId(code: string): number {
  if (!code) return 0;
  const cleaned = code.trim().toUpperCase();
  const digits = parseInt(cleaned.replace(/\D/g, '')) || 0;
  if (cleaned.startsWith('C')) {
    return 10000 + digits;
  }
  return digits;
}

async function run() {
  if (!dbUrl) {
    console.log("No DATABASE_URL found.");
    return;
  }
  const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false }, connect_timeout: 10 });
  try {
    const stock = await sql`SELECT id_code, name, variants FROM stock`;
    console.log(`FOUND ${stock.length} ARTICLES IN STOCK TABLE.`);
    
    const variantSkusSet = new Set<string>();
    for (const s of stock) {
      if (s.variants) {
        try {
          const parsed = typeof s.variants === 'string' ? JSON.parse(s.variants) : s.variants;
          if (Array.isArray(parsed)) {
            console.log(`Article ${s.id_code} has variants:`, parsed.map((v: any) => v.sku));
            parsed.forEach((v: any) => {
              if (v.sku) {
                variantSkusSet.add(v.sku.toLowerCase().trim());
              }
            });
          }
        } catch (e) {}
      }
    }
    console.log("variantSkusSet size:", variantSkusSet.size, "elements:", Array.from(variantSkusSet));

    const ids: Record<number, any[]> = {};
    for (const s of stock) {
      const numericId = codeToId(s.id_code);
      if (!ids[numericId]) ids[numericId] = [];
      ids[numericId].push(s);
    }
    for (const [id, items] of Object.entries(ids)) {
      if (items.length > 1) {
        console.warn(`COLLISION FOR ID ${id}:`, items);
      }
    }
    console.log("Done checking for codeToId collisions.");
  } catch (err: any) {
    console.error("Query error:", err.message);
  } finally {
    await sql.end();
  }
}

run();
