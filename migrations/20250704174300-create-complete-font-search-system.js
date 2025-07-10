'use strict';

// Constants for tables and their relationships
const TABLES = {
    // System tables
    SEARCH_INDEX: 'nvn_font_search',
    QUEUE: 'nvn_font_update_queue',
    // Core tables
    FONTS: 'nvn_fonts',
    CATEGORIES: 'nvn_categories', 
    TAGS: 'nvn_tags',
    USERS: 'nvn_users',
    FILES: 'nvn_files',
    FONT_WEIGHTS: 'nvn_font_weights',
    
    // Linking tables
    FONT_CATEGORIES: 'nvn_font_categories',
    FONT_TAGS: 'nvn_font_tags'
};

// Create arrays after constants are defined - define as separate constants
const TABLE_ARRAYS = {
    ALL_TRIGGER_TABLES: [TABLES.FONTS, TABLES.FONT_CATEGORIES, TABLES.FONT_TAGS, TABLES.FONT_WEIGHTS, TABLES.CATEGORIES, TABLES.TAGS, TABLES.USERS, TABLES.FILES],
    LINKING_TABLES: [TABLES.FONT_CATEGORIES, TABLES.FONT_TAGS, TABLES.FONT_WEIGHTS],
    MASTER_TABLES: [TABLES.CATEGORIES, TABLES.TAGS, TABLES.USERS, TABLES.FILES]
};


// Constants for functions
const FUNCTIONS = {
    UPSERT_FONT_SEARCH_INDEX: 'nvn_upsert_font_search_index',
    QUEUE_SINGLE_FONT_UPDATE: 'nvn_queue_single_font_update',
    QUEUE_LINKING_TABLE_UPDATE: 'nvn_queue_linking_table_update', 
    QUEUE_MASTER_TABLE_UPDATE: 'nvn_queue_master_table_update',
    NOTIFY_NEW_QUEUE_TASK: 'nvn_notify_new_queue_task',
    PROCESS_QUEUE_ENHANCED: 'nvn_process_font_update_queue_enhanced',
    GET_QUEUE_HEALTH: 'nvn_get_queue_health',
    CLEANUP_FAILED_TASKS: 'nvn_cleanup_failed_tasks',
    RUN_QUEUE_PROCESSOR: 'nvn_run_queue_processor',
    EMERGENCY_QUEUE_RESET: 'nvn_emergency_queue_reset'
};

// Constants for triggers
const TRIGGERS = {
    QUEUE_UPDATE: 'nvn_trigger_queue_update',
    NOTIFY_NEW_TASK: 'nvn_trigger_notify_new_task'
};

// Constants for task types
const TASK_TYPES = {
    SINGLE_FONT_UPDATE: 'SINGLE_FONT_UPDATE',
    RESYNC_BY_CATEGORY: 'RESYNC_BY_CATEGORY',
    RESYNC_BY_TAG: 'RESYNC_BY_TAG',
    RESYNC_BY_USER: 'RESYNC_BY_USER',
    RESYNC_BY_FILE: 'RESYNC_BY_FILE',
    RESYNC_BY_FONT_WEIGHT: 'RESYNC_BY_FONT_WEIGHT'
};

// Constants for operations
const OPERATIONS = {
    UPSERT: 'upsert',
    DELETE: 'delete'
};

// Constants for trigger operations
const TRIGGER_OPS = {
    DELETE: 'DELETE',
    INSERT: 'INSERT',
    UPDATE: 'UPDATE'
};

// Constants for legacy function names (for cleanup purposes)
const LEGACY_FUNCTIONS = {
    QUEUE_FONT_UPDATE_FROM_MASTER: 'nvn_queue_font_update_from_master',
    PROCESS_FONT_UPDATE_QUEUE: 'nvn_process_font_update_queue',
    PROCESS_FONT_UPDATE_QUEUE_ENHANCED: 'nvn_process_font_update_queue_enhanced',
    QUEUE_FONT_UPDATE: 'nvn_queue_font_update',
    QUEUE_FONT_UPDATE_FROM_LINKING: 'nvn_queue_font_update_from_linking',
    QUEUE_FONT_UPDATE_ON_CHANGE: 'nvn_queue_font_update_on_change',
    QUEUE_RESYNC_BY_CATEGORY: 'nvn_queue_resync_by_category',
    QUEUE_RESYNC_BY_TAG: 'nvn_queue_resync_by_tag'
};

// Constants for system values
const SYSTEM_VALUES = {
    DEFAULT_CREATOR: 'system',
    TRIGGER_FONTS_CREATOR: 'nvn_trigger_fonts',
    WORKER_PREFIX: 'nvn_worker-',
    EMERGENCY_RESET_ERROR: 'nvn_Emergency reset',
    AUTO_RESET_ERROR: 'nvn_Task stuck in processing state - auto-reset'
};

