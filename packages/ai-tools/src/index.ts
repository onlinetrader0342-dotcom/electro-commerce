/**
 * AI-agent tool definitions for electro-commerce.
 *
 * DESIGN — transport-agnostic core:
 *
 *   1. Each tool is a plain object: { name, description, inputSchema, handler }.
 *   2. The handler receives an injected `ProductService` — it never imports
 *      Medusa, HTTP, or any protocol SDK. That means the SAME tool set can be
 *      exposed over:
 *        - REST today  (apps/storefront app/api/ai/v1/* — scope: ai:read)
 *        - MCP later   (wrap each tool as an MCP tool — no core changes)
 *        - ACP / UCP later (wrap the router — no core changes)
 *   3. Only SAFE, READ-ONLY discovery tools live here. Transactional tools
 *      (create_cart, add_to_cart, checkout…) are intentionally absent: they
 *      belong to a separate, explicitly-authorized commerce-action layer with
 *      per-user auth, never a shared AI key.
 *   4. Handlers only ever return public product data (AiProduct / AiSearchResult).
 *      Customer PII can never leak through these tools — the types forbid it.
 */
import { z } from "zod";
import type {
  AiProduct,
  AiSearchParams,
  AiSearchResult,
  Category,
  InventoryStatus,
  Money,
  Product,
} from "@electro-commerce/types";

/* ── Injected service interface ───────────────────────────── */

/**
 * Implemented once per deployment (e.g. a Medusa-backed adapter in
 * apps/storefront or a future MCP server). Tools stay pure.
 */
export interface ProductService {
  searchProducts(params: AiSearchParams): Promise<AiSearchResult>;
  getProduct(id: string): Promise<AiProduct | null>;
  getProductDetails(id: string): Promise<Product | null>;
  searchCategories(query?: string): Promise<Category[]>;
  checkInventory(productId: string): Promise<InventoryStatus>;
  getPrice(productId: string): Promise<{ price: Money; salePrice?: Money } | null>;
  getRelatedProducts(productId: string, limit?: number): Promise<AiProduct[]>;
}

/* ── Tool shape ───────────────────────────────────────────── */

export interface AiTool<TInput, TOutput> {
  name: string;
  description: string;
  /** Zod schema — validates input AND documents the tool for any protocol. */
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  outputSchema?: z.ZodType<TOutput, z.ZodTypeDef, unknown>;
  handler: (service: ProductService, input: TInput) => Promise<TOutput>;
}

/* ── Schemas ──────────────────────────────────────────────── */

const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

const AiProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  brand: z.string().optional(),
  model: z.string().optional(),
  price: MoneySchema,
  salePrice: MoneySchema.optional(),
  availability: z.enum(["in_stock", "low_stock", "out_of_stock", "preorder"]),
  image: z.string().optional(),
  url: z.string(),
  specifications: z.record(z.string()),
  shortDescription: z.string().optional(),
});

export const SearchProductsInput = z.object({
  query: z.string().min(1).optional().describe("Keywords, e.g. '5kW inverter'"),
  category: z.string().optional().describe("Category slug, e.g. 'inverters'"),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  inStockOnly: z.boolean().default(false),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).default("relevance"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});
export type SearchProductsInput = z.infer<typeof SearchProductsInput>;

export const SearchProductsOutput = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  products: z.array(AiProductSchema),
});
export type SearchProductsOutput = z.infer<typeof SearchProductsOutput>;

export const ProductIdInput = z.object({
  productId: z.string().min(1).describe("Medusa product id"),
});
export type ProductIdInput = z.infer<typeof ProductIdInput>;

export const SearchCategoriesInput = z.object({
  query: z.string().optional().describe("Optional keyword filter"),
});
export type SearchCategoriesInput = z.infer<typeof SearchCategoriesInput>;

export const RelatedProductsInput = z.object({
  productId: z.string().min(1),
  limit: z.number().int().min(1).max(20).default(6),
});
export type RelatedProductsInput = z.infer<typeof RelatedProductsInput>;

/* ── Tools ────────────────────────────────────────────────── */

export const searchProductsTool: AiTool<SearchProductsInput, SearchProductsOutput> = {
  name: "search_products",
  description:
    "Search the product catalog by keywords, category, brand and price range. " +
    "Example: '5kW inverter' or available LED bulbs under Rs. 2000. " +
    "Returns product id, name, price, availability, image, URL and specs.",
  inputSchema: SearchProductsInput,
  outputSchema: SearchProductsOutput,
  handler: async (service, input) => {
    const result = await service.searchProducts(input);
    return {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      products: result.products,
    };
  },
};

