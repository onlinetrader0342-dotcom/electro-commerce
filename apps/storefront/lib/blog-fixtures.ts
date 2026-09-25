import "server-only";
import type {
  BlogCategory,
  BlogListParams,
  BlogPost,
  BlogTag,
} from "./blog";

/**
 * Sample blog posts used when the Medusa blog module is unreachable.
 * Reads fall back here automatically (see lib/blog.ts); admin writes never
 * use fixtures. Content is in Roman Urdu, matching the store's audience.
 */

const AUTHOR = {
  id: "author_imran_store",
  name: "Imran Electric Store",
  avatar: null,
  bio: "Imran Electric Store ki team — bijli ke products ki khareedari me rehbari.",
};

export const FIXTURE_CATEGORIES: BlogCategory[] = [
  {
    id: "cat_buying_guides",
    name: "Buying Guides",
    slug: "buying-guides",
    description: "Bijli ke products khareedne se pehle jan'ne wali zaroori baatein.",
  },
  {
    id: "cat_solar_guides",
    name: "Solar Guides",
    slug: "solar-guides",
    description: "Solar panels, inverters aur batteries ke bare me maloomat.",
  },
  {
    id: "cat_led_lighting",
    name: "LED Lighting",
    slug: "led-lighting",
    description: "LED lights aur bulbs ke bare me guides.",
  },
];

export const FIXTURE_TAGS: BlogTag[] = [
  { id: "tag_inverter", name: "Inverter", slug: "inverter" },
  { id: "tag_solar_panel", name: "Solar Panel", slug: "solar-panel" },
  { id: "tag_led", name: "LED", slug: "led" },
  { id: "tag_ups", name: "UPS", slug: "ups" },
  { id: "tag_guide", name: "Guide", slug: "guide" },
];

const tag = (slug: string): BlogTag =>
  FIXTURE_TAGS.find((t) => t.slug === slug) ?? {
    id: `tag_${slug}`,
    name: slug,
    slug,
  };

const cat = (slug: string): BlogCategory =>
  FIXTURE_CATEGORIES.find((c) => c.slug === slug) ?? {
    id: `cat_${slug}`,
    name: slug,
    slug,
  };

