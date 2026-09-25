import { Migration } from "@mikro-orm/migrations";

export class BlogTag1758796800003 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "blog_tag" ("id" text not null, "name" text not null, "slug" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_tag_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "IDX_blog_tag_slug" on "blog_tag" ("slug") where "deleted_at" is null;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "blog_tag" cascade;`);
  }
}
