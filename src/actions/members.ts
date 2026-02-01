'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { TablesInsert, TablesUpdate, Member } from '@/types/database.types';
import { requireOrganization } from '@/lib/auth';
import { sendWelcomeEmail } from './notifications';

// Schemas
const createMemberSchema = z.object({
  firstName: z.string().min(1, 'Prenom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  memberNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  medicalInfo: z.object({
    allergies: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
});

const updateMemberSchema = createMemberSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'inactive', 'suspended', 'archived']).optional(),
});

// Types
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Get all members for organization with optional filters
export async function getMembers(
  orgId: string,
  options?: {
    query?: string;
    status?: 'active' | 'inactive' | 'suspended';
    page?: number;
    pageSize?: number;
  }
): Promise<Member[]> {
  const supabase = await createClient();

  let queryBuilder = supabase
    .from('members')
    .select('*')
    .eq('org_id', orgId)
    .neq('status', 'archived');

  // Filter by status if provided
  if (options?.status) {
    queryBuilder = queryBuilder.eq('status', options.status);
  }

  // Search by name or email if query provided
  if (options?.query) {
    const searchQuery = options.query.trim();
    queryBuilder = queryBuilder.or(
      `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
    );
  }

  // Apply pagination if provided
  if (options?.page !== undefined && options?.pageSize) {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;
    queryBuilder = queryBuilder.range(from, to);
  }

  const { data, error } = await queryBuilder.order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return data || [];
}

// Get paginated members with total count
export async function getMembersPaginated(
  orgId: string,
  options: {
    query?: string;
    status?: 'active' | 'inactive' | 'suspended';
    page: number;
    pageSize: number;
  }
): Promise<{ members: Member[]; total: number; totalPages: number }> {
  const supabase = await createClient();

  // Base query for count
  let countQuery = supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('status', 'archived');

  // Data query
  let dataQuery = supabase
    .from('members')
    .select('*')
    .eq('org_id', orgId)
    .neq('status', 'archived');

  // Apply filters to both queries
  if (options.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }

  if (options.query) {
    const searchQuery = options.query.trim();
    const filter = `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  // Apply pagination to data query
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;
  dataQuery = dataQuery.range(from, to).order('last_name', { ascending: true });

  // Execute both queries
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error || dataResult.error) {
    console.error('Error fetching members:', countResult.error || dataResult.error);
    return { members: [], total: 0, totalPages: 0 };
  }

  const total = countResult.count || 0;
  const totalPages = Math.ceil(total / options.pageSize);

  return {
    members: dataResult.data || [],
    total,
    totalPages,
  };
}

// Get member by ID
export async function getMember(memberId: string): Promise<Member | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error) {
    console.error('Error fetching member:', error);
    return null;
  }

  return data;
}

// Create member
export async function createMember(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const org = await requireOrganization();
  const orgId = org.id;

  const rawData = {
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    birthDate: formData.get('birthDate') as string,
    gender: formData.get('gender') as string,
    memberNumber: formData.get('memberNumber') as string,
    tags: formData.getAll('tags') as string[],
    emergencyContact: {
      name: formData.get('emergencyName') as string,
      phone: formData.get('emergencyPhone') as string,
      relationship: formData.get('emergencyRelationship') as string,
    },
    medicalInfo: {
      notes: formData.get('medicalNotes') as string,
    },
  };

  const parsed = createMemberSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Donnees invalides' };
  }

  const data = parsed.data;

  const memberData: TablesInsert<'members'> = {
    org_id: orgId,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email || null,
    phone: data.phone || null,
    birth_date: data.birthDate || null,
    gender: data.gender || null,
    member_number: data.memberNumber || null,
    tags: data.tags || [],
    emergency_contact: data.emergencyContact || {},
    medical_info: data.medicalInfo || {},
    status: 'active',
  };

  const { data: member, error } = await supabase
    .from('members')
    .insert(memberData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating member:', error);
    return { success: false, error: 'Erreur lors de la creation du membre' };
  }

  // Envoyer email de bienvenue si l'email est fourni
  if (data.email) {
    sendWelcomeEmail(
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      orgId
    ).catch((err) => console.error('Error sending welcome email:', err));
  }

  // Trigger workflow for new member
  import('@/lib/workflows/triggers')
    .then(({ triggerMemberCreated }) =>
      triggerMemberCreated(orgId, member.id, {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
      })
    )
    .catch((err) => console.error('Error triggering member created workflow:', err));

  revalidatePath('/dashboard/members');
  return { success: true, data: { id: member.id } };
}

