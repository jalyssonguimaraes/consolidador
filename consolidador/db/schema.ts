// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable,text,integer,uniqueIndex } from 'drizzle-orm/sqlite-core';
export const notes=sqliteTable('notes',{id:text('id').primaryKey(),owner:text('owner').notNull(),sourceKey:text('source_key').notNull(),broker:text('broker').notNull(),date:text('date').notNull(),number:text('number').notNull(),payload:text('payload').notNull(),version:integer('version').notNull().default(1),updated:text('updated').notNull()},t=>[uniqueIndex('notes_owner_source').on(t.owner,t.sourceKey),uniqueIndex('notes_owner_document').on(t.owner,t.broker,t.date,t.number)]);
export const revisions=sqliteTable('revisions',{id:text('id').primaryKey(),owner:text('owner').notNull(),noteId:text('note_id').notNull(),payload:text('payload').notNull(),created:text('created').notNull()});
export const quotes=sqliteTable('quotes',{id:text('id').primaryKey(),owner:text('owner').notNull(),payload:text('payload').notNull(),updated:text('updated').notNull()});
export const assetEvents=sqliteTable('asset_events',{id:text('id').primaryKey(),owner:text('owner').notNull(),asset:text('asset').notNull(),kind:text('kind').notNull(),eventDate:text('event_date').notNull(),factor:text('factor'),label:text('label').notNull(),source:text('source'),notes:text('notes'),updated:text('updated').notNull()});
