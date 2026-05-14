import { APIKeyStatus } from '../types/api-management';

export function getAPIKeyPhase(
  conditions?: APIKeyStatus['conditions']
): 'Pending' | 'Approved' | 'Denied' | 'Failed' {
  if (!conditions || conditions.length === 0) {
    return 'Pending';
  }

  const approved = conditions.find(
    c => c.type === 'Approved' && c.status === 'True'
  );
  if (approved) return 'Approved';

  const denied = conditions.find(
    c => c.type === 'Denied' && c.status === 'True'
  );
  if (denied) return 'Denied';

  const failed = conditions.find(
    c => c.type === 'Failed' && c.status === 'True'
  );
  if (failed) return 'Failed';

  return 'Pending';
}
