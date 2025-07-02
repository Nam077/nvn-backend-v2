'use strict';

const SEARCH_TABLE = 'font_search_index';
const UPSERT_FUNCTION = 'upsert_font_search_index';
const QUEUE_TABLE = 'font_update_queue';

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
            const allTables = ['fonts', 'font_categories', 'font_tags', 'font_weights', 'categories', 'tags', 'users', 'files'];
            for (const table of allTables) {
                try {
                    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trigger_queue_update ON ${table};`);
                } catch (e) {
                    console.log(`   ⚠️ Trigger cleanup: ${e.message.split('\n')[0]}`);
                }
            }

            // Force drop all functions with CASCADE
            const functionsToCleanup = [
                'queue_font_update_from_master',
                'process_font_update_queue',
                'process_font_update_queue_enhanced',
                'queue_font_update',
                'queue_font_update_from_linking',
                'queue_master_table_update',
                'queue_single_font_update',
                'queue_linking_table_update',
                'get_queue_health',
                'cleanup_failed_tasks',
                'run_queue_processor',
                'emergency_queue_reset',
                'upsert_font_search_index',
                'notify_new_queue_task',
                'queue_font_update_on_change',
                'queue_resync_by_category',
                'queue_resync_by_tag',
                'queue_master_table_update',
                'queue_font_update_from_master',
                'process_font_update_queue',
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
            await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${SEARCH_TABLE} CASCADE;`);

            // Drop tables
            await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${QUEUE_TABLE} CASCADE;`);
            
            console.log('✅ Aggressive cleanup completed');

            // --- PHASE 2: CREATE ENHANCED QUEUE TABLE ---
            console.log('\n📋 Phase 2: Creating enhanced queue table...');
            
            await queryInterface.sequelize.query(`
                CREATE TABLE ${QUEUE_TABLE} (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    
                    -- Task Definition
                    task_type text NOT NULL,
                    font_id uuid,
                    target_id uuid,
                    operation text NOT NULL DEFAULT 'upsert',
                    
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
                    created_by text DEFAULT 'system',
                    
                    -- Constraints
                    CONSTRAINT chk_task_payload CHECK (
                        (task_type = 'SINGLE_FONT_UPDATE' AND font_id IS NOT NULL) OR
                        (task_type != 'SINGLE_FONT_UPDATE' AND target_id IS NOT NULL)
                    ),
                    CONSTRAINT chk_priority_range CHECK (priority >= 0 AND priority <= 10),
                    CONSTRAINT chk_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
                );
            `);

            // --- PHASE 3: CREATE SEARCH INDEX TABLE ---
            console.log('\n📋 Phase 3: Creating search index table...');
            
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS ${SEARCH_TABLE} (
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
                    last_updated timestamptz DEFAULT now()
                );
            `);

            // --- PHASE 4: CREATE OPTIMIZED INDEXES ---
            console.log('\n📋 Phase 4: Creating optimized indexes...');
            
            // Drop indexes explicitly to be safe from any previous state
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_${QUEUE_TABLE}_unique_single_font;`);
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_${QUEUE_TABLE}_unique_aggregate_task;`);
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS uq_queue_single_font_task;`);
            await queryInterface.sequelize.query(`DROP INDEX IF EXISTS uq_queue_aggregate_task;`);

            const indexes = [
                // Queue table indexes - Explicitly named constraints to resolve ON CONFLICT ambiguity
                `CREATE UNIQUE INDEX uq_queue_single_font_task
                 ON ${QUEUE_TABLE} (font_id) 
                 WHERE task_type = 'SINGLE_FONT_UPDATE' AND NOT processing`,
                
                `CREATE UNIQUE INDEX uq_queue_aggregate_task
                 ON ${QUEUE_TABLE} (task_type, target_id) 
                 WHERE task_type != 'SINGLE_FONT_UPDATE' AND NOT processing`,
                
                `CREATE INDEX IF NOT EXISTS idx_${QUEUE_TABLE}_priority_queue 
                 ON ${QUEUE_TABLE} (priority DESC, retry_count ASC, queued_at ASC) 
                 WHERE NOT processing AND retry_count < max_retries`,
                
                `CREATE INDEX IF NOT EXISTS idx_${QUEUE_TABLE}_processing_state 
                 ON ${QUEUE_TABLE} (processing, started_at) 
                 WHERE processing = true`,
                
                `CREATE INDEX IF NOT EXISTS idx_${QUEUE_TABLE}_failed_tasks 
                 ON ${QUEUE_TABLE} (retry_count, queued_at) 
                 WHERE retry_count >= max_retries`,
                
                `CREATE INDEX IF NOT EXISTS idx_${QUEUE_TABLE}_task_type 
                 ON ${QUEUE_TABLE} (task_type, priority DESC)`,
                
                // Search index table indexes
                `CREATE UNIQUE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_id ON ${SEARCH_TABLE} (id)`,
                `CREATE INDEX IF NOT EXISTS idx_gin_${SEARCH_TABLE}_document ON ${SEARCH_TABLE} USING GIN(document)`,
                `CREATE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_category_ids ON ${SEARCH_TABLE} USING GIN("categoryIds")`,
                `CREATE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_tag_ids ON ${SEARCH_TABLE} USING GIN("tagIds")`,
                `CREATE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_weight_ids ON ${SEARCH_TABLE} USING GIN("weightIds")`,
                `CREATE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_is_active ON ${SEARCH_TABLE} ("isActive")`,
                `CREATE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_created_at ON ${SEARCH_TABLE} ("createdAt")`,
                `CREATE INDEX IF NOT EXISTS idx_${SEARCH_TABLE}_last_updated ON ${SEARCH_TABLE} (last_updated)`
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
                CREATE FUNCTION ${UPSERT_FUNCTION}(p_font_ids uuid[])
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
                                fonts f
                            -- Use a LATERAL join to safely unnest, only when galleryImages is not empty
                            LEFT JOIN LATERAL jsonb_array_elements(f."galleryImages") AS image_element ON 
                                f."galleryImages" IS NOT NULL AND jsonb_array_length(f."galleryImages") > 0
                            -- Join to files table only for entity types
                            LEFT JOIN files fi ON (image_element->>'type') = 'entity' AND (fi.id = (image_element->>'fileId')::uuid)
                            WHERE f.id = ANY(current_batch)
                            GROUP BY f.id, f."galleryImages"
                        ),
                        font_data AS (
                            SELECT DISTINCT f.id 
                            FROM fonts f 
                            WHERE f.id = ANY(current_batch)
                        ),
                        aggregated_data AS (
                            SELECT
                                f.id, f.name, f.slug, f.authors, f.description, f."fontType", 
                                f.price, f."downloadCount", f."isActive", f."isSupportVietnamese", 
                                f.metadata, f."createdAt", f."updatedAt", f."thumbnailUrl", 
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
                            JOIN fonts f ON f.id = fd.id
                            LEFT JOIN resolved_gallery_data rgi ON rgi.font_id = f.id
                            LEFT JOIN font_categories fc ON f.id = fc."fontId"
                            LEFT JOIN categories c ON fc."categoryId" = c.id
                            LEFT JOIN font_tags ft ON f.id = ft."fontId"
                            LEFT JOIN tags t ON ft."tagId" = t.id
                            LEFT JOIN font_weights fw ON f.id = fw."fontId"
                            LEFT JOIN users u ON f."creatorId" = u.id
                            LEFT JOIN files fi ON f."thumbnailFileId" = fi.id
                            GROUP BY f.id, f.name, f.slug, f.authors, f.description, f."fontType", 
                                     f.price, f."downloadCount", f."isActive", f."isSupportVietnamese", 
                                     f.metadata, f."createdAt", f."updatedAt", f."thumbnailUrl", 
                                     f."previewText", rgi."galleryImages", f."creatorId", f."thumbnailFileId", u.id, fi.id
                        )
                        INSERT INTO ${SEARCH_TABLE} (
                            id, name, slug, authors, description, "fontType", price, "downloadCount", 
                            "isActive", "isSupportVietnamese", metadata, "createdAt", "updatedAt", 
                            "thumbnailUrl", "previewText", "galleryImages", "creatorId", "thumbnailFileId", 
                            creator, "thumbnailFile", categories, tags, weights, "weightCount", 
                            "categoryIds", "tagIds", "weightIds", document, last_updated
                        )
                        SELECT
                            agg.id, agg.name, agg.slug, agg.authors, agg.description, agg."fontType", 
                            agg.price, agg."downloadCount", agg."isActive", agg."isSupportVietnamese", 
                            agg.metadata, agg."createdAt", agg."updatedAt", agg."thumbnailUrl", 
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
                CREATE FUNCTION get_queue_health()
                RETURNS jsonb LANGUAGE plpgsql AS $$
                DECLARE
                    v_stats record;
                    v_task_breakdown jsonb;
                BEGIN
                    SELECT 
                        COUNT(*) as total_tasks,
                        COUNT(*) FILTER (WHERE task_type = 'SINGLE_FONT_UPDATE') as single_font_tasks,
                        COUNT(*) FILTER (WHERE task_type != 'SINGLE_FONT_UPDATE') as aggregate_tasks,
                        COUNT(*) FILTER (WHERE processing) as processing_tasks,
                        COUNT(*) FILTER (WHERE retry_count > 0) as failed_tasks,
                        COUNT(*) FILTER (WHERE retry_count >= max_retries) as dead_tasks,
                        MAX(queued_at) as newest_task,
                        MIN(queued_at) as oldest_task,
                        SUM(estimated_fonts) as total_estimated_fonts,
                        AVG(processing_time_ms) as avg_processing_time_ms,
                        MAX(processing_time_ms) as max_processing_time_ms
                    INTO v_stats
                    FROM ${QUEUE_TABLE};
                    
                    SELECT jsonb_object_agg(task_type, task_count)
                    INTO v_task_breakdown
                    FROM (
                        SELECT task_type, COUNT(*) as task_count
                        FROM ${QUEUE_TABLE}
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
                            WHEN COALESCE(v_stats.total_tasks, 0) = 0 THEN 'healthy'
                            WHEN COALESCE(v_stats.total_tasks, 0) < 100 THEN 'good'
                            WHEN COALESCE(v_stats.total_tasks, 0) < 1000 THEN 'busy'
                            WHEN COALESCE(v_stats.total_tasks, 0) < 10000 THEN 'overloaded'
                            ELSE 'critical'
                        END,
                        'timestamp', now()
                    );
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION cleanup_failed_tasks()
                RETURNS integer LANGUAGE plpgsql AS $$
                DECLARE
                    v_cleaned integer;
                    v_old_processing integer;
                BEGIN
                    DELETE FROM ${QUEUE_TABLE} 
                    WHERE retry_count >= max_retries 
                    AND queued_at < now() - interval '1 hour';
                    
                    GET DIAGNOSTICS v_cleaned = ROW_COUNT;
                    
                    UPDATE ${QUEUE_TABLE} 
                    SET processing = false, 
                        worker_id = NULL,
                        retry_count = retry_count + 1,
                        last_error = 'Task stuck in processing state - auto-reset'
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
                CREATE FUNCTION process_font_update_queue_enhanced(p_batch_size integer DEFAULT 100)
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
                    v_worker_id text := 'worker-' || pg_backend_pid() || '-' || EXTRACT(epoch FROM now());
                BEGIN
                    FOR v_batch IN
                        SELECT id, task_type, font_id, target_id, operation, retry_count, max_retries, estimated_fonts
                        FROM ${QUEUE_TABLE}
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
                            UPDATE ${QUEUE_TABLE} 
                            SET processing = true, 
                                started_at = now(), 
                                worker_id = v_worker_id
                            WHERE id = v_batch.id;
                            
                            v_processed_task_ids := array_append(v_processed_task_ids, v_batch.id);

                            IF v_batch.task_type = 'SINGLE_FONT_UPDATE' THEN
                                IF v_batch.operation = 'delete' THEN
                                    v_all_font_ids_to_delete := array_append(v_all_font_ids_to_delete, v_batch.font_id);
                                ELSE
                                    v_all_font_ids_to_upsert := array_append(v_all_font_ids_to_upsert, v_batch.font_id);
                                END IF;
                            ELSE
                                v_temp_font_ids := '{}';
                                CASE v_batch.task_type
                                    WHEN 'RESYNC_BY_CATEGORY' THEN
                                        SELECT array_agg(DISTINCT fc."fontId") INTO v_temp_font_ids 
                                        FROM font_categories fc
                                        JOIN fonts f ON fc."fontId" = f.id
                                        WHERE fc."categoryId" = v_batch.target_id;
                                        
                                    WHEN 'RESYNC_BY_TAG' THEN
                                        SELECT array_agg(DISTINCT ft."fontId") INTO v_temp_font_ids 
                                        FROM font_tags ft
                                        JOIN fonts f ON ft."fontId" = f.id
                                        WHERE ft."tagId" = v_batch.target_id;
                                        
                                    WHEN 'RESYNC_BY_USER' THEN
                                        SELECT array_agg(DISTINCT id) INTO v_temp_font_ids 
                                        FROM fonts 
                                        WHERE "creatorId" = v_batch.target_id;
                                        
                                    WHEN 'RESYNC_BY_FILE' THEN
                                        SELECT array_agg(DISTINCT id) INTO v_temp_font_ids 
                                        FROM fonts 
                                        WHERE "thumbnailFileId" = v_batch.target_id;
                                        
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
                                UPDATE ${QUEUE_TABLE} 
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
                            
                            DELETE FROM ${SEARCH_TABLE} WHERE id = ANY(v_all_font_ids_to_delete);
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
                                v_total_upserted := ${UPSERT_FUNCTION}(v_all_font_ids_to_upsert);
                            END IF;
                        END IF;

                        DELETE FROM ${QUEUE_TABLE} 
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
                CREATE FUNCTION queue_single_font_update()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                BEGIN
                    IF (TG_OP = 'DELETE') THEN
                        INSERT INTO ${QUEUE_TABLE} (
                            task_type, font_id, operation, priority, estimated_fonts, 
                            metadata, created_by
                        )
                        VALUES (
                            'SINGLE_FONT_UPDATE', OLD.id, 'delete', 1, 1,
                            jsonb_build_object('font_name', OLD.name),
                            'trigger_fonts'
                        )
                        ON CONFLICT (font_id) WHERE ((task_type = 'SINGLE_FONT_UPDATE'::text) AND (NOT processing)) DO UPDATE SET
                            operation = 'delete',
                            priority = GREATEST(EXCLUDED.priority, ${QUEUE_TABLE}.priority),
                            queued_at = now(),
                            processing = false,
                            retry_count = 0;
                        RETURN OLD;
                    ELSE
                        INSERT INTO ${QUEUE_TABLE} (
                            task_type, font_id, operation, priority, estimated_fonts,
                            metadata, created_by
                        )
                        VALUES (
                            'SINGLE_FONT_UPDATE', NEW.id, 'upsert', 0, 1,
                            jsonb_build_object('font_name', NEW.name),
                            'trigger_fonts'
                        )
                        ON CONFLICT (font_id) WHERE ((task_type = 'SINGLE_FONT_UPDATE'::text) AND (NOT processing)) DO UPDATE SET
                            operation = CASE WHEN ${QUEUE_TABLE}.operation = 'delete' THEN 'delete' ELSE 'upsert' END,
                            priority = GREATEST(EXCLUDED.priority, ${QUEUE_TABLE}.priority),
                            queued_at = now(),
                            processing = false,
                            retry_count = 0;
                        RETURN NEW;
                    END IF;
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION queue_linking_table_update()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                DECLARE
                    v_font_id uuid;
                BEGIN
                    v_font_id := COALESCE(NEW."fontId", OLD."fontId");
                    IF v_font_id IS NULL THEN 
                        RETURN COALESCE(NEW, OLD); 
                    END IF;

                    INSERT INTO ${QUEUE_TABLE} (
                        task_type, font_id, operation, priority, estimated_fonts,
                        metadata, created_by
                    )
                    VALUES (
                        'SINGLE_FONT_UPDATE', v_font_id, 'upsert', 0, 1,
                        jsonb_build_object('trigger_table', TG_TABLE_NAME),
                        'trigger_' || TG_TABLE_NAME
                    )
                    ON CONFLICT (font_id) WHERE ((task_type = 'SINGLE_FONT_UPDATE'::text) AND (NOT processing)) DO UPDATE SET
                        operation = CASE WHEN ${QUEUE_TABLE}.operation = 'delete' THEN 'delete' ELSE 'upsert' END,
                        queued_at = now(),
                        processing = false,
                        retry_count = 0;
                        
                    RETURN COALESCE(NEW, OLD);
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION queue_master_table_update()
                RETURNS TRIGGER LANGUAGE plpgsql AS $$
                DECLARE
                    v_task_type text;
                    v_target_id uuid;
                    v_estimated_fonts integer;
                    v_change_detected boolean := false;
                BEGIN
                    v_target_id := NEW.id;
                    
                    CASE TG_TABLE_NAME
                        WHEN 'categories' THEN 
                            v_task_type := 'RESYNC_BY_CATEGORY';
                            v_change_detected := (OLD.name IS DISTINCT FROM NEW.name OR OLD.slug IS DISTINCT FROM NEW.slug);
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM font_categories fc
                                JOIN fonts f ON fc."fontId" = f.id
                                WHERE fc."categoryId" = v_target_id;
                            END IF;
                            
                        WHEN 'tags' THEN 
                            v_task_type := 'RESYNC_BY_TAG';
                            v_change_detected := (OLD.name IS DISTINCT FROM NEW.name OR OLD.slug IS DISTINCT FROM NEW.slug);
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM font_tags ft
                                JOIN fonts f ON ft."fontId" = f.id
                                WHERE ft."tagId" = v_target_id;
                            END IF;
                            
                        WHEN 'users' THEN 
                            v_task_type := 'RESYNC_BY_USER';
                            v_change_detected := (
                                OLD."firstName" IS DISTINCT FROM NEW."firstName" OR 
                                OLD."lastName" IS DISTINCT FROM NEW."lastName" OR
                                OLD.email IS DISTINCT FROM NEW.email OR
                                OLD."isActive" IS DISTINCT FROM NEW."isActive"
                            );
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM fonts 
                                WHERE "creatorId" = v_target_id;
                            END IF;
                            
                        WHEN 'files' THEN 
                            v_task_type := 'RESYNC_BY_FILE';
                            v_change_detected := (
                                OLD."cdnUrl" IS DISTINCT FROM NEW."cdnUrl" OR 
                                OLD.url IS DISTINCT FROM NEW.url
                            );
                            IF v_change_detected THEN
                                SELECT COUNT(*) INTO v_estimated_fonts 
                                FROM fonts 
                                WHERE "thumbnailFileId" = v_target_id;
                            END IF;

                        ELSE 
                            RETURN NEW;
                    END CASE;

                    IF v_change_detected AND COALESCE(v_estimated_fonts, 0) > 0 THEN
                        INSERT INTO ${QUEUE_TABLE} (
                            task_type, target_id, operation, priority, estimated_fonts,
                            metadata, created_by
                        )
                        VALUES (
                            v_task_type, v_target_id, 'upsert', 5, v_estimated_fonts,
                            jsonb_build_object('estimated_fonts', v_estimated_fonts),
                            'trigger_' || TG_TABLE_NAME
                        )
                        ON CONFLICT (task_type, target_id) WHERE ((task_type <> 'SINGLE_FONT_UPDATE'::text) AND (NOT processing)) DO UPDATE SET
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
                CREATE FUNCTION notify_new_queue_task()
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
                CREATE TRIGGER trigger_queue_update 
                AFTER INSERT OR UPDATE OR DELETE ON fonts 
                FOR EACH ROW 
                EXECUTE FUNCTION queue_single_font_update();
            `);
            
            const linkingTables = ['font_categories', 'font_tags', 'font_weights'];
            for (const table of linkingTables) {
                await queryInterface.sequelize.query(`
                    CREATE TRIGGER trigger_queue_update 
                    AFTER INSERT OR UPDATE OR DELETE ON ${table} 
                    FOR EACH ROW 
                    EXECUTE FUNCTION queue_linking_table_update();
                `);
            }

            const masterTables = ['categories', 'tags', 'users', 'files'];
            for (const table of masterTables) {
                await queryInterface.sequelize.query(`
                    CREATE TRIGGER trigger_queue_update 
                    AFTER UPDATE ON ${table}
                    FOR EACH ROW
                    WHEN (current_setting('session_replication_role') <> 'replica')
                    EXECUTE FUNCTION queue_master_table_update();
                `);
            }

            await queryInterface.sequelize.query(`
                CREATE TRIGGER trigger_notify_new_task
                AFTER INSERT ON ${QUEUE_TABLE}
                FOR EACH ROW
                EXECUTE FUNCTION notify_new_queue_task();
            `);

            // --- PHASE 10: CREATE CONVENIENCE FUNCTIONS ---
            console.log('\n📋 Phase 10: Creating convenience functions...');
            
            await queryInterface.sequelize.query(`
                CREATE FUNCTION run_queue_processor()
                RETURNS jsonb LANGUAGE plpgsql AS $$
                BEGIN
                    RETURN process_font_update_queue_enhanced(200);
                END;
                $$;
            `);

            await queryInterface.sequelize.query(`
                CREATE FUNCTION emergency_queue_reset()
                RETURNS jsonb LANGUAGE plpgsql AS $$
                DECLARE
                    v_reset_count integer;
                BEGIN
                    UPDATE ${QUEUE_TABLE} 
                    SET processing = false, 
                        worker_id = NULL,
                        retry_count = 0,
                        last_error = 'Emergency reset'
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
                'SELECT id FROM fonts WHERE "isActive" = true',
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
                    await queryInterface.sequelize.query(`SELECT ${UPSERT_FUNCTION}(:fontIds)`, {
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
            const tablesWithTriggers = ['fonts', 'font_categories', 'font_tags', 'font_weights', 'categories', 'tags', 'users', 'files'];
            for (const table of tablesWithTriggers) {
                await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trigger_queue_update ON ${table};`);
            }
            await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trigger_notify_new_task ON ${QUEUE_TABLE};`);
            const functions = [
                `${UPSERT_FUNCTION}(uuid[])`, `process_font_update_queue_enhanced(integer)`, `get_queue_health()`,
                `cleanup_failed_tasks()`, `run_queue_processor()`, `emergency_queue_reset()`,
                `queue_single_font_update()`, `queue_linking_table_update()`, `queue_master_table_update()`, `notify_new_queue_task()`,
            ];
            for (const func of functions) {
                await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${func} CASCADE;`);
            }
            await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${QUEUE_TABLE} CASCADE;`);
            console.log('✅ Production font search system removed successfully');
        } catch (error) {
            console.error('❌ Error during rollback:', error);
            throw error;
        }
    },
};
