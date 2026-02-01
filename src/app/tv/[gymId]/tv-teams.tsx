'use client';

import type { TVState } from '@/actions/tv';

interface TVTeamsProps {
  teams: NonNullable<TVState['teamsData']>;
}

export function TVTeams({ teams }: TVTeamsProps) {
  // Calculate grid columns based on team count
  const gridCols = Math.min(teams.length, 4);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Title */}
      <h1 className="text-4xl font-bold text-center mb-8 animate-in slide-in-from-top duration-500">
        Equipes du jour
      </h1>

      {/* Teams Grid */}
      <div
        className="flex-1 grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        }}
      >
        {teams.map((team, teamIndex) => (
          <div
            key={teamIndex}
            className="rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom duration-500"
            style={{
              backgroundColor: adjustColorBrightness(team.color || '#3b82f6', -20),
              animationDelay: `${teamIndex * 100}ms`,
            }}
          >
            {/* Team Header */}
            <div
              className="px-6 py-4 text-center"
              style={{ backgroundColor: team.color || '#3b82f6' }}
            >
              <h2 className="text-3xl font-bold drop-shadow-lg">{team.name}</h2>
              <div className="text-lg opacity-80 mt-1">
                {team.members.length} membre{team.members.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Team Members */}
            <div className="p-4 space-y-2">
              {team.members.map((member, memberIndex) => (
                <div
                  key={member.id}
                  className="bg-black/30 backdrop-blur rounded-xl px-4 py-3 flex items-center justify-between animate-in fade-in slide-in-from-left duration-300"
                  style={{
                    animationDelay: `${(teamIndex * team.members.length + memberIndex) * 50}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Member number */}
                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      {memberIndex + 1}
                    </span>
                    {/* Member name */}
                    <span className="text-xl font-medium">{member.name}</span>
                  </div>

                  {/* Station assignment if any */}
                  {member.station && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {member.station}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  // Convert back to hex
  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
