import { requireAccess } from '@/lib/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Product = { id: string; title_ar: string; description: string | null; specifications: Record<string, unknown> | null };
type Variant = { id: string; product_id: string; sku: string | null; title_override: string | null; description_override: string | null; price_minor: number; stock_on_hand: number; stock_reserved: number };

export async function GET(request: Request) {
  const blocked = await requireAccess(request);
  if (blocked) return blocked;
  const headers = { 'Cache-Control': 'private, no-store' };
  const base = process.env.HOMEY_CATALOG_URL;
  const key = process.env.HOMEY_CATALOG_KEY;
  if (!base || !key) return Response.json({ error: 'كتالوج هومي لسه مش متوصل بالمعاينة.' }, { status: 503, headers });

  try {
    const signal = AbortSignal.timeout(10000);
    async function read<T>(table: string, query: string): Promise<T[]> {
      const rows: T[] = [];
      for (let offset = 0; offset < 10000; offset += 200) {
        const url = new URL('/rest/v1/' + table + '?' + query + '&order=id.asc&limit=200&offset=' + offset, base!);
        if (url.protocol !== 'https:') throw new Error('HTTPS required');
        const response = await fetch(url, { headers: { apikey: key! }, cache: 'no-store', redirect: 'error', signal });
        if (!response.ok) throw new Error('Catalog unavailable');
        const page: T[] = await response.json();
        if (!Array.isArray(page)) throw new Error('Invalid catalog');
        rows.push(...page);
        if (page.length < 200) return rows;
      }
      throw new Error('Catalog pagination limit exceeded');
    }

    const [products, variants] = await Promise.all([
      read<Product>('homly_products', 'select=id,title_ar,description,specifications&status=eq.published&deleted_at=is.null'),
      read<Variant>('homly_product_variants', 'select=id,product_id,sku,title_override,description_override,price_minor,stock_on_hand,stock_reserved&status=eq.published&is_listed=eq.true'),
    ]);
    const byId = new Map(products.map(product => [product.id, product]));
    return Response.json({ products: variants.flatMap(variant => {
      const product = byId.get(variant.product_id);
      if (!product?.title_ar || !Number.isSafeInteger(variant.price_minor) || variant.price_minor < 0 ||
          !Number.isSafeInteger(variant.stock_on_hand) || !Number.isSafeInteger(variant.stock_reserved)) return [];
      const specs = Object.entries(product.specifications ?? {}).flatMap(([label, value]) =>
        typeof value === 'string' && value.trim() ? [[label, value.slice(0, 450)]] : []);
      const variantSpecs = (variant.description_override ?? '').split('\n').flatMap(line => {
        const [label, ...values] = line.split('\t');
        return values.length ? [[label, values.join(' ').slice(0, 450)]] : [];
      });
      return [{
        id: variant.id,
        name: variant.title_override || product.title_ar,
        aliases: [product.title_ar, variant.sku].filter(Boolean),
        price: variant.price_minor / 100,
        stock: Math.max(0, variant.stock_on_hand - variant.stock_reserved),
        specs: [...variantSpecs, ...specs].slice(0, 30),
        descriptions: [variant.description_override, product.description].filter(Boolean).map(value => value!.slice(0, 3000)),
      }];
    }) }, { headers });
  } catch {
    return Response.json({ error: 'تعذر تحميل كتالوج هومي دلوقتي.' }, { status: 503, headers });
  }
}
