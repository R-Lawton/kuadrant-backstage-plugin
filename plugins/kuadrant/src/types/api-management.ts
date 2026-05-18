export type PlanTier = string; // custom tier names defined by api owners
export type RequestPhase = 'Pending' | 'Approved' | 'Rejected';
export type Lifecycle = 'experimental' | 'production' | 'deprecated' | 'retired';

export interface PlanLimits {
  daily?: number;
  weekly?: number;
  monthly?: number;
  yearly?: number;
  custom?: Array<{
    limit: number;
    window: string;
  }>;
}

// Status condition types for Kubernetes resources
export type OpenAPISpecConditionReason =
  | 'SpecFetched'
  | 'SpecSizeTooLarge'
  | 'FetchFailed';

/**
 * APIKey condition types from developer-portal-controller
 * https://github.com/Kuadrant/developer-portal-controller/blob/main/api/v1alpha1/apikey_types.go
 */
export type APIKeyConditionType =
  | 'Approved'   // API owner approved the request
  | 'Denied'     // API owner rejected the request
  | 'Pending'    // Awaiting approval
  | 'Failed';    // Processing error

export type StatusConditionType =
  | 'OpenAPISpecReady'
  | APIKeyConditionType
  | string; // Allow other condition types

/**
 * Kubernetes standard status condition (metav1.Condition)
 * Matches: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1#Condition
 */
export interface StatusCondition {
  /** Type of condition (e.g., 'Approved', 'Denied', 'Pending', 'Failed') */
  type: StatusConditionType;
  /** Status of the condition: True, False, or Unknown */
  status: 'True' | 'False' | 'Unknown';
  /** ObservedGeneration represents the .metadata.generation that the condition was set based upon */
  observedGeneration?: number;
  /** LastTransitionTime is when the condition last changed status */
  lastTransitionTime?: string;
  /** Reason is a programmatic identifier for the condition's last transition */
  reason?: OpenAPISpecConditionReason | string;
  /** Message is a human-readable explanation */
  message?: string;
}

export interface APIKeySpec {
  apiProductRef: {
    name: string;
    namespace: string;
  };
  planTier: PlanTier;
  useCase: string;
  requestedBy: {
    userId: string;
    email: string;
  };
  secretRef: {
    name: string;
  };
}

// Authorino v1beta3 Credentials types
export interface CredentialsAuthorizationHeader {
  prefix?: string;
}

export interface CredentialsCustomHeader {
  name: string;
  prefix?: string;
}

export interface CredentialsNamed {
  name: string;
}

export interface Credentials {
  authorizationHeader?: CredentialsAuthorizationHeader;
  customHeader?: CredentialsCustomHeader;
  queryString?: CredentialsNamed;
  cookie?: CredentialsNamed;
}

// Authorino v1beta3 AuthenticationSpec types
export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: Array<{
    key: string;
    operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
    values?: string[];
  }>;
}

export interface AuthenticationSpec {
  selector?: LabelSelector;
  allNamespaces?: boolean;
}

export interface APIKeyAuthScheme {
  authenticationSpec?: AuthenticationSpec;
  credentials?: Credentials;
}

export interface APIKeyStatus {
  /** @deprecated Use getAPIKeyPhase(conditions) instead. Will be removed after all components migrated. */
  phase?: RequestPhase;
  /** @deprecated Will be removed in future version. */
  reviewedBy?: string;
  /** @deprecated Will be removed in future version. */
  reviewedAt?: string;
  /** @deprecated Use spec.secretRef instead. */
  secretRef?: { name: string; key: string };
  /** @deprecated Secret viewing no longer restricted. Will be removed in future version. */
  canReadSecret?: boolean;

  apiHostname?: string;
  limits?: PlanLimits;
  authScheme?: APIKeyAuthScheme;
  conditions?: StatusCondition[];
}

export interface APIKey {
  apiVersion: 'devportal.kuadrant.io/v1alpha1';
  kind: 'APIKey';
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: APIKeySpec;
  status?: APIKeyStatus;
}

export interface APIKeyRequest {
  apiProductName: string,
  namespace: string,
  planTier: PlanTier,
  useCase: string,
  userEmail: string,
  secretName: string
}

export interface APIProductSpec {
  displayName: string;
  description?: string;
  version?: string;
  tags?: string[];
  targetRef: {
    group: string;
    kind: string;
    name: string;
    namespace: string;
  };
  approvalMode: 'automatic' | 'manual';
  publishStatus: 'Draft' | 'Published';
  documentation?: {
    openAPISpecURL?: string;
    swaggerUI?: string;
    docsURL?: string;
    gitRepository?: string;
    techdocsRef?: string;
  };
  contact?: {
    team?: string;
    email?: string;
    slack?: string;
    url?: string;
  };
}

export interface DiscoveredAuthScheme {
  authentication: Record<string, {
    apiKey?: {
      selector?: LabelSelector;
      allNamespaces?: boolean;
    };
    jwt?: {
      issuerUrl: string;
    };
    credentials?: Credentials;
    metrics?: boolean;
    priority?: number;
  }>;
}

export interface APIProductStatus {
  observedGeneration?: number;
  discoveredPlans?: Plan[];
  discoveredAuthScheme?: DiscoveredAuthScheme;
  openapi?: {
    raw: string;
    lastSyncTime: string;
  };
  oidcDiscovery?: {
    tokenEndpoint: string;
  };
  conditions?: StatusCondition[];
}

export interface APIProduct {
  apiVersion: 'devportal.kuadrant.io/v1alpha1';
  kind: 'APIProduct';
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: APIProductSpec;
  status?: APIProductStatus;
}

export interface Plan {
  tier: string;
  predicate?: string;
  description?: string;
  limits?: PlanLimits;
}

export interface PlanPolicy {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    targetRef: {
      kind: 'HTTPRoute' | 'Gateway';
      name: string;
      namespace?: string;
    };
    plans: Plan[];
  };
  status?: {
    conditions?: StatusCondition[];
  };
}

export interface BulkOperationResult {
  namespace: string;
  name: string;
  success: boolean;
  error?: string;
}

export interface ExtractedSecret {
  apiKey: string;
}

// TODO: The following might be better to have them in a different file or reuse with backend (?). Importend from k8s-client
// K8S resources

export interface K8sResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    [key: string]: any;
  };
  spec?: any;
  status?: any;
  data?: any;
  stringData?: any;
  [key: string]: any;
}

export interface K8sList {
  items: K8sResource[];
}

export interface AuthPolicy {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    targetRef: {
      kind: 'HTTPRoute' | 'Gateway';
      name: string;
      namespace?: string;
    };
  };
  status?: {
    conditions?: StatusCondition[];
  };
}

export interface RateLimitPolicy {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    targetRef: {
      kind: 'HTTPRoute' | 'Gateway';
      name: string;
      namespace?: string;
    };
  };
  status?: {
    conditions?: StatusCondition[];
  };
}
