# Data retention operations

Approved schedule: 6 September 2026. Owner: Galaxyway AI Ltd. Privacy contact: support@igbo.ai.

| Record                                        | Review/deletion deadline                                    |
| --------------------------------------------- | ----------------------------------------------------------- |
| Inactive collaboration                        | 24 months after last meaningful contact                     |
| Active collaborator                           | Relationship duration plus 24 months after it ends          |
| Unsuccessful sponsorship                      | 24 months after last meaningful contact                     |
| Transactional email records and provider logs | Normally no more than 12 months                             |
| Security/application logs                     | Normally no more than 90 days                               |
| Admin audit logs                              | Normally no more than 24 months                             |
| Contractual/accounting/legal records          | As legally required; potentially six years where applicable |

Review monthly. Delete or anonymise earlier when no longer needed. Record a specific legal-hold reason rather than retaining all enquiries indefinitely. Migration 0006 records policy and provides relationship-end/hold fields. Set the relationship end date when a relationship ends; review archived records against actual last contact. Database dates must reflect meaningful contact, not merely viewing a record.

Use the protected Research Desk to review records. A designated administrator then runs parameterised D1 operations for the selected IDs: remove associated collaborator notes and consent/acknowledgement records, delete or anonymise the enquiry, and remove related email records. Check audit snapshots for copied personal information. Do not place the removed values into a new audit entry. Keep only an ID, action, date and necessary justification. Exclude records subject to a documented hold. Backups and exports require access restrictions and an expiry date; purge expired exports as part of the same review. Never copy staging enquiry data to production.

Read-only review examples (do not treat these queries as automatic deletion approval):

```sql
SELECT id,status,updated_at,relationship_ended_at FROM collaborators
WHERE retention_hold_reason='' AND
 ((status NOT IN ('Active Collaborator','Partner') AND updated_at < datetime('now','-24 months'))
 OR (relationship_ended_at IS NOT NULL AND relationship_ended_at < datetime('now','-24 months')));
SELECT id,status FROM sponsorship_enquiries WHERE retention_hold_reason=''
 AND status IN ('Declined','Archived') AND COALESCE(updated_at,created_at) < datetime('now','-24 months');
SELECT id,status FROM email_outbox WHERE created_at < datetime('now','-12 months');
SELECT id,entity_type,entity_id FROM audit_log WHERE created_at < datetime('now','-24 months');
```

Provider responsibilities: confirm Resend delivery-log retention in its account settings/contract, including deletion requests; confirm Cloudflare logs and any exports are retained no longer than 90 days. The application does not log submitted form bodies or email content. D1 retention settings do not automatically delete provider logs. No new automatic destructive retention job is enabled; the owner must operate the documented monthly review.

Future voice collection is disabled. Its eventual consent record must separate ASR, TTS, generative AI, linguistic research, benchmarks, evaluation, open datasets, open models and permitted commercial downstream use, recording version, purpose, decision, timestamp and withdrawal state for each purpose. Keep identity separate from recording IDs. Explain withdrawal of unreleased identifiable recordings and the practical limits after lawful open release or distribution of model weights. No final contributor agreement is published by this preparation pass.