// Update member
export async function updateMember(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const memberId = formData.get('id') as string;

  const rawData = {
    id: memberId,
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    birthDate: formData.get('birthDate') as string,
    gender: formData.get('gender') as string,
    memberNumber: formData.get('memberNumber') as string,
    status: formData.get('status') as string,
    tags: formData.getAll('tags') as string[],
    emergencyContact: {
      name: formData.get('emergencyName') as string,
      phone: formData.get('emergencyPhone') as string,
      relationship: formData.get('emergencyRelationship') as string,
    },
    medicalInfo: {
      notes: formData.get('medicalNotes') as string,
    },
  };

  const parsed = updateMemberSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: 'Donnees invalides' };
  }

  const data = parsed.data;

  const updateData: TablesUpdate<'members'> = {};

  if (data.firstName) updateData.first_name = data.firstName;
  if (data.lastName) updateData.last_name = data.lastName;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.birthDate !== undefined) updateData.birth_date = data.birthDate || null;
  if (data.gender !== undefined) updateData.gender = data.gender || null;
  if (data.memberNumber !== undefined) updateData.member_number = data.memberNumber || null;
  if (data.status) updateData.status = data.status;
  if (data.tags) updateData.tags = data.tags;
  if (data.emergencyContact) updateData.emergency_contact = data.emergencyContact;
  if (data.medicalInfo) updateData.medical_info = data.medicalInfo;

  const { error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', memberId);

  if (error) {
    console.error('Error updating member:', error);
    return { success: false, error: 'Erreur lors de la mise a jour du membre' };
  }

  revalidatePath('/dashboard/members');
  revalidatePath(`/dashboard/members/${memberId}`);
  return { success: true };
}

// Delete (archive) member
export async function deleteMember(memberId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('members')
    .update({ status: 'archived' })
    .eq('id', memberId);

  if (error) {
    console.error('Error archiving member:', error);
    return { success: false, error: 'Erreur lors de la suppression du membre' };
  }

  revalidatePath('/dashboard/members');
  return { success: true };
}

// Get members count for organization
export async function getMembersCount(orgId: string): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('status')
    .eq('org_id', orgId)
    .neq('status', 'archived');

  if (error) {
    console.error('Error fetching members count:', error);
    return { total: 0, active: 0, inactive: 0 };
  }

  const total = data.length;
  const active = data.filter((m) => m.status === 'active').length;
  const inactive = total - active;

  return { total, active, inactive };
}

// Search members
export async function searchMembers(
  orgId: string,
  query: string
): Promise<Member[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('org_id', orgId)
    .neq('status', 'archived')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('last_name', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error searching members:', error);
    return [];
  }

  return data || [];
}

// Version with auto org context for client components
export async function searchMembersForCurrentOrg(query: string): Promise<Member[]> {
  const org = await requireOrganization();
  return searchMembers(org.id, query);
}

// Get all active members for current org (for selection lists)
export async function getActiveMembersForCurrentOrg(): Promise<Member[]> {
  const org = await requireOrganization();
  return getMembers(org.id, { status: 'active' });
}

// Export members to CSV format
export async function exportMembersToCSV(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  const org = await requireOrganization();
  const members = await getMembers(org.id);

  if (members.length === 0) {
    return { success: false, error: 'Aucun membre a exporter' };
  }

  // CSV Headers
  const headers = [
    'Numero',
    'Prenom',
    'Nom',
    'Email',
    'Telephone',
    'Date de naissance',
    'Genre',
    'Statut',
    'Tags',
    'Contact urgence - Nom',
    'Contact urgence - Telephone',
    'Contact urgence - Relation',
    'Info medicale',
    'Date inscription',
  ];

  // CSV Rows
  const rows = members.map((member) => {
    const emergencyContact = (member.emergency_contact as Record<string, string>) || {};
    const medicalInfo = (member.medical_info as Record<string, string>) || {};

    return [
      member.member_number || '',
      member.first_name,
      member.last_name,
      member.email || '',
      member.phone || '',
      member.birth_date || '',
      member.gender === 'male' ? 'Homme' : member.gender === 'female' ? 'Femme' : member.gender || '',
      member.status === 'active' ? 'Actif' : member.status === 'inactive' ? 'Inactif' : member.status === 'suspended' ? 'Suspendu' : member.status,
      (member.tags || []).join('; '),
      emergencyContact.name || '',
      emergencyContact.phone || '',
      emergencyContact.relationship || '',
      medicalInfo.notes || '',
      member.created_at ? new Date(member.created_at).toLocaleDateString('fr-FR') : '',
    ];
  });

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV string
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility
  const csvWithBOM = '\uFEFF' + csvContent;

  return { success: true, data: csvWithBOM };
}
