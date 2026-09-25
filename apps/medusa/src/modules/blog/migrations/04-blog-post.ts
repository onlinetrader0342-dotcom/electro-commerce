import { Migration } from "@mikro-orm/migrations";

export class BlogPost1758796800004 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "blog_post" ("id" text not null, "title" text not null, "slug" text not null, "excerpt" text null, "content" text not null, "status" text not null default 'draft', "published_at" timestamptz null, "seo_title" text null, "seo_description" text null, "canonical_url" text null, "og_image" text null, "featured_image" text null, "image_alt" text null, "author_id" text null, "category_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_post_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "IDX_blog_post_slug" on "blog_post" ("slug") where "deleted_at" is null;`,
    );
    this.addSql(
      `create index if not exists "IDX_blog_post_status" on "blog_post" ("status") where "deleted_at" is null;`,
    );
    this.addSql(
      `alter table "blog_post" add constraint "FK_blog_post_author" foreign key ("author_id") references "blog_author" ("id") on delete set null not valid;`,
    );
    this.addSql(
      `alter table "blog_post" add constraint "FK_blog_post_category" foreign key ("category_id") references "blog_category" ("id") on delete set null not valid;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "blog_post" cascade;`);
  }
}
