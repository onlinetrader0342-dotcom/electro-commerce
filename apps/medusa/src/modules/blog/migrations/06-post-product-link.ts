import { Migration } from "@mikro-orm/migrations";

export class PostProductLink1758796800006 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "post_product_link" ("id" text not null, "post_id" text not null, "medusa_product_id" text not null, "position" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "post_product_link_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create index if not exists "IDX_post_product_link_post" on "post_product_link" ("post_id", "position") where "deleted_at" is null;`,
    );
    this.addSql(
      `alter table "post_product_link" add constraint "FK_post_product_link_post" foreign key ("post_id") references "blog_post" ("id") on delete cascade not valid;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "post_product_link" cascade;`);
  }
}
