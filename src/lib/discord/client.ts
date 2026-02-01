/**
 * Discord Client Library
 * Handles Discord webhook messaging for Skali Prog
 */

// =====================================================
// TYPES
// =====================================================

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
  tts?: boolean;
}

export interface DiscordWebhookResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WorkoutForEmbed {
  id: string;
  name: string;
  description: string | null;
  date: string | null;
  blocks?: Array<{
    id: string;
    name: string | null;
    block_type: string;
    wod_type: string | null;
    time_cap: number | null;
    rounds: number | null;
    notes: string | null;
    exercises?: Array<{
      custom_name: string | null;
      reps: number | null;
      reps_unit: string;
      weight_male: number | null;
      weight_female: number | null;
      weight_unit: string;
      notes: string | null;
      exercise?: {
        name: string;
      };
    }>;
  }>;
}

export interface MemberForEmbed {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
}

// =====================================================
// COLORS (Discord uses decimal color values)
// =====================================================

export const DISCORD_COLORS = {
  // Skali Prog brand
  primary: 0x6366f1,      // Indigo
  secondary: 0x8b5cf6,    // Violet

  // Status colors
  success: 0x22c55e,      // Green
  warning: 0xf59e0b,      // Amber
  error: 0xef4444,        // Red
  info: 0x3b82f6,         // Blue

  // Discord brand
  discord: 0x5865f2,

  // Workout types
  amrap: 0xf97316,        // Orange
  emom: 0x14b8a6,         // Teal
  for_time: 0xec4899,     // Pink
  strength: 0x8b5cf6,     // Violet
  skill: 0x06b6d4,        // Cyan
} as const;

// =====================================================
// WEBHOOK FUNCTIONS
// =====================================================

/**
 * Validate Discord webhook URL format
 */
export function isValidWebhookUrl(url: string): boolean {
  if (!url) return false;

  // Discord webhook URL pattern
  const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
  const canaryPattern = /^https:\/\/canary\.discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
  const ptbPattern = /^https:\/\/ptb\.discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

  return webhookPattern.test(url) || canaryPattern.test(url) || ptbPattern.test(url);
}

/**
 * Send message via Discord webhook
 */
