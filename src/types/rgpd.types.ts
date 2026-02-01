// =====================================================
// RGPD TYPES
// Types pour la conformite RGPD
// =====================================================

// =====================================================
// ENUMS (mirroring DB enums)
// =====================================================

export const CONSENT_TYPES = {
  terms_of_service: 'terms_of_service',
  privacy_policy: 'privacy_policy',
  marketing_email: 'marketing_email',
  marketing_sms: 'marketing_sms',
  marketing_push: 'marketing_push',
  data_analytics: 'data_analytics',
  third_party_sharing: 'third_party_sharing',
  cookies_essential: 'cookies_essential',
  cookies_analytics: 'cookies_analytics',
  cookies_marketing: 'cookies_marketing',
} as const;

export type ConsentType = keyof typeof CONSENT_TYPES;

export const RGPD_REQUEST_TYPES = {
  data_export: 'data_export',
  data_deletion: 'data_deletion',
  data_rectification: 'data_rectification',
  processing_restriction: 'processing_restriction',
  objection: 'objection',
} as const;

export type RgpdRequestType = keyof typeof RGPD_REQUEST_TYPES;

export const RGPD_REQUEST_STATUS = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  rejected: 'rejected',
  cancelled: 'cancelled',
} as const;

export type RgpdRequestStatus = keyof typeof RGPD_REQUEST_STATUS;

// =====================================================
// INTERFACES
// =====================================================

export interface MemberConsent {
  id: string;
  org_id: string;
  member_id: string;
  consent_type: ConsentType;
  granted: boolean;
  source: string;
  ip_address?: string;
  user_agent?: string;
  document_version?: string;
  document_url?: string;
  consented_at: string;
  expires_at?: string;
  created_at: string;
}

export interface RgpdRequest {
  id: string;
  org_id: string;
  member_id?: string;
  request_type: RgpdRequestType;
  status: RgpdRequestStatus;
  requester_email: string;
  requester_name?: string;
  reason?: string;
  scope?: string[];
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  export_file_url?: string;
  export_file_expires_at?: string;
  ip_address?: string;
  user_agent?: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  // Relations
  member?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  processor?: {
    full_name: string;
    email: string;
  };
}

export interface RgpdAuditLog {
  id: string;
  org_id: string;
  user_id?: string;
  member_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =====================================================
// CONSENT CONFIG
// =====================================================

export interface ConsentConfig {
  type: ConsentType;
  label: string;
  description: string;
  required: boolean;
  category: 'legal' | 'marketing' | 'cookies';
}

export const CONSENT_CONFIG: Record<ConsentType, ConsentConfig> = {
  terms_of_service: {
    type: 'terms_of_service',
    label: 'Conditions Generales',
    description: "J'accepte les conditions generales d'utilisation du service.",
    required: true,
    category: 'legal',
  },
  privacy_policy: {
    type: 'privacy_policy',
    label: 'Politique de Confidentialite',
    description: "J'ai lu et j'accepte la politique de confidentialite.",
    required: true,
    category: 'legal',
  },
  marketing_email: {
    type: 'marketing_email',
    label: 'Emails Marketing',
    description: "J'accepte de recevoir des offres et actualites par email.",
    required: false,
    category: 'marketing',
  },
  marketing_sms: {
    type: 'marketing_sms',
    label: 'SMS Marketing',
    description: "J'accepte de recevoir des offres et actualites par SMS.",
    required: false,
    category: 'marketing',
  },
  marketing_push: {
    type: 'marketing_push',
    label: 'Notifications Push',
    description: "J'accepte de recevoir des notifications push marketing.",
    required: false,
    category: 'marketing',
  },
  data_analytics: {
    type: 'data_analytics',
    label: 'Analyse des Donnees',
    description: "J'accepte que mes donnees soient utilisees pour ameliorer le service.",
    required: false,
    category: 'legal',
  },
  third_party_sharing: {
    type: 'third_party_sharing',
    label: 'Partage avec Tiers',
    description:
      "J'accepte le partage de mes donnees avec les partenaires (paiement, etc.).",
    required: true,
    category: 'legal',
  },
  cookies_essential: {
    type: 'cookies_essential',
    label: 'Cookies Essentiels',
    description: 'Necessaires au fonctionnement du site (toujours actifs).',
    required: true,
    category: 'cookies',
  },
  cookies_analytics: {
    type: 'cookies_analytics',
    label: 'Cookies Analytiques',
    description: 'Permettent de mesurer la frequentation et les performances.',
    required: false,
    category: 'cookies',
  },
  cookies_marketing: {
    type: 'cookies_marketing',
    label: 'Cookies Marketing',
    description: 'Permettent de personnaliser les publicites.',
    required: false,
    category: 'cookies',
  },
};

// =====================================================
// DATA EXPORT TYPES
// =====================================================

export interface MemberDataExport {
  exportDate: string;
  member: {
    id: string;
    member_number?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    birth_date?: string;
    gender?: string;
    joined_at: string;
    created_at: string;
  };
  subscriptions: Array<{
    id: string;
    plan_name: string;
    status: string;
    start_date: string;
    end_date?: string;
    created_at: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description?: string;
    created_at: string;
  }>;
  classAttendances: Array<{
    class_name: string;
    date: string;
    status: string;
  }>;
  workoutScores: Array<{
    workout_name: string;
    score?: string;
    rx: boolean;
    date: string;
    notes?: string;
  }>;
  personalRecords: Array<{
    exercise: string;
    value: string;
    unit: string;
    date: string;
  }>;
  consents: Array<{
    type: string;
    granted: boolean;
    date: string;
  }>;
}

// =====================================================
// FORM TYPES
// =====================================================

export interface UpdateConsentsInput {
  memberId: string;
  consents: Array<{
    type: ConsentType;
    granted: boolean;
  }>;
}

export interface CreateRgpdRequestInput {
  requestType: RgpdRequestType;
  reason?: string;
  scope?: string[];
}

export interface ProcessRgpdRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}
