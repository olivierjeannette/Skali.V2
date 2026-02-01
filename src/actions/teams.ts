'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/auth';
import type { Member } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface Team {
  id: string;
  org_id: string;
  class_id: string | null;
  workout_id: string | null;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
  members?: TeamMemberWithDetails[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  member_id: string;
  position: number;
  station: string | null;
  created_at: string;
}

export interface TeamMemberWithDetails extends TeamMember {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface CardioStation {
  id: string;
  org_id: string;
  type: string;
  name: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamTemplate {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  config: {
    team_count: number;
    team_names: string[];
    team_colors: string[];
    balance_by: 'random' | 'gender' | 'skill_level' | 'manual';
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Result types for server actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Default team colors
const DEFAULT_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

// Cardio station types (used by client components)
const CARDIO_STATION_TYPES = [
  { value: 'rower', label: 'Rower' },
  { value: 'assault_bike', label: 'Assault Bike' },
  { value: 'echo_bike', label: 'Echo Bike' },
  { value: 'ski_erg', label: 'Ski Erg' },
  { value: 'bike_erg', label: 'Bike Erg' },
  { value: 'treadmill', label: 'Treadmill' },
  { value: 'other', label: 'Autre' },
] as const;

// =====================================================
// TEAM ACTIONS
// =====================================================

/**
 * Get all teams for a class or org
 */
export async function getTeams(
  classId?: string
): Promise<Team[]> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('teams')
    .select(`
      *,
      members:team_members(
        *,
        member:members(id, first_name, last_name, avatar_url)
      )
    `)
    .eq('org_id', orgId)
    .order('position');

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching teams:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single team by ID
 */
export async function getTeam(teamId: string): Promise<Team | null> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('teams')
    .select(`
      *,
      members:team_members(
        *,
        member:members(id, first_name, last_name, avatar_url)
      )
    `)
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('Error fetching team:', error);
    return null;
  }

  return data;
}

/**
 * Create a new team
 */
export async function createTeam(input: {
  name: string;
  color?: string;
  classId?: string;
  workoutId?: string;
  position?: number;
}): Promise<ActionResult<Team>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('teams')
    .insert({
      org_id: orgId,
      name: input.name,
      color: input.color || DEFAULT_COLORS[0],
      class_id: input.classId || null,
      workout_id: input.workoutId || null,
      position: input.position ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  input: {
    name?: string;
    color?: string;
    position?: number;
  }
): Promise<ActionResult<Team>> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('teams')
    .update({
      ...(input.name && { name: input.name }),
      ...(input.color && { color: input.color }),
      ...(input.position !== undefined && { position: input.position }),
    })
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

/**
 * Delete all teams for a class
 */
export async function deleteTeamsForClass(classId: string): Promise<ActionResult> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('teams')
    .delete()
    .eq('org_id', orgId)
    .eq('class_id', classId);

  if (error) {
    console.error('Error deleting teams:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

// =====================================================
// TEAM MEMBER ACTIONS
// =====================================================

/**
 * Add a member to a team
 */
export async function addMemberToTeam(
  teamId: string,
  memberId: string,
  station?: string
): Promise<ActionResult<TeamMember>> {
  await requireOrganization();
  const supabase = await createClient();

  // Get next position
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('team_members')
    .select('position')
    .eq('team_id', teamId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('team_members')
    .insert({
      team_id: teamId,
      member_id: memberId,
      position: nextPosition,
      station: station || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding member to team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

/**
 * Remove a member from a team
 */
export async function removeMemberFromTeam(
  teamId: string,
  memberId: string
): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('member_id', memberId);

  if (error) {
    console.error('Error removing member from team:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

/**
 * Update member station assignment
 */
export async function updateMemberStation(
  teamId: string,
  memberId: string,
  station: string | null
): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('team_members')
    .update({ station })
    .eq('team_id', teamId)
    .eq('member_id', memberId);

  if (error) {
    console.error('Error updating station:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

// =====================================================
// RANDOM DRAW ACTIONS
// =====================================================

/**
 * Random draw: Create teams from a list of members
 */
export async function createRandomTeams(input: {
  memberIds: string[];
  teamCount: number;
  teamNames?: string[];
  teamColors?: string[];
  classId?: string;
  workoutId?: string;
  balanceBy?: 'random' | 'gender';
}): Promise<ActionResult<Team[]>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  const { memberIds, teamCount, classId, workoutId, balanceBy = 'random' } = input;
  const teamNames = input.teamNames || Array.from({ length: teamCount }, (_, i) => `Equipe ${i + 1}`);
  const teamColors = input.teamColors || DEFAULT_COLORS.slice(0, teamCount);

  // Delete existing teams for this class if any
  if (classId) {
    await deleteTeamsForClass(classId);
  }

  // Shuffle members
  let membersToDistribute = [...memberIds];

  if (balanceBy === 'gender') {
    // Fetch member details for gender balancing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberDetails } = await (supabase as any)
      .from('members')
      .select('id, gender')
      .in('id', memberIds);

    if (memberDetails) {
      const males = memberDetails.filter((m: Member) => m.gender === 'male').map((m: Member) => m.id);
      const females = memberDetails.filter((m: Member) => m.gender === 'female').map((m: Member) => m.id);
      const others = memberDetails.filter((m: Member) => m.gender !== 'male' && m.gender !== 'female').map((m: Member) => m.id);

      // Shuffle each group
      shuffleArray(males);
      shuffleArray(females);
      shuffleArray(others);

      // Interleave for balanced distribution
      membersToDistribute = [];
      const maxLen = Math.max(males.length, females.length, others.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < males.length) membersToDistribute.push(males[i]);
        if (i < females.length) membersToDistribute.push(females[i]);
        if (i < others.length) membersToDistribute.push(others[i]);
      }
    }
  } else {
    // Pure random shuffle
    shuffleArray(membersToDistribute);
  }

  // Create teams
  const createdTeams: Team[] = [];
  for (let i = 0; i < teamCount; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: team, error: teamError } = await (supabase as any)
      .from('teams')
      .insert({
        org_id: orgId,
        name: teamNames[i],
        color: teamColors[i % teamColors.length],
        class_id: classId || null,
        workout_id: workoutId || null,
        position: i,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      continue;
    }

    createdTeams.push(team);
  }

  // Distribute members to teams (round-robin)
  for (let i = 0; i < membersToDistribute.length; i++) {
    const teamIndex = i % teamCount;
    const team = createdTeams[teamIndex];
    if (!team) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('team_members')
      .insert({
        team_id: team.id,
        member_id: membersToDistribute[i],
        position: Math.floor(i / teamCount),
      });
  }

  // Fetch teams with members
  const teams = await getTeams(classId);

  revalidatePath('/dashboard/teams');
  return { success: true, data: teams };
}

/**
 * Random cardio station assignment
 */
export async function assignCardioStations(input: {
  memberIds: string[];
  stationType?: string;
}): Promise<ActionResult<Array<{ memberId: string; station: string }>>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // Get available stations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('cardio_stations')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('position');

  if (input.stationType) {
    query = query.eq('type', input.stationType);
  }

  const { data: stations, error } = await query;

  if (error) {
    console.error('Error fetching stations:', error);
    return { success: false, error: error.message };
  }

  if (!stations || stations.length === 0) {
    return { success: false, error: 'Aucune station disponible' };
  }

  // Shuffle members
  const shuffledMembers = [...input.memberIds];
  shuffleArray(shuffledMembers);

  // Assign stations (cycling through available stations)
  const assignments: Array<{ memberId: string; station: string }> = [];
  for (let i = 0; i < shuffledMembers.length; i++) {
    const station = stations[i % stations.length];
    assignments.push({
      memberId: shuffledMembers[i],
      station: station.name,
    });
  }

  return { success: true, data: assignments };
}

// =====================================================
// CARDIO STATION ACTIONS
// =====================================================

/**
 * Get all cardio stations
 */
export async function getCardioStations(): Promise<CardioStation[]> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('cardio_stations')
    .select('*')
    .eq('org_id', orgId)
    .order('type')
    .order('position');

  if (error) {
    console.error('Error fetching cardio stations:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a cardio station
 */
export async function createCardioStation(input: {
  type: string;
  name: string;
  position?: number;
}): Promise<ActionResult<CardioStation>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('cardio_stations')
    .insert({
      org_id: orgId,
      type: input.type,
      name: input.name,
      position: input.position ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cardio station:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

/**
 * Update a cardio station
 */
export async function updateCardioStation(
  stationId: string,
  input: {
    type?: string;
    name?: string;
    position?: number;
    isActive?: boolean;
  }
): Promise<ActionResult<CardioStation>> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('cardio_stations')
    .update({
      ...(input.type && { type: input.type }),
      ...(input.name && { name: input.name }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.isActive !== undefined && { is_active: input.isActive }),
    })
    .eq('id', stationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating cardio station:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

/**
 * Delete a cardio station
 */
export async function deleteCardioStation(stationId: string): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('cardio_stations')
    .delete()
    .eq('id', stationId);

  if (error) {
    console.error('Error deleting cardio station:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

/**
 * Bulk create cardio stations
 */
export async function bulkCreateCardioStations(input: {
  type: string;
  count: number;
  prefix?: string;
}): Promise<ActionResult<CardioStation[]>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  const typeLabel = CARDIO_STATION_TYPES.find(t => t.value === input.type)?.label || input.type;
  const prefix = input.prefix || typeLabel;

  const stations = Array.from({ length: input.count }, (_, i) => ({
    org_id: orgId,
    type: input.type,
    name: `${prefix} ${i + 1}`,
    position: i,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('cardio_stations')
    .insert(stations)
    .select();

  if (error) {
    console.error('Error creating cardio stations:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

// =====================================================
// TEAM TEMPLATE ACTIONS
// =====================================================

/**
 * Get all team templates
 */
export async function getTeamTemplates(): Promise<TeamTemplate[]> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('team_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('Error fetching team templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a team template
 */
export async function createTeamTemplate(input: {
  name: string;
  description?: string;
  config: TeamTemplate['config'];
}): Promise<ActionResult<TeamTemplate>> {
  const org = await requireOrganization();
  const orgId = org.id;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('team_templates')
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description || null,
      config: input.config,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating team template:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true, data };
}

/**
 * Delete a team template
 */
export async function deleteTeamTemplate(templateId: string): Promise<ActionResult> {
  await requireOrganization();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('team_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting team template:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/teams');
  return { success: true };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
