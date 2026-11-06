import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
// Public game data only. Personal records require a separate identity/access design.
export const games = sqliteTable('games', {
 steamAppId: integer('steam_app_id').primaryKey(), name: text('name').notNull(),
 productType: text('product_type'), parentAppId: integer('parent_app_id'), updatedAt: integer('updated_at').notNull()
});
export const gameSources = sqliteTable('game_sources', {
 id: text('id').primaryKey(), steamAppId: integer('steam_app_id').notNull().references(()=>games.steamAppId),
 provider: text('provider').notNull(), externalId: text('external_id').notNull(),
 fetchedAt: integer('fetched_at').notNull(), expiresAt: integer('expires_at').notNull(),
 schemaVersion: integer('schema_version').notNull(), payloadJson: text('payload_json').notNull()
}, t=>[uniqueIndex('source_identity').on(t.provider,t.externalId),index('source_game').on(t.steamAppId)]);
// Extensible observations: gameplay, presentation, playtime, review/popularity,
// regional prices, compatibility, relationships, release/update history.
export const observations = sqliteTable('game_observations', {
 id: text('id').primaryKey(), steamAppId: integer('steam_app_id').notNull().references(()=>games.steamAppId),
 category: text('category').notNull(), provider: text('provider').notNull(),
 method: text('method').notNull(), methodVersion: text('method_version').notNull(),
 scope: text('scope').notNull(), observedAt: integer('observed_at').notNull(),
 expiresAt: integer('expires_at'), sampleCount: integer('sample_count'),
 payloadJson: text('payload_json').notNull()
},t=>[index('observation_lookup').on(t.steamAppId,t.category,t.observedAt)]);
export const apiCache = sqliteTable('api_cache', {
 cacheKey:text('cache_key').primaryKey(), kind:text('kind').notNull(),
 body:text('body'), fetchedAt:integer('fetched_at'), expiresAt:integer('expires_at').notNull().default(0),
 retryAt:integer('retry_at').notNull().default(0), errorCode:text('error_code'),
 failureCount:integer('failure_count').notNull().default(0), lastFailureAt:integer('last_failure_at'), errorSource:text('error_source'),
 leaseToken:text('lease_token'), leaseUntil:integer('lease_until').notNull().default(0)
},t=>[index('cache_expiry').on(t.expiresAt)]);
export const apiQuota = sqliteTable('api_quota', {
 scope:text('scope').primaryKey(), windowStart:integer('window_start').notNull(),
 used:integer('used').notNull(), cooldownUntil:integer('cooldown_until').notNull().default(0)
});
