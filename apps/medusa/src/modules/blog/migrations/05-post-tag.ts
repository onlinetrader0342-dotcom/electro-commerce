import { Migration } from "@mikro-orm/migrations";

export class PostTag1758796800005 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "post_tag" ("id" text not null, "post_id" text not null, "tag_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "post_tag_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "IDX_post_tag_unique" on "post_tag" ("post_id", "tag_id") where "deleted_at" is null;`,
    );
    this.addSql(
      `alter table "post_tag" add constraint "FK_post_tag_post" foreign key ("post_id") references "blog_post" ("id") on delete cascade not valid;`,
    );
    this.addSql(
      `alter table "post_tag" add constraint "FK_post_tag_tag" foreign key ("tag_id") references "blog_tag" ("id") on delete cascade not valid;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "post_tag" cascade;`);
  }
}