export const BLOG_FIXTURES: BlogPost[] = [
  {
    id: "post_5kw_inverter",
    title: "5kW inverter kya hota hai?",
    slug: "5kw-inverter-kya-hota-hai",
    excerpt:
      "5kW inverter kitne load ko sambhal sakta hai, ghar ke liye kafi hai ya nahi, aur khareedte waqt kin baton ka khayal rakhein.",
    content: `## 5kW inverter kya hota hai?

**5kW (5000 watt) inverter** aik aisa device hai jo battery ya solar panels ki DC bijli ko ghar ke istemal wali AC bijli me badalta hai. 5kW ka matlab hai ke yeh aik waqt me **5000 watt tak ka load** chala sakta hai.

## Kitna load chala sakta hai?

Aam tor par 5kW inverter par yeh cheezein aik sath chal sakti hain:

- 8–10 LED bulbs
- 4–5 pankhe (ceiling fans)
- 1 fridge
- 1 LED TV
- Laptop/mobile charging

> **Note:** AC (air conditioner) chalane ke liye aam tor par 5kW se bara system chahiye hota hai, ya phir inverter AC hona chahiye.

## Khareedte waqt kya dekhein?

1. **Pure sine wave** output lazmi ho — sensitive electronics ke liye behtar hai.
2. **Warranty** kam az kam 1–2 saal ho.
3. **MPPT solar charger** built-in ho to solar panels lagana asaan ho jata hai.
4. Brand ka **service network** Pakistan me mojood ho.

## Nateeja

Agar aap ka ghar darmiyane load wala hai aur load shedding se nijat chahiye, to 5kW inverter aik behtareen intekhab hai. Neeche hum ne kuch recommended models diye hain.`,
    featuredImage: null,
    imageAlt: "5kW solar inverter",
    category: cat("buying-guides"),
    tags: [tag("inverter"), tag("guide")],
    author: AUTHOR,
    seoTitle: "5kW Inverter Kya Hota Hai? | Mukammal Guide",
    seoDescription:
      "5kW inverter kitne load par chalta hai, ghar ke liye munasib hai ya nahi — mukammal Roman Urdu guide.",
    canonicalUrl: null,
    ogImage: null,
    status: "published",
    publishedAt: "2026-09-01T10:00:00+05:00",
    scheduledAt: null,
    productLinks: [
      { productId: "prod-voltmax-hybrid-5kw", position: 1 },
      { productId: "prod-voltmax-ups-3kva", position: 2 },
    ],
    createdAt: "2026-09-01T10:00:00+05:00",
    updatedAt: "2026-09-10T10:00:00+05:00",
  },
  {
    id: "post_solar_panel_guide",
    title: "Solar panel choose karne ka tareeqa",
    slug: "solar-panel-choose-karne-ka-tareeqa",
    excerpt:
      "Mono vs poly, wattage, efficiency aur warranty — solar panel khareedne se pehle yeh 5 cheezein zaroor check karein.",
    content: `## Solar panel choose karne ka tareeqa

Solar panel lagana aik lambi muddat ki investment hai. Ghalat panel le liya to saalon tak nuksan hota hai. Yeh 5 nukte yaad rakhein:

## 1. Mono vs Poly

- **Mono (monocrystalline):** zyada efficient, kam jagah me zyada bijli. Aaj kal yehi standard hai.
- **Poly (polycrystalline):** sasta lekin kam efficient — ab market me kam milta hai.

**Mashwara:** Hamesha mono panel lein.

## 2. Wattage

Aam ghar ke liye **545W–580W** ke panels standard hain. Chhote 150W–200W panels sirf chhoti zarooriyat (1–2 pankhe) ke liye theek hain.

## 3. Efficiency

Panel ki efficiency **21% ya is se zyada** honi chahiye. Dabe par likhi efficiency check karein.

## 4. Warranty

- **Product warranty:** kam az kam 10–12 saal
- **Performance warranty:** 25 saal

## 5. Originality

Pakistan me naqli panels aam hain. Hamesha **authorized dealer** se khareedein aur QR/barcode verify karein.

## Khulasa

Mono panel, 545W+, 21%+ efficiency, 12 saal warranty — yeh formula yaad rakhein aur be-fikar ho kar khareedein.`,
    featuredImage: null,
    imageAlt: "Rooftop solar panels",
    category: cat("solar-guides"),
    tags: [tag("solar-panel"), tag("guide")],
    author: AUTHOR,
    seoTitle: "Solar Panel Choose Karne Ka Tareeqa | 5 Zaroori Nukte",
    seoDescription:
      "Solar panel khareedne se pehle mono vs poly, wattage, efficiency aur warranty — 5 zaroori nukte.",
    canonicalUrl: null,
    ogImage: null,
    status: "published",
    publishedAt: "2026-09-05T10:00:00+05:00",
    scheduledAt: null,
    productLinks: [{ productId: "prod-solarstar-550w-mono", position: 1 }],
    createdAt: "2026-09-05T10:00:00+05:00",
    updatedAt: "2026-09-05T10:00:00+05:00",
  },
  {
    id: "post_led_wattages",
    title: "LED bulb ki different wattages",
    slug: "led-bulb-wattages-guide",
    excerpt:
      "7W, 9W, 12W, 20W — har kamre ke liye konsi wattage theek hai? LED bulb wattage ka asaan guide.",
    content: `## LED bulb ki different wattages

Purane zamane me 100W ka bulb lagta tha. LED me wohi roshni **12W–15W** me mil jati hai. Lekin har kamre ke liye wattage alag honi chahiye.

## Kamra-wise guide

| Kamra | Recommended wattage |
|---|---|
| Bedroom | 7W – 9W |
| Drawing room | 12W – 15W |
| Kitchen | 12W |
| Bathroom | 7W |
| Sehan / gallery | 9W – 12W |
| Dukan / shop | 20W – 30W |

## Watt zyada = bijli zyada?

Ji haan, lekin LED itni efficient hai ke 12W ka LED bulb mahine me taqreeban **3–4 unit** bijli khata hai — purane bulb ke muqable me 80% bachat.

## Quality check

- **Lumens** dekhein, sirf watt nahi. 12W par 1100+ lumens achi quality hai.
- **1 saal warranty** lazmi lein.
- Sasta local bulb 2–3 mahine me fuse ho jata hai — branded lein.

## Nateeja

Ghar ke liye 9W–12W ka mix sab se munasib hai. Neeche recommended LED bulbs dekhein.`,
    featuredImage: null,
    imageAlt: "LED bulbs of different wattages",
    category: cat("led-lighting"),
    tags: [tag("led"), tag("guide")],
    author: AUTHOR,
    seoTitle: "LED Bulb Wattage Guide | Har Kamre Ke Liye Kitne Watt?",
    seoDescription:
      "7W se 30W tak — har kamre ke liye sahi LED bulb wattage ka asaan Roman Urdu guide.",
    canonicalUrl: null,
    ogImage: null,
    status: "published",
    publishedAt: "2026-09-08T10:00:00+05:00",
    scheduledAt: null,
    productLinks: [
      { productId: "prod-ostric-led-bulb-12w", position: 1 },
      { productId: "prod-ostric-panel-18w", position: 2 },
    ],
    createdAt: "2026-09-08T10:00:00+05:00",
    updatedAt: "2026-09-08T10:00:00+05:00",
  },
  {
    id: "post_inverter_vs_ups",
    title: "Inverter aur UPS mein farq",
    slug: "inverter-aur-ups-mein-farq",
    excerpt:
      "Inverter aur UPS aik jaise lagte hain lekin kaam mukhtalif hai. Janiye aap ke liye konsa behtar hai.",
    content: `## Inverter aur UPS mein farq

Dekhne me dono aik jaise dabbe lagte hain, lekin in ka kaam aur istemal mukhtalif hai.

## UPS (Uninterruptible Power Supply)

- **Maqsad:** bijli jate hi *foran* (zero switching time) backup dena
- **Istemaal:** computer, DVR, sensitive electronics
- **Backup time:** aam tor par 15–30 minute
- **Solar:** aam UPS me solar connect nahi hota

## Inverter

- **Maqsad:** lambe arse tak ghar ka load chalana
- **Istemaal:** pankhe, lights, fridge, TV
- **Backup time:** battery bank par munhasir — 4–8 ghante aam hai
- **Solar:** aksar built-in MPPT solar charger hota hai

## Aap ke liye konsa?

| Zaroorat | Behtar intekhab |
|---|---|
| Sirf computer backup | UPS |
| Poore ghar ka backup | Inverter |
| Solar lagana hai | Inverter (MPPT wala) |

## Aam ghalat fehmi

"UPS par fridge chala lein?" — **Nahi.** UPS chhote load ke liye bana hai; bara load lagane se battery aur UPS dono kharab ho jate hain.

## Nateeja

Ghar ke liye inverter, office desk ke liye UPS. Confusion ho to hum se rabta karein — sahi mashwara muft hai.`,
    featuredImage: null,
    imageAlt: "Inverter vs UPS comparison",
    category: cat("buying-guides"),
    tags: [tag("inverter"), tag("ups"), tag("guide")],
    author: AUTHOR,
    seoTitle: "Inverter Aur UPS Mein Farq | Konsa Behtar Hai?",
    seoDescription:
      "Inverter vs UPS — farq, istemal aur aap ke liye konsa behtar hai. Asaan Roman Urdu guide.",
    canonicalUrl: null,
    ogImage: null,
    status: "published",
    publishedAt: "2026-09-12T10:00:00+05:00",
    scheduledAt: null,
    productLinks: [{ productId: "prod-voltmax-ups-3kva", position: 1 }],
    createdAt: "2026-09-12T10:00:00+05:00",
    updatedAt: "2026-09-12T10:00:00+05:00",
  },
];

/** Apply BlogListParams filtering/sorting/pagination to fixtures. */
export function filterFixtures(params: BlogListParams = {}): {
  posts: BlogPost[];
  total: number;
} {
  const {
    status = "published",
    category,
    tag: tagSlug,
    search,
    limit = 12,
    offset = 0,
  } = params;

  let posts = [...BLOG_FIXTURES];
  if (status !== "all") posts = posts.filter((p) => p.status === status);
  if (category) posts = posts.filter((p) => p.category?.slug === category);
  if (tagSlug) posts = posts.filter((p) => p.tags.some((t) => t.slug === tagSlug));
  if (search) {
    const q = search.toLowerCase();
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q),
    );
  }
  posts.sort((a, b) =>
    (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt),
  );
  const total = posts.length;
  return { posts: posts.slice(offset, offset + limit), total };
}

export function fixtureBySlug(slug: string): BlogPost | null {
  return BLOG_FIXTURES.find((p) => p.slug === slug) ?? null;
}
