/**
 * Discord Integration Module
 * Re-exports all Discord-related functionality
 */

export {
  // Types
  type DiscordEmbed,
  type DiscordWebhookPayload,
  type DiscordWebhookResponse,
  type WorkoutForEmbed,
  type MemberForEmbed,

  // Constants
  DISCORD_COLORS,

  // Webhook functions
  isValidWebhookUrl,
  sendWebhookMessage,
  testWebhook,

  // Embed builders
  buildWodEmbed,
  buildWelcomeMemberEmbed,
  buildClassReminderEmbed,
  buildAchievementEmbed,
  buildAnnouncementEmbed,

  // Utilities
  interpolateTemplate,
} from './client';
