import { Migration } from "@mikro-orm/migrations";

export class AiApiKey1758796800101 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "ai_api_key" ("id" text not null, "name" text not null, "key_hash" text not null, "prefix" text not null, "scopes" jsonb not null, "rate_limit_per_min" integer not null default 60, "is_active" boolean not null default true, "last_used_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_api_key_pkey" primary key ("id"));`,
    );
    this.addSql(
      `create unique index if not exists "IDX_ai_api_key_hash" on "ai_api_key" ("key_hash") where "deleted_at" is null;`,
    );
    this.addSql(
      `create index if not exists "IDX_ai_api_key_prefix" on "ai_api_key" ("prefix") where "deleted_at" is null;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "ai_api_key" cascade;`);
  }
}
