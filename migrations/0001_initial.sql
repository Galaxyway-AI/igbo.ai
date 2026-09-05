PRAGMA foreign_keys = ON;
CREATE TABLE admins (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE collaborators (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, organisation TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', collaboration_type TEXT NOT NULL, expertise TEXT NOT NULL DEFAULT '', dialect TEXT NOT NULL DEFAULT '', research_interests TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, resource_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New','Reviewing','Contacted','Potential Collaborator','Active Collaborator','Partner','Declined','Archived')), tags TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX collaborators_status_date ON collaborators(status,created_at);
CREATE INDEX collaborators_email ON collaborators(email);
CREATE TABLE collaborator_notes (id TEXT PRIMARY KEY, collaborator_id TEXT NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE, admin_email TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE sponsorship_enquiries (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, organisation TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'New', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE supporters (id TEXT PRIMARY KEY, private_name TEXT NOT NULL, email TEXT NOT NULL, organisation TEXT NOT NULL DEFAULT '', public_display_name TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', public_consent INTEGER NOT NULL DEFAULT 0 CHECK(public_consent IN (0,1)), anonymous INTEGER NOT NULL DEFAULT 1 CHECK(anonymous IN (0,1)), display_amount INTEGER NOT NULL DEFAULT 0, display_level INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Hidden')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE support_transactions (id TEXT PRIMARY KEY, supporter_id TEXT NOT NULL REFERENCES supporters(id), provider_reference TEXT UNIQUE, amount_minor INTEGER NOT NULL CHECK(amount_minor>0), currency TEXT NOT NULL DEFAULT 'GBP', status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Paid','Refunded','Failed')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX transactions_supporter ON support_transactions(supporter_id,status);
CREATE TABLE webhook_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE consent_records (id TEXT PRIMARY KEY, subject_id TEXT NOT NULL, purpose TEXT NOT NULL, version TEXT NOT NULL, granted INTEGER NOT NULL CHECK(granted IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX consent_subject ON consent_records(subject_id,purpose);
CREATE TABLE organisations (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', logo_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published')), relationship_confirmed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE roadmap_phases (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Planned', sort_order INTEGER NOT NULL DEFAULT 0, start_date TEXT, target_date TEXT, related_url TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE roadmap_milestones (id TEXT PRIMARY KEY, phase_id TEXT NOT NULL REFERENCES roadmap_phases(id) ON DELETE CASCADE, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Planned', sort_order INTEGER NOT NULL DEFAULT 0);
CREATE INDEX roadmap_milestone_phase ON roadmap_milestones(phase_id,sort_order);
CREATE TABLE research_updates (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL, content TEXT NOT NULL, author_organisation TEXT NOT NULL DEFAULT 'Igbo AI', status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published')), published_at TEXT, related_url TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX updates_published ON research_updates(status,published_at);
CREATE TABLE resources (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, url TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Research', licence TEXT NOT NULL DEFAULT '', doi TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE funding_campaigns (id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, target_minor INTEGER, verified_total_minor INTEGER, currency TEXT NOT NULL DEFAULT 'GBP', status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE project_statuses (slug TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'Planned', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE experiments (id TEXT PRIMARY KEY, title TEXT NOT NULL, protocol_version TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Planned', consent_version TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE experiment_responses (id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL REFERENCES experiments(id), anonymous_session TEXT NOT NULL, response TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE lab_feedback (id TEXT PRIMARY KEY, experiment_id TEXT REFERENCES experiments(id), category TEXT NOT NULL, feedback TEXT NOT NULL, expected_dialect TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE audit_log (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX audit_created ON audit_log(created_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE email_outbox (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO site_settings(key,value) VALUES ('forms_enabled','false'),('payments_enabled','false'),('consent_version','prelaunch-v1');
INSERT INTO project_statuses(slug) VALUES ('igbopronounce'),('igbotone'),('igbophonemizer'),('igbospeech'),('igbospeechbench'),('igbolm');
INSERT INTO roadmap_phases(id,title,description,status,sort_order) VALUES
('phase-0','Landscape & Research','Understand the foundations. Define the questions worth asking.','Research',0),
('phase-1','Linguistic Foundation','Build a carefully annotated foundation for pronunciation, tone and dialect.','Planned',1),
('phase-2','IgboSpeechBench','Establish transparent baselines and native-speaker evaluation.','Planned',2),
('phase-3','IgboSpeech TTS','Test whether explicit linguistic supervision improves naturalness.','Planned',3),
('phase-4','Dialect Expansion','Expand representation in collaboration with dialect communities.','Planned',4),
('phase-5','IgboSpeech ASR','Explore recognition that respects the way people actually speak.','Planned',5),
('phase-6','Conversational Igbo AI','Bring language understanding and speech into a shared experience.','Planned',6);
INSERT INTO roadmap_milestones(id,phase_id,title,sort_order) VALUES
('m0','phase-0','Review existing datasets and models',0),('m1','phase-0','Engage linguistic and research collaborators',1),('m2','phase-0','Define the evaluation methodology',2),
('m3','phase-1','Agree annotation guidelines',0),('m4','phase-1','Define consent and licensing requirements',1),('m5','phase-1','Design the pronunciation resource',2),
('m6','phase-2','Publish a benchmark specification',0),('m7','phase-2','Design blind comparisons',1),('m8','phase-2','Evaluate baseline systems',2),
('m9','phase-3','Train evidence-led prototypes',0),('m10','phase-3','Compare tone and phoneme supervision',1),('m11','phase-3','Publish limitations and findings',2),
('m12','phase-4','Agree dialect review methodology',0),('m13','phase-4','Broaden speaker participation',1),('m14','phase-4','Evaluate variety-specific performance',2),
('m15','phase-5','Establish transcription baselines',0),('m16','phase-5','Study names and code-switching',1),('m17','phase-5','Evaluate with native speakers',2),
('m18','phase-6','Connect provider interfaces',0),('m19','phase-6','Study conversational quality',1),('m20','phase-6','Release evidence-dependent experiments',2);