export async function sendWebhookMessage(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<DiscordWebhookResponse> {
  if (!isValidWebhookUrl(webhookUrl)) {
    return {
      success: false,
      error: 'Invalid Discord webhook URL',
    };
  }

  try {
    // Add wait=true to get the message ID back
    const response = await fetch(`${webhookUrl}?wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: payload.username || 'Skali Prog',
        avatar_url: payload.avatar_url || 'https://skaliprog.com/icons/icon-192x192.png',
        content: payload.content,
        embeds: payload.embeds,
        tts: payload.tts || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Discord API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // Use default error message
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending webhook',
    };
  }
}

/**
 * Test webhook by sending a test message
 */
export async function testWebhook(webhookUrl: string): Promise<DiscordWebhookResponse> {
  return sendWebhookMessage(webhookUrl, {
    embeds: [{
      title: '🔔 Test de connexion Skali Prog',
      description: 'Ce message confirme que votre webhook Discord est correctement configuré !',
      color: DISCORD_COLORS.success,
      footer: {
        text: 'Skali Prog - Integration Discord',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

// =====================================================
// EMBED BUILDERS
// =====================================================

/**
 * Build WOD embed for Discord
 */
export function buildWodEmbed(workout: WorkoutForEmbed, orgName?: string): DiscordEmbed {
  const fields: DiscordEmbed['fields'] = [];

  // Process each block
  if (workout.blocks && workout.blocks.length > 0) {
    for (const block of workout.blocks) {
      let blockContent = '';

      // Block header info
      if (block.wod_type) {
        const wodTypeDisplay = block.wod_type.toUpperCase().replace('_', ' ');
        if (block.time_cap) {
          blockContent += `**${wodTypeDisplay}** - ${block.time_cap} min\n`;
        } else if (block.rounds) {
          blockContent += `**${wodTypeDisplay}** - ${block.rounds} rounds\n`;
        } else {
          blockContent += `**${wodTypeDisplay}**\n`;
        }
      }

      // Exercises
      if (block.exercises && block.exercises.length > 0) {
        for (const ex of block.exercises) {
          const name = ex.custom_name || ex.exercise?.name || 'Exercise';
          let line = '';

          if (ex.reps) {
            line += `${ex.reps} `;
            if (ex.reps_unit && ex.reps_unit !== 'reps') {
              line += `${ex.reps_unit} `;
            }
          }

          line += name;

          if (ex.weight_male || ex.weight_female) {
            const maleWeight = ex.weight_male ? `${ex.weight_male}${ex.weight_unit}` : '-';
            const femaleWeight = ex.weight_female ? `${ex.weight_female}${ex.weight_unit}` : '-';
            line += ` (♂ ${maleWeight} / ♀ ${femaleWeight})`;
          }

          blockContent += `• ${line}\n`;
        }
      }

      // Notes
      if (block.notes) {
        blockContent += `\n_${block.notes}_`;
      }

      if (blockContent) {
        const blockName = block.name || formatBlockType(block.block_type);
        const blockEmoji = getBlockEmoji(block.block_type);

        fields.push({
          name: `${blockEmoji} ${blockName}`,
          value: blockContent.trim() || 'No exercises',
          inline: false,
        });
      }
    }
  }

  // Get color based on main WOD type
  const wodBlock = workout.blocks?.find(b => b.block_type === 'wod');
  const embedColor = wodBlock?.wod_type
    ? (DISCORD_COLORS[wodBlock.wod_type as keyof typeof DISCORD_COLORS] || DISCORD_COLORS.primary)
    : DISCORD_COLORS.primary;

  return {
    title: `🏋️ ${workout.name}`,
    description: workout.description || undefined,
    color: embedColor,
    fields: fields.length > 0 ? fields : undefined,
    footer: {
      text: orgName ? `${orgName} • Powered by Skali Prog` : 'Powered by Skali Prog',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build welcome message embed for new member
 */
export function buildWelcomeMemberEmbed(
  member: MemberForEmbed,
  orgName: string
): DiscordEmbed {
  return {
    title: '👋 Nouveau membre !',
    description: `**${member.first_name}${member.last_name ? ' ' + member.last_name : ''}** vient de rejoindre ${orgName} !`,
    color: DISCORD_COLORS.success,
    footer: {
      text: 'Skali Prog',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build class reminder embed
 */
export function buildClassReminderEmbed(
  className: string,
  startsAt: Date,
  coachName?: string,
  spotsLeft?: number
): DiscordEmbed {
  const fields: DiscordEmbed['fields'] = [
    {
      name: '📅 Horaire',
      value: startsAt.toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }),
      inline: true,
    },
  ];

  if (coachName) {
    fields.push({
      name: '👤 Coach',
      value: coachName,
      inline: true,
    });
  }

  if (spotsLeft !== undefined) {
    fields.push({
      name: '🎯 Places restantes',
      value: spotsLeft.toString(),
      inline: true,
    });
  }

  return {
    title: `⏰ Rappel: ${className}`,
    description: 'Le cours commence bientôt !',
    color: DISCORD_COLORS.info,
    fields,
    footer: {
      text: 'Skali Prog',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build achievement embed (PR, challenge completed, etc.)
 */
export function buildAchievementEmbed(
  memberName: string,
  achievementType: string,
  details: string
): DiscordEmbed {
  const emojis: Record<string, string> = {
    personal_record: '🏆',
    challenge_completed: '🎯',
    milestone: '⭐',
    streak: '🔥',
  };

  return {
    title: `${emojis[achievementType] || '🎉'} ${achievementType === 'personal_record' ? 'Nouveau PR !' : 'Achievement !'}`,
    description: `**${memberName}** ${details}`,
    color: DISCORD_COLORS.warning,
    footer: {
      text: 'Skali Prog',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build custom announcement embed
 */
export function buildAnnouncementEmbed(
  title: string,
  message: string,
  orgName?: string
): DiscordEmbed {
  return {
    title: `📢 ${title}`,
    description: message,
    color: DISCORD_COLORS.primary,
    footer: {
      text: orgName ? `${orgName} • Skali Prog` : 'Skali Prog',
    },
    timestamp: new Date().toISOString(),
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatBlockType(blockType: string): string {
  const names: Record<string, string> = {
    warmup: 'Warm-up',
    skill: 'Skill',
    strength: 'Strength',
    wod: 'WOD',
    cooldown: 'Cool-down',
    accessory: 'Accessory',
    custom: 'Custom',
  };
  return names[blockType] || blockType;
}

function getBlockEmoji(blockType: string): string {
  const emojis: Record<string, string> = {
    warmup: '🔥',
    skill: '🎯',
    strength: '💪',
    wod: '⚡',
    cooldown: '❄️',
    accessory: '🔧',
    custom: '📝',
  };
  return emojis[blockType] || '📋';
}

/**
 * Interpolate template variables in a string
 * Supports {{variable}} syntax
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const value = getNestedValue(variables, path);
    return value !== undefined ? String(value) : `{{${path}}}`;
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}
