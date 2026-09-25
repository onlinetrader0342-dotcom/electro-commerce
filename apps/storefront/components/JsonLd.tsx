/**
 * Renders a JSON-LD <script> tag for structured data (SEO).
 * Pass plain serializable objects from lib/seo.ts builders.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
