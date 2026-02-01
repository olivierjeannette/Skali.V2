'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { getWorkoutScores, type WorkoutScore } from '@/actions/workouts';

interface TVLeaderboardProps {
  workoutId: string;
  workoutName: string;
}

export function TVLeaderboard({ workoutId, workoutName }: TVLeaderboardProps) {
  const [scores, setScores] = useState<WorkoutScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScores = async () => {
      const data = await getWorkoutScores(workoutId);
      // Sort scores
      const sorted = [...data].sort((a, b) => {
        if (a.is_rx !== b.is_rx) return b.is_rx ? 1 : -1;
        if (a.score_type === 'time') {
          return a.score_value - b.score_value;
        }
        return b.score_value - a.score_value;
      });
      setScores(sorted);
      setLoading(false);
    };

    loadScores();
    // Refresh every 10 seconds
    const interval = setInterval(loadScores, 10000);
    return () => clearInterval(interval);
  }, [workoutId]);

  const formatScore = (score: WorkoutScore): string => {
    switch (score.score_type) {
      case 'time':
        const minutes = Math.floor(score.score_value / 60);
        const seconds = Math.round(score.score_value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      case 'rounds_reps':
        return `${Math.floor(score.score_value)} rds${score.score_secondary ? ` + ${score.score_secondary}` : ''}`;
      case 'reps':
        return `${score.score_value} reps`;
      case 'weight':
        return `${score.score_value} kg`;
      case 'calories':
        return `${score.score_value} cal`;
      case 'distance':
        return `${score.score_value} m`;
      default:
        return `${score.score_value}`;
    }
  };

  const getRankStyle = (index: number): string => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-600 to-yellow-500';
    if (index === 1) return 'bg-gradient-to-r from-gray-500 to-gray-400';
    if (index === 2) return 'bg-gradient-to-r from-orange-700 to-orange-600';
    return 'bg-zinc-800';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-8 w-8 text-yellow-300" />;
    if (index === 1) return <Medal className="h-8 w-8 text-gray-300" />;
    if (index === 2) return <Medal className="h-8 w-8 text-orange-400" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-2xl text-zinc-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="h-10 w-10 text-yellow-500" />
          <h1 className="text-4xl font-bold">LEADERBOARD</h1>
          <Trophy className="h-10 w-10 text-yellow-500" />
        </div>
        <p className="text-2xl text-zinc-400">{workoutName}</p>
      </div>

      {/* Scores Grid */}
      {scores.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="h-16 w-16 mx-auto text-zinc-600" />
          <p className="text-2xl text-zinc-500 mt-4">Aucun score enregistre</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {scores.slice(0, 15).map((score, index) => (
            <div
              key={score.id}
              className={`${getRankStyle(index)} rounded-xl px-6 py-4 flex items-center transition-all duration-300`}
            >
              {/* Rank */}
              <div className="w-20 flex items-center justify-center">
                {getRankIcon(index) || (
                  <span className="text-4xl font-bold text-zinc-400">#{index + 1}</span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 ml-4">
                <span className="text-2xl font-bold">
                  {score.member?.first_name} {score.member?.last_name?.charAt(0)}.
                </span>
              </div>

              {/* Score */}
              <div className="text-right">
                <span className="text-3xl font-mono font-bold">
                  {formatScore(score)}
                </span>
                <span
                  className={`ml-3 px-3 py-1 rounded-full text-sm font-bold ${
                    score.is_rx
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-600 text-zinc-300'
                  }`}
                >
                  {score.is_rx ? 'RX' : 'SC'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom info */}
      {scores.length > 15 && (
        <div className="text-center text-zinc-500 text-lg">
          +{scores.length - 15} autres participants
        </div>
      )}
    </div>
  );
}
