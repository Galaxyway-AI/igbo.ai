-- Link the existing distinct dataset without duplicating the landscape entry.
INSERT OR IGNORE INTO research_update_resources(update_id,resource_id)
VALUES('landscape-review-v01','ibo-dict');
UPDATE resources SET notes='One of the most directly relevant existing resources for Igbo pronunciation and dialect research, with possible reuse after review. The repository is public, but file access requires sharing contact information and accepting conditions. Before ingestion, review the exact dataset version, access agreement, contributor provenance, recording permissions and any conditions alongside CC BY 4.0. No access agreement has been accepted and no recordings have been downloaded.' WHERE id='ibo-dict';
UPDATE research_updates SET updated_at=CURRENT_TIMESTAMP WHERE id='landscape-review-v01';
INSERT INTO audit_log(id,actor,action,entity_type,entity_id,new_value)
VALUES('final-ibo-dict-reference','Owner-requested final correction','update','updates','landscape-review-v01','{"added_reference":"ibo-dict"}');