// Constants for health status
const HEALTH_STATUS = {
    HEALTHY: 'healthy',
    GOOD: 'good',
    BUSY: 'busy',
    OVERLOADED: 'overloaded',
    CRITICAL: 'critical'
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        console.log('=== DEPLOYING PRODUCTION-READY FONT SEARCH SYSTEM ===');
        console.log(`🚀 Started at: ${new Date().toISOString()}`);
        console.log(`👤 Deployed by: Nam077`);

        try {
            // --- PHASE 1: AGGRESSIVE CLEANUP ---
            console.log('\n📋 Phase 1: Aggressive cleanup of existing objects...');
            
            // Drop all triggers first
            for (const table of TABLE_ARRAYS.ALL_TRIGGER_TABLES) {
                try {
                    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS ${TRIGGERS.QUEUE_UPDATE} ON ${table};`);
                } catch (e) {
                    console.log(`   ⚠️ Trigger cleanup: ${e.message.split('\n')[0]}`);
                }
            }

            // Force drop all functions with CASCADE
            const functionsToCleanup = [
                // Legacy function names for cleanup
                ...Object.values(LEGACY_FUNCTIONS),
                // Add all current function names to ensure cleanup
                ...Object.values(FUNCTIONS)
            ];

            for (const funcName of functionsToCleanup) {
                try {
                    // Drop function with all possible signatures
                    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${funcName}() CASCADE;`);
                    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${funcName}(integer) CASCADE;`);
                    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${funcName}(uuid[]) CASCADE;`);
                    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${funcName}(text) CASCADE;`);
                    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${funcName}(text, uuid) CASCADE;`);
                } catch (e) {
                    // Silently continue - function might not exist
                }
            }
            // drop table search table
            await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${TABLES.SEARCH_INDEX} CASCADE;`);

            // Drop tables
            await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${TABLES.QUEUE} CASCADE;`);
            
            console.log('✅ Aggressive cleanup completed');

            // --- PHASE 2: CREATE ENHANCED QUEUE TABLE ---
            console.log('\n📋 Phase 2: Creating enhanced queue table...');
            
            await queryInterface.sequelize.query(`
                CREATE TABLE ${TABLES.QUEUE} (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    
                    -- Task Definition
                    task_type text NOT NULL,
                    font_id uuid,
                    target_id uuid,
                    operation text NOT NULL DEFAULT '${OPERATIONS.UPSERT}',
                    
                    -- Priority & Scheduling
                    priority integer NOT NULL DEFAULT 0,
                    estimated_fonts integer DEFAULT 1,
                    queued_at timestamptz NOT NULL DEFAULT now(),
                    
                    -- Processing State
                    processing boolean NOT NULL DEFAULT false,
                    started_at timestamptz,
                    completed_at timestamptz,
                    worker_id text,
                    processing_time_ms integer,
                    
                    -- Error Handling
                    retry_count integer DEFAULT 0,
                    max_retries integer DEFAULT 3,
                    last_error text,
                    error_details jsonb,
                    
                    -- Metadata
                    metadata jsonb DEFAULT '{}',
                    created_by text DEFAULT '${SYSTEM_VALUES.DEFAULT_CREATOR}',
                    
                    -- Constraints
                    CONSTRAINT chk_task_payload CHECK (
                        (task_type = '${TASK_TYPES.SINGLE_FONT_UPDATE}' AND font_id IS NOT NULL) OR
                        (task_type != '${TASK_TYPES.SINGLE_FONT_UPDATE}' AND target_id IS NOT NULL)
                    ),
                    CONSTRAINT chk_priority_range CHECK (priority >= 0 AND priority <= 10),
                    CONSTRAINT chk_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
                );
            `);

            // --- PHASE 3: CREATE SEARCH INDEX TABLE ---
            console.log('\n📋 Phase 3: Creating search index table...');
            
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS ${TABLES.SEARCH_INDEX} (
                    id uuid PRIMARY KEY,
                    name text,
                    slug text,
                    authors jsonb,
                    description text,
                    "fontType" text,
                    price numeric(10, 2),
                    "downloadCount" integer,
                    "isActive" boolean,
                    "isSupportVietnamese" boolean,
                    metadata jsonb,
                    "createdAt" timestamptz,
                    "updatedAt" timestamptz,
                    "thumbnailUrl" text,
                    "previewText" text,
                    "galleryImages" jsonb,
                    "creatorId" uuid,
                    "thumbnailFileId" uuid,
                    creator jsonb,
                    "thumbnailFile" jsonb,
                    categories jsonb,
                    tags jsonb,
                    weights jsonb,
                    "weightCount" bigint,
                    "categoryIds" uuid[],
                    "tagIds" uuid[],
                    "weightIds" uuid[],
                    document tsvector,
                    "deletedAt" timestamptz, -- Add deletedAt column
                    last_updated timestamptz DEFAULT now()
                );
            `);

            // --- PHASE 4: CREATE OPTIMIZED INDEXES ---
            console.log('\n📋 Phase 4: Creating optimized indexes...');
            
            // Drop indexes explicitly to be safe from any previous state
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_${TABLES.QUEUE}_unique_single_font;`);
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_${TABLES.QUEUE}_unique_aggregate_task;`);
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS uq_queue_single_font_task;`);
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS uq_queue_aggregate_task;`);

            const indexes = [
                // Queue table indexes - Explicitly named constraints to resolve ON CONFLICT ambiguity
                `CREATE UNIQUE INDEX uq_queue_single_font_task
                 ON ${TABLES.QUEUE} (font_id) 
                 WHERE task_type = '${TASK_TYPES.SINGLE_FONT_UPDATE}' AND NOT processing`,
                
                `CREATE UNIQUE INDEX uq_queue_aggregate_task
                 ON ${TABLES.QUEUE} (task_type, target_id) 
                 WHERE task_type != '${TASK_TYPES.SINGLE_FONT_UPDATE}' AND NOT processing`,
                
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.QUEUE}_priority_queue 
                 ON ${TABLES.QUEUE} (priority DESC, retry_count ASC, queued_at ASC) 
                 WHERE NOT processing AND retry_count < max_retries`,
                
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.QUEUE}_processing_state 
                 ON ${TABLES.QUEUE} (processing, started_at) 
                 WHERE processing = true`,
                
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.QUEUE}_failed_tasks 
                 ON ${TABLES.QUEUE} (retry_count, queued_at) 
                 WHERE retry_count >= max_retries`,
                
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.QUEUE}_task_type 
                 ON ${TABLES.QUEUE} (task_type, priority DESC)`,
                
                // Search index table indexes
                `CREATE UNIQUE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_id ON ${TABLES.SEARCH_INDEX} (id)`,
                `CREATE INDEX IF NOT EXISTS idx_gin_${TABLES.SEARCH_INDEX}_document ON ${TABLES.SEARCH_INDEX} USING GIN(document)`,
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_category_ids ON ${TABLES.SEARCH_INDEX} USING GIN("categoryIds")`,
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_tag_ids ON ${TABLES.SEARCH_INDEX} USING GIN("tagIds")`,
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_weight_ids ON ${TABLES.SEARCH_INDEX} USING GIN("weightIds")`,
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_is_active ON ${TABLES.SEARCH_INDEX} ("isActive")`,
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_created_at ON ${TABLES.SEARCH_INDEX} ("createdAt")`,
                `CREATE INDEX IF NOT EXISTS idx_${TABLES.SEARCH_INDEX}_last_updated ON ${TABLES.SEARCH_INDEX} (last_updated)`
            ];

            for (let i = 0; i < indexes.length; i++) {
                try {
                    await queryInterface.sequelize.query(indexes[i]);
                    console.log(`   ✅ Index ${i + 1}/${indexes.length} created`);
                } catch (e) {
                    console.log(`   ⚠️ Index ${i + 1}/${indexes.length} warning: ${e.message.split('\n')[0]}`);
                }
            }
            
            // --- PHASE 5: CREATE CORE UPSERT FUNCTION (NO DELETED_AT) ---
            console.log('\n📋 Phase 5: Creating optimized upsert function...');
            
            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.UPSERT_FONT_SEARCH_INDEX}(p_font_ids uuid[])
                RETURNS integer LANGUAGE plpgsql AS $$
                DECLARE
                    batch_size constant integer := 200;
                    current_batch uuid[];
                    i integer;
                    total_processed integer := 0;
                    start_time timestamp := clock_timestamp();
                BEGIN
                    IF p_font_ids IS NULL OR array_length(p_font_ids, 1) = 0 THEN 
                        RETURN 0; 
                    END IF;
                    
                    IF array_length(p_font_ids, 1) > 1000 THEN
                        RAISE NOTICE 'Starting bulk upsert for % fonts...', array_length(p_font_ids, 1);
                    END IF;

                    FOR i IN 1..array_length(p_font_ids, 1) BY batch_size LOOP
                        current_batch := p_font_ids[i:LEAST(i + batch_size - 1, array_length(p_font_ids, 1))];
                        
                        WITH
                        resolved_gallery_data AS (
                            SELECT
                                f.id as font_id,
                                CASE
                                    -- If galleryImages is null or empty array, return empty array
                                    WHEN f."galleryImages" IS NULL OR jsonb_array_length(f."galleryImages") = 0 THEN
                                        '[]'::jsonb
                                    -- If galleryImages has content, process it
                                    ELSE
                                        COALESCE(jsonb_agg(
                                            CASE
                                                -- If it's an entity type and we found a matching file, update the url
                                                WHEN (image_element->>'type') = 'entity' AND fi.id IS NOT NULL THEN
                                                    jsonb_set(
                                                        image_element,
                                                        '{url}',
                                                        to_jsonb(COALESCE(fi."cdnUrl", fi.url))
                                                    )
                                                -- Otherwise (it's 'url' type or the file was not found), keep the original element
                                                ELSE
                                                    image_element
                                            END
                                        ) FILTER (WHERE image_element IS NOT NULL), '[]'::jsonb)
                                END as "galleryImages"
                            FROM
                                ${TABLES.FONTS} f
                            -- Use a LATERAL join to safely unnest, only when galleryImages is not empty
                            LEFT JOIN LATERAL jsonb_array_elements(f."galleryImages") AS image_element ON 
                                f."galleryImages" IS NOT NULL AND jsonb_array_length(f."galleryImages") > 0
                            -- Join to files table only for entity types
                            LEFT JOIN ${TABLES.FILES} fi ON (image_element->>'type') = 'entity' AND (fi.id = (image_element->>'fileId')::uuid) AND fi."deletedAt" IS NULL
                            WHERE f.id = ANY(current_batch)
                            GROUP BY f.id, f."galleryImages"
                        ),
                        font_data AS (
                            SELECT DISTINCT f.id 
                            FROM ${TABLES.FONTS} f 
                            WHERE f.id = ANY(current_batch)
                        ),
                        aggregated_data AS (
                            SELECT
                                f.id, f.name, f.slug, f.authors, f.description, f."fontType", 
                                f.price, f."downloadCount", f."isActive", f."isSupportVietnamese", 
                                f.metadata, f."createdAt", f."updatedAt", f."deletedAt", f."thumbnailUrl", -- Select deletedAt
                                f."previewText", rgi."galleryImages", f."creatorId", f."thumbnailFileId",
                                
                                -- Creator info
                                CASE
                                    WHEN u.id IS NOT NULL THEN
                                        jsonb_build_object(
                                            'id', u.id, 
                                            'firstName', u."firstName", 
                                            'lastName', u."lastName",
                                            'email', u.email
                                        )
                                    ELSE '{}'::jsonb
                                END as creator,
                                
                                -- Thumbnail file info
                                CASE
                                    WHEN fi.id IS NOT NULL THEN
                                        jsonb_build_object(
                                            'id', fi.id, 
                                            'url', COALESCE(fi."cdnUrl", fi.url)
                                        )
                                    ELSE '{}'::jsonb
                                END as "thumbnailFile",
                                
                                -- Categories aggregation
                                COALESCE(
                                    jsonb_agg(DISTINCT jsonb_build_object(
                                        'id', c.id, 
                                        'name', c.name, 
                                        'slug', c.slug,
                                        'description', c.description
                                    )) FILTER (WHERE c.id IS NOT NULL), 
                                    '[]'::jsonb
                                ) AS categories,
                                
                                -- Tags aggregation
                                COALESCE(
                                    jsonb_agg(DISTINCT jsonb_build_object(
                                        'id', t.id, 
                                        'name', t.name, 
                                        'slug', t.slug,
                                        'description', t.description
                                    )) FILTER (WHERE t.id IS NOT NULL), 
                                    '[]'::jsonb
                                ) AS tags,
                                
                                -- Weights aggregation
                                COALESCE(
                                    jsonb_agg(DISTINCT jsonb_build_object(
                                        'id', fw.id, 
                                        'name', fw."weightName", 
                                        'weight', fw."weightValue"
                                    )) FILTER (WHERE fw.id IS NOT NULL), 
                                    '[]'::jsonb
                                ) AS weights,
                                
                                COUNT(DISTINCT fw.id) AS "weightCount",
                                COALESCE(array_agg(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL), '{}'::uuid[]) AS "categoryIds",
                                COALESCE(array_agg(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL), '{}'::uuid[]) AS "tagIds",
                                COALESCE(array_agg(DISTINCT fw.id) FILTER (WHERE fw.id IS NOT NULL), '{}'::uuid[]) AS "weightIds",
                                
                                -- Full-text search document
                                to_tsvector('simple',
                                    COALESCE(f.name, '') || ' ' || 
                                    COALESCE(f.description, '') || ' ' || 
                                    COALESCE(f."previewText", '') || ' ' ||
                                    COALESCE((SELECT string_agg(author->>'name', ' ') FROM jsonb_array_elements(f.authors) as author), '') || ' ' ||
                                    COALESCE(string_agg(DISTINCT c.name, ' '), '') || ' ' ||
                                    COALESCE(string_agg(DISTINCT t.name, ' '), '') || ' ' ||
                                    COALESCE(string_agg(DISTINCT fw."weightName", ' '), '') || ' ' ||
                                    COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')
                                ) as document
                                
                            FROM font_data fd
                            JOIN ${TABLES.FONTS} f ON f.id = fd.id
                            LEFT JOIN resolved_gallery_data rgi ON rgi.font_id = f.id
                            LEFT JOIN ${TABLES.FONT_CATEGORIES} fc ON f.id = fc."fontId"
                            LEFT JOIN ${TABLES.CATEGORIES} c ON fc."categoryId" = c.id AND c."isActive" = true AND c."deletedAt" IS NULL
                            LEFT JOIN ${TABLES.FONT_TAGS} ft ON f.id = ft."fontId"
                            LEFT JOIN ${TABLES.TAGS} t ON ft."tagId" = t.id AND t."isActive" = true AND t."deletedAt" IS NULL
                            LEFT JOIN ${TABLES.FONT_WEIGHTS} fw ON f.id = fw."fontId" AND fw."isActive" = true AND fw."deletedAt" IS NULL
                            LEFT JOIN ${TABLES.USERS} u ON f."creatorId" = u.id AND u."isActive" = true AND u."deletedAt" IS NULL
                            LEFT JOIN ${TABLES.FILES} fi ON f."thumbnailFileId" = fi.id AND fi."deletedAt" IS NULL
                            GROUP BY f.id, f.name, f.slug, f.authors, f.description, f."fontType", 
                                     f.price, f."downloadCount", f."isActive", f."isSupportVietnamese", 
                                     f.metadata, f."createdAt", f."updatedAt", f."deletedAt", f."thumbnailUrl", -- Group by deletedAt
                                     f."previewText", rgi."galleryImages", f."creatorId", f."thumbnailFileId", u.id, fi.id
                        )
                        INSERT INTO ${TABLES.SEARCH_INDEX} (
                            id, name, slug, authors, description, "fontType", price, "downloadCount", 
                            "isActive", "isSupportVietnamese", metadata, "createdAt", "updatedAt", "deletedAt",
                            "thumbnailUrl", "previewText", "galleryImages", "creatorId", "thumbnailFileId", 
                            creator, "thumbnailFile", categories, tags, weights, "weightCount", 
                            "categoryIds", "tagIds", "weightIds", document, last_updated
                        )
                        SELECT
                            agg.id, agg.name, agg.slug, agg.authors, agg.description, agg."fontType", 
                            agg.price, agg."downloadCount", agg."isActive", agg."isSupportVietnamese", 
                            agg.metadata, agg."createdAt", agg."updatedAt", agg."deletedAt", agg."thumbnailUrl", 
                            agg."previewText", agg."galleryImages", agg."creatorId", agg."thumbnailFileId",
                            agg.creator, agg."thumbnailFile", agg.categories, agg.tags, agg.weights, 
                            agg."weightCount", agg."categoryIds", agg."tagIds", agg."weightIds", 
                            agg.document, now()
                        FROM aggregated_data agg
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            slug = EXCLUDED.slug,
                            authors = EXCLUDED.authors,
                            description = EXCLUDED.description,
                            "fontType" = EXCLUDED."fontType",
                            price = EXCLUDED.price,
                            "downloadCount" = EXCLUDED."downloadCount",
                            "isActive" = EXCLUDED."isActive",
                            "isSupportVietnamese" = EXCLUDED."isSupportVietnamese",
                            metadata = EXCLUDED.metadata,
                            "createdAt" = EXCLUDED."createdAt",
                            "updatedAt" = EXCLUDED."updatedAt",
                            "deletedAt" = EXCLUDED."deletedAt",
                            "thumbnailUrl" = EXCLUDED."thumbnailUrl",
                            "previewText" = EXCLUDED."previewText",
                            "galleryImages" = EXCLUDED."galleryImages",
                            "creatorId" = EXCLUDED."creatorId",
                            "thumbnailFileId" = EXCLUDED."thumbnailFileId",
                            creator = EXCLUDED.creator,
                            "thumbnailFile" = EXCLUDED."thumbnailFile",
                            categories = EXCLUDED.categories,
                            tags = EXCLUDED.tags,
                            weights = EXCLUDED.weights,
                            "weightCount" = EXCLUDED."weightCount",
                            "categoryIds" = EXCLUDED."categoryIds",
                            "tagIds" = EXCLUDED."tagIds",
                            "weightIds" = EXCLUDED."weightIds",
                            document = EXCLUDED.document,
                            last_updated = EXCLUDED.last_updated;

                        total_processed := total_processed + array_length(current_batch, 1);
                        
                        IF array_length(p_font_ids, 1) > 1000 AND i % (batch_size * 10) = 1 THEN
                            RAISE NOTICE 'Progress: %/% fonts (%.1f%%)', 
                                total_processed, 
                                array_length(p_font_ids, 1),
                                (total_processed::float / array_length(p_font_ids, 1) * 100);
                        END IF;
                    END LOOP;

                    IF array_length(p_font_ids, 1) > 100 THEN
                        RAISE NOTICE 'Bulk upsert completed: % fonts in % ms', 
                            total_processed, 
                            EXTRACT(milliseconds FROM clock_timestamp() - start_time);
                    END IF;

                    RETURN total_processed;
                END;
                $$;
            `);

            // --- PHASE 6: CREATE MONITORING FUNCTIONS ---
            console.log('\n📋 Phase 6: Creating monitoring functions...');
            
            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.GET_QUEUE_HEALTH}()
                RETURNS jsonb LANGUAGE plpgsql AS $$
                DECLARE
                    v_stats record;
                    v_task_breakdown jsonb;
                BEGIN
                    SELECT 
                        COUNT(*) as total_tasks,
                        COUNT(*) FILTER (WHERE task_type = '${TASK_TYPES.SINGLE_FONT_UPDATE}') as single_font_tasks,
                        COUNT(*) FILTER (WHERE task_type != '${TASK_TYPES.SINGLE_FONT_UPDATE}') as aggregate_tasks,
                        COUNT(*) FILTER (WHERE processing) as processing_tasks,
                        COUNT(*) FILTER (WHERE retry_count > 0) as failed_tasks,
                        COUNT(*) FILTER (WHERE retry_count >= max_retries) as dead_tasks,
                        MAX(queued_at) as newest_task,
                        MIN(queued_at) as oldest_task,
                        SUM(estimated_fonts) as total_estimated_fonts,
                        AVG(processing_time_ms) as avg_processing_time_ms,
                        MAX(processing_time_ms) as max_processing_time_ms
                    INTO v_stats
                    FROM ${TABLES.QUEUE};
                    
                    SELECT jsonb_object_agg(task_type, task_count)
                    INTO v_task_breakdown
                    FROM (
                        SELECT task_type, COUNT(*) as task_count
                        FROM ${TABLES.QUEUE}
                        WHERE NOT processing AND retry_count < max_retries
                        GROUP BY task_type
                    ) breakdown;
                    
                    RETURN jsonb_build_object(
                        'total_tasks', COALESCE(v_stats.total_tasks, 0),
                        'single_font_tasks', COALESCE(v_stats.single_font_tasks, 0),
                        'aggregate_tasks', COALESCE(v_stats.aggregate_tasks, 0),
                        'processing_tasks', COALESCE(v_stats.processing_tasks, 0),
                        'failed_tasks', COALESCE(v_stats.failed_tasks, 0),
                        'dead_tasks', COALESCE(v_stats.dead_tasks, 0),
                        'newest_task', v_stats.newest_task,
                        'oldest_task', v_stats.oldest_task,
                        'total_estimated_fonts', COALESCE(v_stats.total_estimated_fonts, 0),
                        'avg_processing_time_ms', COALESCE(v_stats.avg_processing_time_ms, 0),
                        'max_processing_time_ms', COALESCE(v_stats.max_processing_time_ms, 0),
                        'task_breakdown', COALESCE(v_task_breakdown, '{}'::jsonb),
                        'health_status', CASE 
                            WHEN COALESCE(v_stats.total_tasks, 0) = 0 THEN '${HEALTH_STATUS.HEALTHY}'
                            WHEN COALESCE(v_stats.total_tasks, 0) < 100 THEN '${HEALTH_STATUS.GOOD}'
                            WHEN COALESCE(v_stats.total_tasks, 0) < 1000 THEN '${HEALTH_STATUS.BUSY}'
                            WHEN COALESCE(v_stats.total_tasks, 0) < 10000 THEN '${HEALTH_STATUS.OVERLOADED}'
                            ELSE '${HEALTH_STATUS.CRITICAL}'
                        END,
                        'timestamp', now()
                    );
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.CLEANUP_FAILED_TASKS}()
                RETURNS integer LANGUAGE plpgsql AS $$
                DECLARE
                    v_cleaned integer;
                    v_old_processing integer;
                BEGIN
                    DELETE FROM ${TABLES.QUEUE} 
                    WHERE retry_count >= max_retries 
                    AND queued_at < now() - interval '1 hour';
                    
                    GET DIAGNOSTICS v_cleaned = ROW_COUNT;
                    
                    UPDATE ${TABLES.QUEUE} 
                    SET processing = false, 
                        worker_id = NULL,
                        retry_count = retry_count + 1,
                        last_error = '${SYSTEM_VALUES.AUTO_RESET_ERROR}'
                    WHERE processing = true 
                    AND started_at < now() - interval '10 minutes'
                    AND retry_count < max_retries;
                    
                    GET DIAGNOSTICS v_old_processing = ROW_COUNT;
                    
                    IF v_cleaned > 0 OR v_old_processing > 0 THEN
                        RAISE NOTICE 'Cleanup completed: % failed tasks removed, % stuck tasks reset', 
                            v_cleaned, v_old_processing;
                    END IF;
                    
                    RETURN v_cleaned + v_old_processing;
                END;
                $$;
            `);

            // --- PHASE 7: CREATE ENHANCED QUEUE PROCESSOR (NO DELETED_AT) ---
            console.log('\n📋 Phase 7: Creating enhanced queue processor...');
            
            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.PROCESS_QUEUE_ENHANCED}(p_batch_size integer DEFAULT 100)
                RETURNS jsonb LANGUAGE plpgsql AS $$
                DECLARE
                    v_batch RECORD;
                    v_all_font_ids_to_upsert uuid[] := '{}';
                    v_all_font_ids_to_delete uuid[] := '{}';
                    v_processed_task_ids uuid[] := '{}';
                    v_failed_task_ids uuid[] := '{}';
                    v_temp_font_ids uuid[];
                    v_total_upserted integer := 0;
                    v_total_deleted integer := 0;
                    v_error_count integer := 0;
                    v_start_time timestamp := clock_timestamp();
                    v_worker_id text := '${SYSTEM_VALUES.WORKER_PREFIX}' || pg_backend_pid() || '-' || EXTRACT(epoch FROM now());
                BEGIN
                    FOR v_batch IN
                        SELECT id, task_type, font_id, target_id, operation, retry_count, max_retries, estimated_fonts
                        FROM ${TABLES.QUEUE}
                        WHERE NOT processing 
                        AND retry_count < max_retries
                        ORDER BY 
                            priority DESC, 
                            retry_count ASC, 
                            estimated_fonts ASC NULLS LAST,
                            queued_at ASC
                        LIMIT p_batch_size
                        FOR UPDATE SKIP LOCKED
                    LOOP
                        BEGIN
                            UPDATE ${TABLES.QUEUE} 
                            SET processing = true, 
                                started_at = now(), 
                                worker_id = v_worker_id
                            WHERE id = v_batch.id;
                            
                            v_processed_task_ids := array_append(v_processed_task_ids, v_batch.id);

                            IF v_batch.task_type = '${TASK_TYPES.SINGLE_FONT_UPDATE}' THEN
                                IF v_batch.operation = '${OPERATIONS.DELETE}' THEN
                                    v_all_font_ids_to_delete := array_append(v_all_font_ids_to_delete, v_batch.font_id);
                                ELSE
                                    v_all_font_ids_to_upsert := array_append(v_all_font_ids_to_upsert, v_batch.font_id);
                                END IF;
                            ELSE
                                v_temp_font_ids := '{}';
                                CASE v_batch.task_type
                                    WHEN '${TASK_TYPES.RESYNC_BY_CATEGORY}' THEN
                                        SELECT array_agg(DISTINCT fc."fontId") INTO v_temp_font_ids 
                                        FROM ${TABLES.FONT_CATEGORIES} fc
                                        JOIN ${TABLES.FONTS} f ON fc."fontId" = f.id AND f."deletedAt" IS NULL
                                        WHERE fc."categoryId" = v_batch.target_id;
                                        
                                    WHEN '${TASK_TYPES.RESYNC_BY_TAG}' THEN
                                        SELECT array_agg(DISTINCT ft."fontId") INTO v_temp_font_ids 
                                        FROM ${TABLES.FONT_TAGS} ft
                                        JOIN ${TABLES.FONTS} f ON ft."fontId" = f.id AND f."deletedAt" IS NULL
                                        WHERE ft."tagId" = v_batch.target_id;
                                        
                                    WHEN '${TASK_TYPES.RESYNC_BY_USER}' THEN
                                        SELECT array_agg(DISTINCT id) INTO v_temp_font_ids 
                                        FROM ${TABLES.FONTS} 
                                        WHERE "creatorId" = v_batch.target_id AND "deletedAt" IS NULL;
                                        
                                    WHEN '${TASK_TYPES.RESYNC_BY_FILE}' THEN
                                        SELECT array_agg(DISTINCT id) INTO v_temp_font_ids 
                                        FROM ${TABLES.FONTS} 
                                        WHERE "thumbnailFileId" = v_batch.target_id AND "deletedAt" IS NULL;
                                        
                                    ELSE
                                        RAISE WARNING 'Unknown task type: %', v_batch.task_type;
                                END CASE;

                                IF v_temp_font_ids IS NOT NULL AND array_length(v_temp_font_ids, 1) > 0 THEN
                                    v_all_font_ids_to_upsert := array_cat(v_all_font_ids_to_upsert, v_temp_font_ids);
                                    
                                    IF array_length(v_temp_font_ids, 1) > 1000 THEN
                                        RAISE NOTICE 'Large aggregate task: % affecting % fonts', 
                                            v_batch.task_type, array_length(v_temp_font_ids, 1);
                                    END IF;
                                END IF;
                            END IF;
                            
                        EXCEPTION
                            WHEN OTHERS THEN
                                UPDATE ${TABLES.QUEUE} 
                                SET processing = false,
                                    retry_count = retry_count + 1,
                                    last_error = SQLERRM,
                                    worker_id = NULL
                                WHERE id = v_batch.id;
                                
                                v_error_count := v_error_count + 1;
                                v_failed_task_ids := array_append(v_failed_task_ids, v_batch.id);
                                v_processed_task_ids := array_remove(v_processed_task_ids, v_batch.id);
                                
                                RAISE WARNING 'Task % failed: %', v_batch.id, SQLERRM;
                        END;
                    END LOOP;

                    IF array_length(v_processed_task_ids, 1) > 0 THEN
                        IF array_length(v_all_font_ids_to_delete, 1) > 0 THEN
                            SELECT array_agg(DISTINCT unnest) INTO v_all_font_ids_to_delete 
                            FROM unnest(v_all_font_ids_to_delete);
                            
                            DELETE FROM ${TABLES.SEARCH_INDEX} WHERE id = ANY(v_all_font_ids_to_delete);
                            GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
                        END IF;

                        IF array_length(v_all_font_ids_to_upsert, 1) > 0 THEN
                            SELECT array_agg(DISTINCT unnest) INTO v_all_font_ids_to_upsert 
                            FROM unnest(v_all_font_ids_to_upsert);
                            
                            IF v_all_font_ids_to_delete IS NOT NULL THEN
                                v_all_font_ids_to_upsert := ARRAY(
                                    SELECT unnest(v_all_font_ids_to_upsert) 
                                    EXCEPT 
                                    SELECT unnest(v_all_font_ids_to_delete)
                                );
                            END IF;
                            
                            IF array_length(v_all_font_ids_to_upsert, 1) > 0 THEN
                                v_total_upserted := ${FUNCTIONS.UPSERT_FONT_SEARCH_INDEX}(v_all_font_ids_to_upsert);
                            END IF;
                        END IF;

                        DELETE FROM ${TABLES.QUEUE} 
                        WHERE id = ANY(v_processed_task_ids)
                        AND id != ALL(COALESCE(v_failed_task_ids, '{}'));
                    END IF;

                    RETURN jsonb_build_object(
                        'worker_id', v_worker_id,
                        'tasks_processed', array_length(COALESCE(v_processed_task_ids, '{}'), 1),
                        'tasks_failed', v_error_count,
                        'fonts_upserted', v_total_upserted,
                        'fonts_deleted', v_total_deleted,
                        'processing_time_ms', EXTRACT(milliseconds FROM clock_timestamp() - v_start_time),
                        'timestamp', now()
                    );
                END;
                $$;
            `);

            // --- PHASE 8: CREATE TRIGGER FUNCTIONS (NO DELETED_AT) ---
            console.log('\n📋 Phase 8: Creating smart trigger functions...');
            
            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.QUEUE_SINGLE_FONT_UPDATE}()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                DECLARE
                    v_operation text;
                    v_font_record record;
                BEGIN
                    v_font_record := COALESCE(NEW, OLD);
                
                    -- Determine operation: soft-delete or hard-delete is a DELETE op for the index
                    IF (TG_OP = '${TRIGGER_OPS.DELETE}' OR (TG_OP = '${TRIGGER_OPS.UPDATE}' AND NEW."deletedAt" IS NOT NULL)) THEN
                        v_operation := '${OPERATIONS.DELETE}';
                    ELSE
                        v_operation := '${OPERATIONS.UPSERT}';
                    END IF;

                    INSERT INTO ${TABLES.QUEUE} (
                        task_type, font_id, operation, priority, estimated_fonts, 
                        metadata, created_by
                    )
                    VALUES (
                        '${TASK_TYPES.SINGLE_FONT_UPDATE}', v_font_record.id, v_operation, 
                        -- Give deletes higher priority
                        CASE WHEN v_operation = '${OPERATIONS.DELETE}' THEN 1 ELSE 0 END, 
                        1,
                        jsonb_build_object('font_name', v_font_record.name, 'op', TG_OP),
                        '${SYSTEM_VALUES.TRIGGER_FONTS_CREATOR}'
                    )
                    ON CONFLICT (font_id) WHERE ((task_type = '${TASK_TYPES.SINGLE_FONT_UPDATE}'::text) AND (NOT processing)) DO UPDATE SET
                        -- If a delete comes in for a queued upsert, it becomes a delete. A delete is final.
                        operation = CASE WHEN ${TABLES.QUEUE}.operation = '${OPERATIONS.DELETE}' OR EXCLUDED.operation = '${OPERATIONS.DELETE}'
                                    THEN '${OPERATIONS.DELETE}'
                                    ELSE '${OPERATIONS.UPSERT}'
                                    END,
                        priority = GREATEST(EXCLUDED.priority, ${TABLES.QUEUE}.priority),
                        queued_at = now(),
                        processing = false,
                        retry_count = 0;
                        
                    RETURN v_font_record;
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.QUEUE_LINKING_TABLE_UPDATE}()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                DECLARE
                    v_font_id uuid;
                BEGIN
                    v_font_id := COALESCE(NEW."fontId", OLD."fontId");
                    IF v_font_id IS NULL THEN 
                        RETURN COALESCE(NEW, OLD); 
                    END IF;

                    INSERT INTO ${TABLES.QUEUE} (
                        task_type, font_id, operation, priority, estimated_fonts,
                        metadata, created_by
                    )
                    VALUES (
                        '${TASK_TYPES.SINGLE_FONT_UPDATE}', v_font_id, '${OPERATIONS.UPSERT}', 0, 1,
                        jsonb_build_object('trigger_table', TG_TABLE_NAME),
                        'trigger_' || TG_TABLE_NAME
                    )
                    ON CONFLICT (font_id) WHERE ((task_type = '${TASK_TYPES.SINGLE_FONT_UPDATE}'::text) AND (NOT processing)) DO UPDATE SET
                        operation = CASE WHEN ${TABLES.QUEUE}.operation = '${OPERATIONS.DELETE}' THEN '${OPERATIONS.DELETE}' ELSE '${OPERATIONS.UPSERT}' END,
                        priority = GREATEST(EXCLUDED.priority, ${TABLES.QUEUE}.priority),
                        queued_at = now(),
                        processing = false,
                        retry_count = 0;
                        
                    RETURN COALESCE(NEW, OLD);
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.QUEUE_MASTER_TABLE_UPDATE}()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                DECLARE
                    v_task_type text;
                    v_target_id uuid;
                    v_estimated_fonts integer;
                    v_change_detected boolean := false;
                BEGIN
                    v_target_id := NEW.id;
                    
                    CASE TG_TABLE_NAME
                        WHEN '${TABLES.CATEGORIES}' THEN 
                            v_task_type := '${TASK_TYPES.RESYNC_BY_CATEGORY}';
                            v_change_detected := (OLD.name IS DISTINCT FROM NEW.name OR OLD.slug IS DISTINCT FROM NEW.slug OR OLD."isActive" IS DISTINCT FROM NEW."isActive");
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM ${TABLES.FONT_CATEGORIES} fc
                                JOIN ${TABLES.FONTS} f ON fc."fontId" = f.id AND f."deletedAt" IS NULL
                                WHERE fc."categoryId" = v_target_id;
                            END IF;
                            
                        WHEN '${TABLES.TAGS}' THEN 
                            v_task_type := '${TASK_TYPES.RESYNC_BY_TAG}';
                            v_change_detected := (OLD.name IS DISTINCT FROM NEW.name OR OLD.slug IS DISTINCT FROM NEW.slug OR OLD."isActive" IS DISTINCT FROM NEW."isActive");
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM ${TABLES.FONT_TAGS} ft
                                JOIN ${TABLES.FONTS} f ON ft."fontId" = f.id AND f."deletedAt" IS NULL
                                WHERE ft."tagId" = v_target_id;
                            END IF;
                            
                        WHEN '${TABLES.USERS}' THEN 
                            v_task_type := '${TASK_TYPES.RESYNC_BY_USER}';
                            v_change_detected := (
                                OLD."firstName" IS DISTINCT FROM NEW."firstName" OR 
                                OLD."lastName" IS DISTINCT FROM NEW."lastName" OR
                                OLD.email IS DISTINCT FROM NEW.email OR
                                OLD."isActive" IS DISTINCT FROM NEW."isActive"
                            );
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM ${TABLES.FONTS} 
                                WHERE "creatorId" = v_target_id AND "deletedAt" IS NULL;
                            END IF;
                            
                        WHEN '${TABLES.FILES}' THEN 
                            v_task_type := '${TASK_TYPES.RESYNC_BY_FILE}';
                            v_change_detected := (
                                OLD."cdnUrl" IS DISTINCT FROM NEW."cdnUrl" OR 
                                OLD.url IS DISTINCT FROM NEW.url
                            );
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM ${TABLES.FONTS} 
                                WHERE "thumbnailFileId" = v_target_id AND "deletedAt" IS NULL;
                            END IF;

                        ELSE 
                            RETURN NEW;
                    END CASE;

                    IF v_change_detected AND COALESCE(v_estimated_fonts, 0) > 0 THEN
                        INSERT INTO ${TABLES.QUEUE} (
                            task_type, target_id, operation, priority, estimated_fonts,
                            metadata, created_by
                        )
                        VALUES (
                            v_task_type, v_target_id, '${OPERATIONS.UPSERT}', 5, v_estimated_fonts,
                            jsonb_build_object('estimated_fonts', v_estimated_fonts),
                            'trigger_' || TG_TABLE_NAME
                        )
                        ON CONFLICT (task_type, target_id) WHERE ((task_type <> '${TASK_TYPES.SINGLE_FONT_UPDATE}'::text) AND (NOT processing)) DO UPDATE SET
                            queued_at = now(),
                            processing = false,
                            retry_count = 0,
                            estimated_fonts = EXCLUDED.estimated_fonts;

                        RAISE NOTICE 'Queued % task for % (% fonts affected)', 
                            v_task_type, v_target_id, v_estimated_fonts;
                    END IF;

                    RETURN NEW;
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.NOTIFY_NEW_QUEUE_TASK}()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                BEGIN
                    PERFORM pg_notify('new_queue_task', TG_OP);
                    RETURN NEW;
                END;
                $$;
            `);

            // --- PHASE 9: ATTACH TRIGGERS ---
            console.log('\n📋 Phase 9: Attaching triggers to tables...');
            
            await queryInterface.sequelize.query(`
                CREATE TRIGGER ${TRIGGERS.QUEUE_UPDATE} 
                AFTER INSERT OR UPDATE OR DELETE ON ${TABLES.FONTS} 
                FOR EACH ROW 
                EXECUTE FUNCTION ${FUNCTIONS.QUEUE_SINGLE_FONT_UPDATE}();
            `);
            
            for (const table of TABLE_ARRAYS.LINKING_TABLES) {
                await queryInterface.sequelize.query(`
                    CREATE TRIGGER ${TRIGGERS.QUEUE_UPDATE} 
                    AFTER INSERT OR UPDATE OR DELETE ON ${table} 
                    FOR EACH ROW 
                    EXECUTE FUNCTION ${FUNCTIONS.QUEUE_LINKING_TABLE_UPDATE}();
                `);
            }

            for (const table of TABLE_ARRAYS.MASTER_TABLES) {
                await queryInterface.sequelize.query(`
                    CREATE TRIGGER ${TRIGGERS.QUEUE_UPDATE} 
                    AFTER UPDATE ON ${table}
                    FOR EACH ROW
                    WHEN (current_setting('session_replication_role') <> 'replica')
                    EXECUTE FUNCTION ${FUNCTIONS.QUEUE_MASTER_TABLE_UPDATE}();
                `);
            }

            await queryInterface.sequelize.query(`
                CREATE TRIGGER ${TRIGGERS.NOTIFY_NEW_TASK}
                AFTER INSERT ON ${TABLES.QUEUE}
                FOR EACH ROW
                EXECUTE FUNCTION ${FUNCTIONS.NOTIFY_NEW_QUEUE_TASK}();
            `);

            // --- PHASE 10: CREATE CONVENIENCE FUNCTIONS ---
            console.log('\n📋 Phase 10: Creating convenience functions...');
            
            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.RUN_QUEUE_PROCESSOR}()
                RETURNS jsonb LANGUAGE plpgsql AS $$
                BEGIN
                    RETURN ${FUNCTIONS.PROCESS_QUEUE_ENHANCED}(200);
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION ${FUNCTIONS.EMERGENCY_QUEUE_RESET}()
                RETURNS jsonb LANGUAGE plpgsql AS $$
                DECLARE
                    v_reset_count integer;
                BEGIN
                    UPDATE ${TABLES.QUEUE} 
                    SET processing = false, 
                        worker_id = NULL,
                        retry_count = 0,
                        last_error = '${SYSTEM_VALUES.EMERGENCY_RESET_ERROR}'
                    WHERE processing = true;
                    
                    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
                    
                    RETURN jsonb_build_object(
                        'reset_tasks', v_reset_count,
                        'timestamp', now()
                    );
                END;
                $$;
            `);

            // --- PHASE 11: INITIAL DATA SYNC ---
            console.log('\n📋 Phase 11: Initial data synchronization...');

            const fontIdsResult = await queryInterface.sequelize.query(
                `SELECT id FROM ${TABLES.FONTS} WHERE "isActive" = true AND "deletedAt" IS NULL`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            
            const allFontIds = fontIdsResult.map(row => row.id);
            const totalActiveFonts = allFontIds.length;
            
            console.log(`📊 Found ${totalActiveFonts} active fonts to synchronize`);

            if (totalActiveFonts > 0) {
                const SYNC_BATCH_SIZE = 5000;
                let processed = 0;
                
                for (let i = 0; i < allFontIds.length; i += SYNC_BATCH_SIZE) {
                    const batch = allFontIds.slice(i, i + SYNC_BATCH_SIZE);
                    const formattedIds = `{${batch.join(',')}}`;
                    await queryInterface.sequelize.query(`SELECT ${FUNCTIONS.UPSERT_FONT_SEARCH_INDEX}(:fontIds)`, {
                        replacements: { fontIds: formattedIds },
                        type: queryInterface.sequelize.QueryTypes.SELECT,
                    });
                    processed += batch.length;
                    console.log(`📊 Synchronized ${processed} of ${totalActiveFonts} active fonts`);
                }
            }

            console.log('🎉 PRODUCTION FONT SEARCH SYSTEM DEPLOYED SUCCESSFULLY! 🎉');
        } catch (error) {
            console.error('\n❌ DEPLOYMENT FAILED:', error);
            throw error;
        }
    },

    async down(queryInterface) {
        console.log('=== REMOVING PRODUCTION FONT SEARCH SYSTEM ===');
        try {
            for (const table of TABLE_ARRAYS.ALL_TRIGGER_TABLES) {
                await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS ${TRIGGERS.QUEUE_UPDATE} ON ${table};`);
            }
            await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS ${TRIGGERS.NOTIFY_NEW_TASK} ON ${TABLES.QUEUE};`);
            const functions = [
                `${FUNCTIONS.UPSERT_FONT_SEARCH_INDEX}(uuid[])`, `${FUNCTIONS.PROCESS_QUEUE_ENHANCED}(integer)`, `${FUNCTIONS.GET_QUEUE_HEALTH}()`,
                `${FUNCTIONS.CLEANUP_FAILED_TASKS}()`, `${FUNCTIONS.RUN_QUEUE_PROCESSOR}()`, `${FUNCTIONS.EMERGENCY_QUEUE_RESET}()`,
                `${FUNCTIONS.QUEUE_SINGLE_FONT_UPDATE}()`, `${FUNCTIONS.QUEUE_LINKING_TABLE_UPDATE}()`, `${FUNCTIONS.QUEUE_MASTER_TABLE_UPDATE}()`, `${FUNCTIONS.NOTIFY_NEW_QUEUE_TASK}()`,
            ];
            for (const func of functions) {
                await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${func} CASCADE;`);
            }
            await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${TABLES.QUEUE} CASCADE;`);
            console.log('✅ Production font search system removed successfully');
        } catch (error) {
            console.error('❌ Error during rollback:', error);
            throw error;
        }
    },
};
