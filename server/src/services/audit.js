import { run } from '../db/index.js';

export function record(actorId, action, entity, entityId = null, detail = null) {
  run(
    'INSERT INTO audit_log (actor_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
    actorId ?? null,
    action,
    entity,
    entityId,
    detail == null ? null : typeof detail === 'string' ? detail : JSON.stringify(detail),
  );
}
