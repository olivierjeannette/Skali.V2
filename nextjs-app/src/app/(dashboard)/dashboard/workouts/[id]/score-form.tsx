'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Save } from 'lucide-react';
import { recordScore, type ScoreType } from '@/actions/workouts';
import { getMembers } from '@/actions/members';

// TODO: Replace with actual org ID from auth context
const DEMO_ORG_ID = 'demo-org-id';

const scoreTypeOptions: { value: ScoreType; label: string }[] = [
  { value: 'time', label: 'Temps' },
  { value: 'reps', label: 'Repetitions' },
  { value: 'rounds_reps', label: 'Rounds + Reps' },
  { value: 'weight', label: 'Poids' },
  { value: 'calories', label: 'Calories' },
  { value: 'distance', label: 'Distance' },
  { value: 'points', label: 'Points' },
];

interface Member {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
}

export function ScoreForm({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Form state
  const [memberId, setMemberId] = useState('');
  const [scoreType, setScoreType] = useState<ScoreType>('time');
  const [scoreValue, setScoreValue] = useState('');
  const [scoreSecondary, setScoreSecondary] = useState('');
  const [isRx, setIsRx] = useState(true);
  const [notes, setNotes] = useState('');

  // For time input
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const data = await getMembers(DEMO_ORG_ID, { status: 'active' });
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && members.length === 0) {
      loadMembers();
    }
  }, [isOpen, members.length, loadMembers]);

  const handleSubmit = async () => {
    if (!memberId) {
      setError('Selectionnez un membre');
      return;
    }

    let finalScoreValue: number;

    if (scoreType === 'time') {
      const mins = parseInt(minutes) || 0;
      const secs = parseInt(seconds) || 0;
      finalScoreValue = mins * 60 + secs;
      if (finalScoreValue === 0) {
        setError('Entrez un temps valide');
        return;
      }
    } else {
      finalScoreValue = parseFloat(scoreValue);
      if (isNaN(finalScoreValue) || finalScoreValue <= 0) {
        setError('Entrez une valeur valide');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await recordScore(workoutId, memberId, {
        score_type: scoreType,
        score_value: finalScoreValue,
        score_secondary: scoreSecondary ? parseInt(scoreSecondary) : undefined,
        is_rx: isRx,
        notes: notes || undefined,
      });

      if ('id' in result) {
        // Reset form
        setMemberId('');
        setScoreValue('');
        setScoreSecondary('');
        setMinutes('');
        setSeconds('');
        setNotes('');
        setIsRx(true);
        setIsOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setIsOpen(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un score
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Member select */}
        <div className="space-y-2">
          <Label>Membre</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionnez un membre" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingMembers ? (
                <SelectItem value="loading" disabled>
                  Chargement...
                </SelectItem>
              ) : (
                members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Score type */}
        <div className="space-y-2">
          <Label>Type de score</Label>
          <Select
            value={scoreType}
            onValueChange={(v) => setScoreType(v as ScoreType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scoreTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Score value */}
        {scoreType === 'time' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minutes</Label>
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondes</Label>
              <Input
                type="number"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                placeholder="0"
                min="0"
                max="59"
              />
            </div>
          </div>
        ) : scoreType === 'rounds_reps' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rounds</Label>
              <Input
                type="number"
                value={scoreValue}
                onChange={(e) => setScoreValue(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>+ Reps</Label>
              <Input
                type="number"
                value={scoreSecondary}
                onChange={(e) => setScoreSecondary(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>
              {scoreType === 'weight'
                ? 'Poids (kg)'
                : scoreType === 'distance'
                  ? 'Distance (m)'
                  : scoreType === 'calories'
                    ? 'Calories'
                    : 'Valeur'}
            </Label>
            <Input
              type="number"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
        )}

        {/* RX toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="rx">Score RX</Label>
          <Switch id="rx" checked={isRx} onCheckedChange={setIsRx} />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optionnel)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Details, modifications..."
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