export const getProductTool: AiTool<ProductIdInput, { product: unknown }> = {
  name: "get_product",
  description:
    "Get the compact AI-friendly projection of one product: id, name, sku, " +
    "brand, model, price, availability, image, URL and specifications.",
  inputSchema: ProductIdInput,
  handler: async (service, { productId }) => ({
    product: await service.getProduct(productId),
  }),
};

export const getProductDetailsTool: AiTool<ProductIdInput, { product: unknown }> = {
  name: "get_product_details",
  description:
    "Get full public product details: description, images, variants, " +
    "specifications, attributes, warranty, dimensions and related products. " +
    "Use when the customer asks detailed questions about a product.",
  inputSchema: ProductIdInput,
  handler: async (service, { productId }) => ({
    product: await service.getProductDetails(productId),
  }),
};

export const searchCategoriesTool: AiTool<SearchCategoriesInput, { categories: Category[] }> = {
  name: "search_categories",
  description:
    "List product categories (and subcategories). Use to discover what the " +
    "store sells, e.g. inverters, solar panels, batteries, LED lights.",
  inputSchema: SearchCategoriesInput,
  handler: async (service, { query }) => ({
    categories: await service.searchCategories(query),
  }),
};

export const checkInventoryTool: AiTool<ProductIdInput, { inventory: InventoryStatus }> = {
  name: "check_inventory",
  description:
    "Check live stock for a product: quantity on hand and availability " +
    "(in_stock / low_stock / out_of_stock / preorder).",
  inputSchema: ProductIdInput,
  handler: async (service, { productId }) => ({
    inventory: await service.checkInventory(productId),
  }),
};

export const getPriceTool: AiTool<ProductIdInput, { price: unknown }> = {
  name: "get_price",
  description:
    "Get the current sell price (and sale price if a promotion applies) for " +
    "a product. Prices are always server-computed — never trust client input.",
  inputSchema: ProductIdInput,
  handler: async (service, { productId }) => ({
    price: await service.getPrice(productId),
  }),
};

export const getRelatedProductsTool: AiTool<RelatedProductsInput, { products: AiProduct[] }> = {
  name: "get_related_products",
  description:
    "Get products related to a given product (same category / complementary " +
    "items, e.g. batteries for an inverter). Useful for recommendations.",
  inputSchema: RelatedProductsInput,
  handler: async (service, { productId, limit }) => ({
    products: await service.getRelatedProducts(productId, limit),
  }),
};

/** All read-only discovery tools, in a stable order. */
export const AI_TOOLS: AiTool<unknown, unknown>[] = [
  searchProductsTool as AiTool<unknown, unknown>,
  getProductTool as AiTool<unknown, unknown>,
  getProductDetailsTool as AiTool<unknown, unknown>,
  searchCategoriesTool as AiTool<unknown, unknown>,
  checkInventoryTool as AiTool<unknown, unknown>,
  getPriceTool as AiTool<unknown, unknown>,
  getRelatedProductsTool as AiTool<unknown, unknown>,
];

/* ── Transport-agnostic router ────────────────────────────── */

/**
 * Bind the tool set to a concrete ProductService once; any transport
 * (REST route, MCP server, ACP/UCP adapter) then calls:
 *
 *   router.listTools()            → [{ name, description, inputSchema }]
 *   router.execute("search_products", {...}) → validated output
 *
 * Adding MCP/ACP/UCP later = writing a thin adapter over this router.
 * The tools and the service interface do not change.
 */
export interface AiToolRouter {
  listTools(): Array<{
    name: string;
    description: string;
    inputSchema: z.ZodType<unknown, z.ZodTypeDef, unknown>;
  }>;
  execute<T = unknown>(name: string, rawInput: unknown): Promise<T>;
}

export function createAiToolRouter(service: ProductService): AiToolRouter {
  const byName = new Map(AI_TOOLS.map((t) => [t.name, t]));
  return {
    listTools: () =>
      AI_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as z.ZodType<unknown, z.ZodTypeDef, unknown>,
      })),
    execute: async <T = unknown>(name: string, rawInput: unknown): Promise<T> => {
      const tool = byName.get(name);
      if (!tool) throw new Error(`Unknown AI tool: ${name}`);
      const input = tool.inputSchema.parse(rawInput);
      return (await tool.handler(service, input)) as T;
    },
  };
}
