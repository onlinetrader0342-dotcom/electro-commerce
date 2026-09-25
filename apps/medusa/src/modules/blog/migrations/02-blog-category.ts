import { Migration } from "@mikro-orm/migrations";

export class BlogCategory1758796800002 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "blog_category" ("id" text not null, "name" text not null, "slug" text not null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_category_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "IDX_blog_category_slug" on "blog_category" ("slug") where "deleted_at" is null;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "blog_category" cascade;`);
  }
}
