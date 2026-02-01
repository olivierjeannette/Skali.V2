'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/auth';
import type { TablesInsert } from '@/types/database.types';

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

interface ImportResult {
  total: number;
  imported: number;
  errors: string[];
}

interface MemberCSVRow {
  first_name?: string;
  firstName?: string;
  prenom?: string;
  last_name?: string;
  lastName?: string;
  nom?: string;
  email?: string;
  phone?: string;
  telephone?: string;
  birth_date?: string;
  birthDate?: string;
  date_naissance?: string;
  gender?: string;
  genre?: string;
  member_number?: string;
  memberNumber?: string;
  numero?: string;
}

function parseGender(value: string | undefined): 'male' | 'female' | 'other' | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (v === 'male' || v === 'homme' || v === 'm' || v === 'h') return 'male';
  if (v === 'female' || v === 'femme' || v === 'f') return 'female';
  if (v === 'other' || v === 'autre') return 'other';
  return null;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;

  // Try different date formats
  const datePatterns = [
    // ISO format: 2000-01-15
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // French format: 15/01/2000
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // French format: 15-01-2000
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ];

  for (const pattern of datePatterns) {
    const match = value.trim().match(pattern);
    if (match) {
      if (pattern === datePatterns[0]) {
        return value.trim();
      } else {
        // Convert to ISO format
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  return null;
}

function normalizeCSVRow(row: MemberCSVRow): {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: 'male' | 'female' | 'other' | null;
  memberNumber: string | null;
} | null {
  const firstName = row.first_name || row.firstName || row.prenom;
  const lastName = row.last_name || row.lastName || row.nom;

  if (!firstName || !lastName) {
    return null;
  }

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: (row.email || '').trim() || null,
    phone: (row.phone || row.telephone || '').trim() || null,
    birthDate: parseDate(row.birth_date || row.birthDate || row.date_naissance),
    gender: parseGender(row.gender || row.genre),
    memberNumber: (row.member_number || row.memberNumber || row.numero || '').trim() || null,
  };
}

export async function importMembersFromCSV(
  csvData: string
): Promise<ActionResult<ImportResult>> {
  const supabase = await createClient();
  const org = await requireOrganization();

  const lines = csvData.split('\n').map((line) => line.trim()).filter(Boolean);

  if (lines.length < 2) {
    return { success: false, error: 'Le fichier CSV doit contenir au moins une ligne de donnees' };
  }

  // Parse header
  const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  // Map columns to standard names
  const columnMap: Record<string, string> = {};
  for (const col of header) {
    if (col.includes('prenom') || col === 'first_name' || col === 'firstname') {
      columnMap[col] = 'first_name';
    } else if (col.includes('nom') || col === 'last_name' || col === 'lastname') {
      columnMap[col] = 'last_name';
    } else if (col.includes('email') || col.includes('mail')) {
      columnMap[col] = 'email';
    } else if (col.includes('tel') || col.includes('phone')) {
      columnMap[col] = 'phone';
    } else if (col.includes('naissance') || col.includes('birth')) {
      columnMap[col] = 'birth_date';
    } else if (col.includes('genre') || col.includes('gender') || col.includes('sexe')) {
      columnMap[col] = 'gender';
    } else if (col.includes('numero') || col.includes('number') || col === 'num' || col === 'id') {
      columnMap[col] = 'member_number';
    }
  }

  const errors: string[] = [];
  const membersToInsert: TablesInsert<'members'>[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma or semicolon, handling quoted values
    const values = line.match(/("([^"]*)"|[^,;]+)/g)?.map((v) => v.replace(/"/g, '').trim()) || [];

    if (values.length < header.length) {
      errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect`);
      continue;
    }

    const row: MemberCSVRow = {};
    for (let j = 0; j < header.length; j++) {
      const mappedKey = columnMap[header[j]] || header[j];
      (row as Record<string, string>)[mappedKey] = values[j] || '';
    }

    const normalized = normalizeCSVRow(row);
    if (!normalized) {
      errors.push(`Ligne ${i + 1}: Prenom et nom requis`);
      continue;
    }

    membersToInsert.push({
      org_id: org.id,
      first_name: normalized.firstName,
      last_name: normalized.lastName,
      email: normalized.email,
      phone: normalized.phone,
      birth_date: normalized.birthDate,
      gender: normalized.gender,
      member_number: normalized.memberNumber,
      status: 'active',
      tags: [],
      emergency_contact: {},
      medical_info: {},
    });
  }

  if (membersToInsert.length === 0) {
    return {
      success: false,
      error: 'Aucun membre valide trouve dans le fichier',
    };
  }

  // Insert in batches of 100
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < membersToInsert.length; i += batchSize) {
    const batch = membersToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('members').insert(batch);

    if (error) {
      errors.push(`Erreur batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      imported += batch.length;
    }
  }

  revalidatePath('/dashboard/members');

  return {
    success: true,
    data: {
      total: lines.length - 1,
      imported,
      errors,
    },
  };
}

// Generate CSV template
export async function getCSVTemplate(): Promise<string> {
  return `prenom;nom;email;telephone;date_naissance;genre;numero
Jean;Dupont;jean@exemple.com;0612345678;1990-01-15;homme;001
Marie;Martin;marie@exemple.com;0698765432;1985-06-20;femme;002`;
}
