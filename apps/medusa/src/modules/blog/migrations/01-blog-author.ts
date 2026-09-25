import { Migration } from "@mikro-orm/migrations";

export class BlogAuthor1758796800001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "blog_author" ("id" text not null, "name" text not null, "bio" text null, "avatar" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_author_pkey" primary key ("id"));`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "blog_author" cascade;`);
  }
}
