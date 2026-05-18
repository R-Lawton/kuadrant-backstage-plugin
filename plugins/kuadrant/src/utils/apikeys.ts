import { APIKeyStatus } from '../types/api-management';

/**
 * Parse APIKey status conditions to determine current phase.
 *
 * The controller ensures only ONE condition is True at any given time.
 * Priority order matches controller logic (highest to lowest):
 * 1. Failed - processing error
 * 2. Denied - explicitly rejected
 * 3. Approved - explicitly approved
 * 4. Pending - awaiting approval (default state)
 *
 * @param conditions - Status conditions from APIKey resource
 * @returns Current phase of the API key request
 */
export function getAPIKeyPhase(
  conditions?: APIKeyStatus['conditions']
): 'Pending' | 'Approved' | 'Denied' | 'Failed' {
  if (!conditions || conditions.length === 0) {
    return 'Pending';
  }

  // Check in priority order (matches controller reconciliation order)

  // 1. Failed - highest priority (processing error)
  const failed = conditions.find(
    c => c.type === 'Failed' && c.status === 'True'
  );
  if (failed) return 'Failed';

  // 2. Denied - explicitly rejected by owner
  const denied = conditions.find(
    c => c.type === 'Denied' && c.status === 'True'
  );
  if (denied) return 'Denied';

  // 3. Approved - explicitly approved by owner
  const approved = conditions.find(
    c => c.type === 'Approved' && c.status === 'True'
  );
  if (approved) return 'Approved';

  // 4. Pending - awaiting approval (controller sets explicit Pending condition)
  const pending = conditions.find(
    c => c.type === 'Pending' && c.status === 'True'
  );
  if (pending) return 'Pending';

  // Default: no condition is True (shouldn't happen, but defensive)
  return 'Pending';
}
