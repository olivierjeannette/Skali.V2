'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shuffle,
  Trash2,
  Tv,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
} from 'lucide-react';
import { createRandomTeams, deleteTeam, type Team, type TeamTemplate } from '@/actions/teams';
import { showTVTeams } from '@/actions/tv';
import type { Member } from '@/types/database.types';
import { useRouter } from 'next/navigation';

// Format teams for TV display (client-side helper)
function formatTeamsForTV(teams: Team[]): Array<{
  name: string;
  color: string;
  members: Array<{ id: string; name: string; station?: string }>;
}> {
  return teams.map(team => ({
    name: team.name,
    color: team.color,
    members: (team.members || []).map(tm => ({
      id: tm.member.id,
      name: `${tm.member.first_name} ${tm.member.last_name}`,
      station: tm.station || undefined,
    })),
  }));
}

interface TeamsManagerProps {
  orgId: string;
  teams: Team[];
  members: Member[];
  templates: TeamTemplate[];
}

// Default team colors
const DEFAULT_COLORS = [
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Vert', value: '#10B981' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Jaune', value: '#EAB308' },
];

export function TeamsManager({ orgId, teams, members, templates }: TeamsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDrawDialogOpen, setIsDrawDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [balanceBy, setBalanceBy] = useState<'random' | 'gender'>('random');
  const [teamNames, setTeamNames] = useState<string[]>(['Equipe 1', 'Equipe 2']);
  const [teamColors, setTeamColors] = useState<string[]>(['#EF4444', '#3B82F6']);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter members by search
  const filteredMembers = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle team count change
  const handleTeamCountChange = (count: number) => {
    setTeamCount(count);
    const newNames = Array.from({ length: count }, (_, i) => teamNames[i] || `Equipe ${i + 1}`);
    const newColors = Array.from({ length: count }, (_, i) => teamColors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length].value);
    setTeamNames(newNames);
    setTeamColors(newColors);
  };

  // Toggle member selection
  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Select all members
  const selectAllMembers = () => {
    setSelectedMembers(members.map(m => m.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedMembers([]);
  };

  // Run random draw
  const handleRandomDraw = () => {
    if (selectedMembers.length < 2) {
      alert('Selectionnez au moins 2 membres');
      return;
    }

    startTransition(async () => {
      const result = await createRandomTeams({
        memberIds: selectedMembers,
        teamCount,
        teamNames,
        teamColors,
        balanceBy,
      });

      if (result.success) {
        setIsDrawDialogOpen(false);
        setSelectedMembers([]);
        router.refresh();
      } else {
        alert(result.error || 'Erreur lors du tirage');
      }
    });
  };

  // Apply template
  const handleApplyTemplate = (template: TeamTemplate) => {
    setTeamCount(template.config.team_count);
    setTeamNames(template.config.team_names);
    setTeamColors(template.config.team_colors);
    setBalanceBy(template.config.balance_by === 'gender' ? 'gender' : 'random');
  };

  // Delete a team
  const handleDeleteTeam = (teamId: string) => {
    if (!confirm('Supprimer cette equipe ?')) return;

    startTransition(async () => {
      const result = await deleteTeam(teamId);
      if (result.success) {
        router.refresh();
      }
    });
  };

  // Show teams on TV
  const handleShowOnTV = () => {
    if (teams.length === 0) return;

    startTransition(async () => {
      const teamsData = formatTeamsForTV(teams);
      await showTVTeams(orgId, teamsData);
      router.refresh();
    });
  };

  // Toggle team expansion
  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                Tirage au sort
              </CardTitle>
              <CardDescription>
                Creez des equipes aleatoirement a partir des membres selectionnes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {teams.length > 0 && (
                <Button variant="outline" onClick={handleShowOnTV} disabled={isPending}>
                  <Tv className="mr-2 h-4 w-4" />
                  Afficher sur TV
                </Button>
              )}
              <Dialog open={isDrawDialogOpen} onOpenChange={setIsDrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Nouveau tirage
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tirage au sort</DialogTitle>
                    <DialogDescription>
                      Selectionnez les membres et configurez le tirage
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Templates */}
                    {templates.length > 0 && (
                      <div className="space-y-2">
                        <Label>Appliquer un template</Label>
                        <div className="flex flex-wrap gap-2">
                          {templates.map(t => (
                            <Button
                              key={t.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleApplyTemplate(t)}
                            >
                              {t.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Configuration */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nombre d&apos;equipes</Label>
                        <Select
                          value={teamCount.toString()}
                          onValueChange={v => handleTeamCountChange(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8].map(n => (
                              <SelectItem key={n} value={n.toString()}>
                                {n} equipes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Equilibrage</Label>
                        <Select
                          value={balanceBy}
                          onValueChange={v => setBalanceBy(v as 'random' | 'gender')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="random">Aleatoire pur</SelectItem>
                            <SelectItem value="gender">Equilibre H/F</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Team Names & Colors */}
                    <div className="space-y-2">
                      <Label>Noms et couleurs des equipes</Label>
                      <div className="space-y-2">
                        {teamNames.map((name, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div
                              className="w-8 h-8 rounded-md border cursor-pointer"
                              style={{ backgroundColor: teamColors[i] }}
                              onClick={() => {
                                const nextColor = DEFAULT_COLORS[(DEFAULT_COLORS.findIndex(c => c.value === teamColors[i]) + 1) % DEFAULT_COLORS.length];
                                const newColors = [...teamColors];
                                newColors[i] = nextColor.value;
                                setTeamColors(newColors);
                              }}
                            />
                            <Input
                              value={name}
                              onChange={e => {
                                const newNames = [...teamNames];
                                newNames[i] = e.target.value;
                                setTeamNames(newNames);
                              }}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Membres ({selectedMembers.length} selectionnes)</Label>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={selectAllMembers}>
                            Tout selectionner
                          </Button>
                          <Button variant="ghost" size="sm" onClick={clearSelection}>
                            Effacer
                          </Button>
                        </div>
                      </div>

                      <Input
                        placeholder="Rechercher un membre..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />

                      <div className="border rounded-lg max-h-64 overflow-y-auto">
                        {filteredMembers.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            Aucun membre trouve
                          </div>
                        ) : (
                          <div className="divide-y">
                            {filteredMembers.map(member => (
                              <label
                                key={member.id}
                                className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedMembers.includes(member.id)}
                                  onCheckedChange={() => toggleMember(member.id)}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {member.first_name} {member.last_name}
                                  </div>
                                  {member.gender && (
                                    <div className="text-xs text-muted-foreground">
                                      {member.gender === 'male' ? 'Homme' : member.gender === 'female' ? 'Femme' : 'Autre'}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDrawDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleRandomDraw}
                      disabled={isPending || selectedMembers.length < 2}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Tirage en cours...
                        </>
                      ) : (
                        <>
                          <Shuffle className="mr-2 h-4 w-4" />
                          Lancer le tirage
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Display */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Aucune equipe creee. Lancez un tirage au sort pour commencer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map(team => {
            const isExpanded = expandedTeams.has(team.id);
            const memberCount = team.members?.length || 0;

            return (
              <Card
                key={team.id}
                className="overflow-hidden"
                style={{ borderTopColor: team.color, borderTopWidth: '4px' }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{memberCount} membres</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleTeamExpand(team.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteTeam(team.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-1">
                        {team.members.map((tm, i) => (
                          <div
                            key={tm.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm w-6">
                                {i + 1}.
                              </span>
                              <span>
                                {tm.member.first_name} {tm.member.last_name}
                              </span>
                            </div>
                            {tm.station && (
                              <Badge variant="outline" className="text-xs">
                                {tm.station}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Aucun membre dans cette equipe
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
