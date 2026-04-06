import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('queued'),
  targetDuration: real('target_duration').notNull(),
  outputPath: text('output_path'),
  errorMessage: text('error_message'),
  progress: integer('progress').default(0),
  progressPhase: text('progress_phase').default('queued'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

export const uploadedFiles = sqliteTable('uploaded_files', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => jobs.id),
  path: text('path').notNull(),
  filename: text('filename').notNull(),
  duration: real('duration').notNull(),
  size: integer('size').notNull(),
})
