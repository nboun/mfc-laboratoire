/**
 * MFC Laboratoire - Initialisation de la base de données
 * Création des tables
 */

const db = require('./database');

async function initTables() {
    console.log('Création des tables...');
    
    await db.exec(`
        -- Fournisseurs
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT,
            website TEXT,
            email TEXT,
            phone TEXT,
            specialty TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Clients
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            company TEXT,
            address TEXT,
            client_type TEXT DEFAULT 'client',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Cires
        CREATE TABLE IF NOT EXISTS waxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            reference TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT,
            sub_type TEXT,
            category TEXT,
            melting_point REAL,
            congealing_point REAL,
            congealing_point_min REAL,
            congealing_point_max REAL,
            penetration REAL,
            penetration_min REAL,
            penetration_max REAL,
            oil_content REAL,
            oil_content_min REAL,
            oil_content_max REAL,
            saybolt_color_min INTEGER,
            saybolt_color_max INTEGER,
            viscosity REAL,
            density REAL,
            fragrance_load_max REAL,
            packaging TEXT,
            application TEXT,
            recommended_use TEXT,
            comments TEXT,
            notes TEXT,
            available INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- Mèches
        CREATE TABLE IF NOT EXISTS wicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            reference TEXT NOT NULL,
            series TEXT,
            type TEXT,
            core TEXT,
            diameter_min INTEGER,
            diameter_max INTEGER,
            wax_type TEXT,
            application TEXT,
            manufacturer_notes TEXT,
            notes TEXT,
            available INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- Colorants
        CREATE TABLE IF NOT EXISTS colorants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            reference TEXT NOT NULL,
            name TEXT NOT NULL,
            short_name TEXT,
            form TEXT,
            series TEXT,
            color_hex TEXT,
            color_rgb_r INTEGER,
            color_rgb_g INTEGER,
            color_rgb_b INTEGER,
            density REAL,
            viscosity REAL,
            flash_point REAL,
            congealing_point REAL,
            hazard_h315 INTEGER DEFAULT 0,
            hazard_h317 INTEGER DEFAULT 0,
            hazard_h319 INTEGER DEFAULT 0,
            dosage_recommended REAL DEFAULT 0.2,
            dosage_max REAL DEFAULT 0.25,
            notes TEXT,
            available INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- Parfums
        CREATE TABLE IF NOT EXISTS fragrances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            reference TEXT,
            name TEXT NOT NULL,
            family TEXT,
            top_notes TEXT,
            heart_notes TEXT,
            base_notes TEXT,
            ifra_max REAL,
            flash_point REAL,
            recommended_percentage REAL,
            notes TEXT,
            available INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- Composants de parfum (FDS + compositions détaillées)
        CREATE TABLE IF NOT EXISTS fragrance_components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fragrance_id INTEGER NOT NULL,
            cas_number TEXT,
            name TEXT NOT NULL,
            inci_name TEXT,
            percentage_min REAL,
            percentage_max REAL,
            flash_point REAL,
            component_type TEXT DEFAULT 'ingredient',
            solubility_wax TEXT DEFAULT 'unknown',
            volatility TEXT,
            risk_phrases TEXT,
            notes TEXT,
            FOREIGN KEY (fragrance_id) REFERENCES fragrances(id)
        );

        -- Analyses FDS de parfums
        CREATE TABLE IF NOT EXISTS fragrance_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fragrance_id INTEGER NOT NULL,
            analysis_type TEXT DEFAULT 'fds',
            solvent_carrier TEXT,
            solvent_percentage REAL,
            wax_compatibility TEXT,
            combustion_risk TEXT,
            diffusion_profile TEXT,
            recommended_temp_max REAL,
            recommended_wick_adjustment TEXT,
            recommended_additive_adjustment TEXT,
            warnings TEXT,
            analysis_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fragrance_id) REFERENCES fragrances(id)
        );

        -- Échantillons
        CREATE TABLE IF NOT EXISTS samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample_number TEXT UNIQUE NOT NULL,
            client_id INTEGER,
            client_request TEXT,
            candle_type TEXT,
            diameter INTEGER,
            height INTEGER,
            total_mass REAL,
            fragrance_name TEXT,
            fragrance_ref TEXT,
            fragrance_supplier TEXT,
            fragrance_percentage REAL,
            fragrance_id INTEGER,
            pantone_code TEXT,
            pantone_hex TEXT,
            source TEXT DEFAULT 'manual',
            status TEXT DEFAULT 'demande',
            date_request DATE,
            date_creation DATE,
            date_tests DATE,
            date_validation DATE,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        );

        -- Formulations
        CREATE TABLE IF NOT EXISTS formulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            sample_id INTEGER,
            client_id INTEGER,
            name TEXT NOT NULL,
            container_type TEXT,
            diameter INTEGER,
            height INTEGER,
            total_mass REAL NOT NULL,
            fragrance_name TEXT,
            fragrance_ref TEXT,
            fragrance_supplier TEXT,
            fragrance_percentage REAL,
            fragrance_mass REAL,
            fragrance_id INTEGER,
            wax_mass REAL,
            colorant_mass REAL,
            pantone_code TEXT,
            pantone_hex TEXT,
            wick_reference TEXT,
            wick_id INTEGER,
            status TEXT DEFAULT 'en_cours',
            version INTEGER DEFAULT 1,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sample_id) REFERENCES samples(id),
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (wick_id) REFERENCES wicks(id)
        );

        -- Cires par formulation
        CREATE TABLE IF NOT EXISTS formulation_waxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            formulation_id INTEGER NOT NULL,
            wax_id INTEGER NOT NULL,
            percentage REAL NOT NULL,
            mass REAL,
            FOREIGN KEY (formulation_id) REFERENCES formulations(id),
            FOREIGN KEY (wax_id) REFERENCES waxes(id)
        );

        -- Colorants par formulation
        CREATE TABLE IF NOT EXISTS formulation_colorants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            formulation_id INTEGER NOT NULL,
            colorant_id INTEGER,
            name TEXT,
            reference TEXT,
            form TEXT,
            percentage REAL,
            mass REAL,
            FOREIGN KEY (formulation_id) REFERENCES formulations(id),
            FOREIGN KEY (colorant_id) REFERENCES colorants(id)
        );

        -- Tests de combustion
        CREATE TABLE IF NOT EXISTS burn_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_number TEXT UNIQUE NOT NULL,
            formulation_id INTEGER NOT NULL,
            sample_id INTEGER,
            initial_mass REAL NOT NULL,
            wick_reference TEXT,
            status TEXT DEFAULT 'en_cours',
            start_date DATE,
            end_date DATE,
            total_burn_time INTEGER DEFAULT 0,
            conclusion TEXT,
            notes TEXT,
            client_status TEXT DEFAULT NULL,
            client_feedback TEXT,
            client_decision_date DATE,
            retry_from_test_id INTEGER,
            version INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (formulation_id) REFERENCES formulations(id),
            FOREIGN KEY (sample_id) REFERENCES samples(id)
        );

        -- Historique des événements tests (traçabilité complète)
        CREATE TABLE IF NOT EXISTS test_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (test_id) REFERENCES burn_tests(id)
        );

        -- Cycles de combustion
        CREATE TABLE IF NOT EXISTS burn_cycles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id INTEGER NOT NULL,
            cycle_number INTEGER NOT NULL,
            start_time DATETIME,
            end_time DATETIME,
            duration_minutes INTEGER DEFAULT 240,
            mass_before REAL,
            mass_after REAL,
            mass_consumed REAL,
            pool_diameter REAL,
            pool_depth REAL,
            pool_visible INTEGER DEFAULT 1,
            flame_height REAL,
            flame_stability TEXT,
            smoke_level TEXT,
            soot_level TEXT,
            mushrooming TEXT,
            tunneling TEXT,
            scent_throw TEXT,
            notes TEXT,
            mod_wick TEXT,
            mod_fragrance_pct REAL,
            mod_wax_changes TEXT,
            mod_colorant TEXT,
            mod_other TEXT,
            mod_notes TEXT,
            FOREIGN KEY (test_id) REFERENCES burn_tests(id)
        );

        -- Base de connaissances
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            subcategory TEXT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT,
            priority INTEGER DEFAULT 3,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Recettes MFC (bases éprouvées)
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            candle_type TEXT NOT NULL,
            description TEXT,
            diameter_min INTEGER,
            diameter_max INTEGER,
            height_min INTEGER,
            height_max INTEGER,
            fragrance_pct_min REAL,
            fragrance_pct_max REAL,
            fragrance_pct_default REAL,
            colorant_pct REAL DEFAULT 0.20,
            wick_series TEXT,
            wick_size_guide TEXT,
            pour_temp_min INTEGER,
            pour_temp_max INTEGER,
            cure_hours INTEGER DEFAULT 72,
            empirical_notes TEXT,
            known_variants TEXT,
            pitfalls TEXT,
            best_for TEXT,
            success_count INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Composition cires des recettes
        CREATE TABLE IF NOT EXISTS recipe_waxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id INTEGER NOT NULL,
            wax_id INTEGER,
            wax_name TEXT,
            percentage REAL NOT NULL,
            role TEXT,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (wax_id) REFERENCES waxes(id)
        );

        -- Colorants des recettes
        CREATE TABLE IF NOT EXISTS recipe_colorants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id INTEGER NOT NULL,
            colorant_id INTEGER,
            colorant_name TEXT,
            percentage REAL DEFAULT 0.20,
            notes TEXT,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (colorant_id) REFERENCES colorants(id)
        );

        -- Mèches validées / testées par recette
        CREATE TABLE IF NOT EXISTS recipe_wicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id INTEGER NOT NULL,
            wick_id INTEGER,
            wick_reference TEXT,
            diameter_min INTEGER,
            diameter_max INTEGER,
            status TEXT DEFAULT 'recommandée',
            notes TEXT,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (wick_id) REFERENCES wicks(id)
        );

        -- Règles apprises
        CREATE TABLE IF NOT EXISTS learned_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_type TEXT NOT NULL,
            condition TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            confidence REAL DEFAULT 0.5,
            success_count INTEGER DEFAULT 0,
            failure_count INTEGER DEFAULT 0,
            source_formulation_id INTEGER,
            source_test_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    console.log('✓ Tables créées');
}

async function migrateIfNeeded(db) {
    // --- MIGRATION ROBUSTE via PRAGMA table_info ---
    // (db.get avale les erreurs SQL → try/catch ne détecte PAS les colonnes manquantes)
    async function getColumns(tableName) {
        const cols = await db.all(`PRAGMA table_info(${tableName})`);
        return (cols || []).map(c => c.name);
    }
    async function addColumnIfMissing(tableName, colName, colType) {
        const cols = await getColumns(tableName);
        if (!cols.includes(colName)) {
            console.log(`  Migration: ajout ${colName} à ${tableName}`);
            await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colType}`);
        }
    }

    // samples
    await addColumnIfMissing('samples', 'fragrance_id', 'INTEGER');
    await addColumnIfMissing('samples', 'fragrance_ref', 'TEXT');
    await addColumnIfMissing('samples', 'fragrance_supplier', 'TEXT');
    
    // formulations
    await addColumnIfMissing('formulations', 'fragrance_id', 'INTEGER');
    await addColumnIfMissing('formulations', 'fragrance_ref', 'TEXT');
    await addColumnIfMissing('formulations', 'fragrance_supplier', 'TEXT');
    await addColumnIfMissing('formulations', 'recipe_id', 'INTEGER');
    await addColumnIfMissing('formulations', 'temp_fusion', 'INTEGER');
    await addColumnIfMissing('formulations', 'temp_ajout_parfum', 'INTEGER');
    await addColumnIfMissing('formulations', 'temp_coulage', 'INTEGER');
    await addColumnIfMissing('formulations', 'temp_notes', 'TEXT');
    
    // waxes extended columns
    const waxCols = ['category','congealing_point_min','congealing_point_max','penetration_min','penetration_max','oil_content_min','oil_content_max','saybolt_color_min','saybolt_color_max','packaging','recommended_use','comments'];
    for (const col of waxCols) {
        const type = col.includes('min')||col.includes('max') ? 'REAL' : 'TEXT';
        await addColumnIfMissing('waxes', col, type);
    }

    // formulation_waxes: raw data from Excel
    await addColumnIfMissing('formulation_waxes', 'raw_type', 'TEXT');
    await addColumnIfMissing('formulation_waxes', 'raw_reference', 'TEXT');

    // burn_tests: client validation + versioning
    await addColumnIfMissing('burn_tests', 'client_status', 'TEXT DEFAULT NULL');
    await addColumnIfMissing('burn_tests', 'client_feedback', 'TEXT');
    await addColumnIfMissing('burn_tests', 'client_decision_date', 'DATE');
    await addColumnIfMissing('burn_tests', 'retry_from_test_id', 'INTEGER');
    await addColumnIfMissing('burn_tests', 'version', 'INTEGER DEFAULT 1');
    // Create test_history table if not exists
    await db.run(`CREATE TABLE IF NOT EXISTS test_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES burn_tests(id)
    )`);
    // Add modification tracking columns to burn_cycles
    const cycleCols = [
        ['mod_wick', 'TEXT'], ['mod_fragrance_pct', 'REAL'],
        ['mod_wax_changes', 'TEXT'], ['mod_colorant', 'TEXT'],
        ['mod_other', 'TEXT'], ['mod_notes', 'TEXT']
    ];
    for (const [col, type] of cycleCols) {
        await addColumnIfMissing('burn_cycles', col, type);
    }

    // ═══════ AUTO-APPRENTISSAGE PERMANENT ═══════
    // Table opérateurs
    await db.run(`CREATE TABLE IF NOT EXISTS operators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        role TEXT DEFAULT 'opérateur',
        email TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Journal d'activité — qui fait quoi quand
    await db.run(`CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_id INTEGER,
        operator_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        entity_code TEXT,
        detail TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (operator_id) REFERENCES operators(id)
    )`);

    // Ajouter operator_id aux tables existantes
    await addColumnIfMissing('samples', 'created_by', 'INTEGER');
    await addColumnIfMissing('samples', 'created_by_name', 'TEXT');
    await addColumnIfMissing('formulations', 'created_by', 'INTEGER');
    await addColumnIfMissing('formulations', 'created_by_name', 'TEXT');
    await addColumnIfMissing('formulations', 'validated_by', 'INTEGER');
    await addColumnIfMissing('formulations', 'validated_by_name', 'TEXT');
    await addColumnIfMissing('burn_tests', 'created_by', 'INTEGER');
    await addColumnIfMissing('burn_tests', 'created_by_name', 'TEXT');
    await addColumnIfMissing('burn_tests', 'tested_by', 'INTEGER');
    await addColumnIfMissing('burn_tests', 'tested_by_name', 'TEXT');
    await addColumnIfMissing('burn_cycles', 'recorded_by', 'INTEGER');
    await addColumnIfMissing('burn_cycles', 'recorded_by_name', 'TEXT');

    // Table change_log: TOUTE modification tracée avec le POURQUOI obligatoire
    await db.run(`CREATE TABLE IF NOT EXISTS change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        field_changed TEXT,
        old_value TEXT,
        new_value TEXT,
        reason_why TEXT,
        technical_context TEXT,
        result_observed TEXT,
        result_success INTEGER,
        linked_test_id INTEGER,
        linked_formulation_id INTEGER,
        linked_client_id INTEGER,
        operator TEXT DEFAULT 'MFC',
        kb_entry_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table knowledge_patterns: schémas validés réutilisables
    await db.run(`CREATE TABLE IF NOT EXISTS knowledge_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_type TEXT NOT NULL,
        trigger_condition TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        outcome TEXT,
        confidence REAL DEFAULT 0.5,
        usage_count INTEGER DEFAULT 0,
        last_used_at DATETIME,
        source_changes TEXT,
        validated_by_test INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  ✓ Auto-apprentissage permanent activé');

    // Photos table
    await db.run(`CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        filesize INTEGER,
        caption TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sessions itératives du formulateur
    await db.run(`CREATE TABLE IF NOT EXISTS formulation_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        step TEXT NOT NULL,
        recipe_code TEXT,
        reasons TEXT,
        custom_note TEXT,
        formulation_json TEXT,
        fds_json TEXT,
        params_json TEXT,
        status TEXT DEFAULT 'en_cours',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.run('CREATE INDEX IF NOT EXISTS idx_form_session ON formulation_sessions(session_id)');

    // Projets / Collaborations clients
    await db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        description TEXT,
        status TEXT DEFAULT 'actif',
        start_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
    )`);
    await db.run('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)');

    // Documents générés (PDF sauvegardés)
    await db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        doc_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        generated_by TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.run('CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id)');

    // Migration: ajouter project_id aux tables existantes si absent
    await addColumnIfMissing('samples', 'project_id', 'INTEGER REFERENCES projects(id)');
    await addColumnIfMissing('formulations', 'project_id', 'INTEGER REFERENCES projects(id)');

    // === Colonnes techniques mèches ===
    await addColumnIfMissing('wicks', 'meters_per_kg', 'REAL');           // Mètres de mèche par kg (rendement)
    await addColumnIfMissing('wicks', 'burn_rate', 'REAL');               // Consommation cire g/h
    await addColumnIfMissing('wicks', 'flame_height_mm', 'REAL');         // Hauteur flamme typique en mm
    await addColumnIfMissing('wicks', 'chemical_treatment', 'TEXT');       // Traitement chimique (X, P9, P10, P103, KST, NST)
    await addColumnIfMissing('wicks', 'directional', 'INTEGER DEFAULT 0');// 1 si directionnelle (RRD), 0 sinon
    await addColumnIfMissing('wicks', 'self_trimming', 'INTEGER DEFAULT 1'); // Auto-rognage
    await addColumnIfMissing('wicks', 'recommended_container_mm', 'TEXT');// Diamètre container recommandé ex: "50-65"
    await addColumnIfMissing('wicks', 'width_mm', 'REAL');                // Largeur mèche en mm
}

module.exports = { initTables, migrateIfNeeded };
