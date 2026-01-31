# SKALI PROG - Migration Next.js / Supabase

> Document de specification pour Claude Cowork
> Migration depuis HTML/JS vanilla vers Next.js 14+ / Supabase / TypeScript

---

## 1. CONTEXTE & OBJECTIFS

### Application Actuelle
- **Nom**: Skali Prog - Performance Training System
- **Version**: 2.4.0
- **Stack actuel**: HTML/JS vanilla, Supabase, Discord API, Node.js proxy
- **2 interfaces**: Admin/Coach Dashboard + PWA Athletes

### Objectifs Migration
1. **Architecture moderne**: Next.js 14+ App Router, TypeScript strict
2. **Code propre**: Composants reutilisables, separation des concerns
3. **Performance**: SSR/SSG, code splitting automatique, ISR
4. **DX amelioree**: Hot reload, type safety, tests automatises
5. **Maintenabilite**: Structure claire, documentation inline

---

## 2. STACK TECHNIQUE CIBLE

### Frontend
| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| Framework | Next.js | 14.x+ | App Router, Server Components, API Routes |
| Language | TypeScript | 5.x | Type safety, DX, maintenance |
| Styling | Tailwind CSS | 3.4+ | Deja utilise, utility-first |
| UI Components | shadcn/ui | latest | Components accessibles, customisables |
| State | Zustand | 4.x | Leger, simple, TypeScript-friendly |
| Forms | React Hook Form + Zod | latest | Validation robuste |
| Charts | Recharts | 2.x | React-native, performant |
| Animations | Framer Motion | 11.x | Declaratif, performant |
| PDF | @react-pdf/renderer | 3.x | React-based PDF generation |

### Backend
| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| BaaS | Supabase | latest | Deja utilise, PostgreSQL, Auth, Storage |
| API | Next.js API Routes | 14.x | Server actions, Route handlers |
| AI | Vercel AI SDK | 3.x | Streaming, Claude integration |
| Auth | Supabase Auth + NextAuth | latest | OAuth Discord, sessions |

### Infrastructure
| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | Vercel | Next.js optimise, Edge functions |
| Database | Supabase Cloud | PostgreSQL + Realtime |
| Storage | Supabase Storage | Avatars, PDFs, exports |
| CI/CD | Vercel + GitHub | Auto-deploy on push |

---

## 3. ARCHITECTURE NEXT.JS

### Structure des Dossiers

```
/skaliprog-next
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Route group: auth pages
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Route group: admin/coach
│   │   │   ├── layout.tsx            # Sidebar + Header
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── planning/
│   │   │   │   ├── page.tsx          # Calendar view
│   │   │   │   └── [sessionId]/page.tsx
│   │   │   ├── membres/
│   │   │   │   ├── page.tsx          # Liste membres
│   │   │   │   ├── [id]/page.tsx     # Detail membre
│   │   │   │   └── import/page.tsx   # Import CSV
│   │   │   ├── teams/
│   │   │   │   ├── page.tsx          # Team builder
│   │   │   │   └── cardio-draw/page.tsx
│   │   │   ├── programmes/
│   │   │   │   ├── page.tsx          # Liste programmes
│   │   │   │   ├── generator/page.tsx # AI generator
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── crm/
│   │   │   │   ├── leads/page.tsx
│   │   │   │   └── stats/page.tsx
│   │   │   ├── finance/page.tsx
│   │   │   ├── discord/
│   │   │   │   ├── page.tsx          # Bot controls
│   │   │   │   └── morning-coach/page.tsx
│   │   │   ├── export/page.tsx       # PDF export
│   │   │   └── settings/
│   │   │       ├── page.tsx          # Config generale
│   │   │       └── api-keys/page.tsx
│   │   ├── (portal)/                 # Route group: athlete PWA
│   │   │   ├── layout.tsx            # Bottom nav mobile
│   │   │   ├── page.tsx              # Home athlete
│   │   │   ├── leaderboard/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   ├── programmes/page.tsx
│   │   │   ├── nutrition/page.tsx
│   │   │   ├── cards/page.tsx        # Pokemon cards
│   │   │   └── profile/page.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── discord/callback/route.ts
│   │   │   ├── ai/
│   │   │   │   ├── generate-session/route.ts
│   │   │   │   └── morning-coach/route.ts
│   │   │   ├── discord/
│   │   │   │   ├── webhook/route.ts
│   │   │   │   └── notify/route.ts
│   │   │   ├── export/
│   │   │   │   └── pdf/route.ts
│   │   │   └── cron/
│   │   │       └── morning-notification/route.ts
│   │   ├── layout.tsx                # Root layout
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                       # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/                   # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── calendar/                 # Calendar module
│   │   │   ├── calendar-view.tsx
│   │   │   ├── session-card.tsx
│   │   │   ├── session-dialog.tsx
│   │   │   └── week-selector.tsx
│   │   ├── members/                  # Members module
│   │   │   ├── member-card.tsx
│   │   │   ├── member-form.tsx
│   │   │   ├── member-stats.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   └── csv-import.tsx
│   │   ├── teams/                    # Teams module
│   │   │   ├── team-builder.tsx
│   │   │   ├── cardio-draw.tsx
│   │   │   └── team-card.tsx
│   │   ├── programmes/               # Programs module
│   │   │   ├── program-card.tsx
│   │   │   ├── program-editor.tsx
│   │   │   ├── ai-generator.tsx
│   │   │   └── exercise-selector.tsx
│   │   ├── finance/                  # Finance module
│   │   │   ├── revenue-chart.tsx
│   │   │   ├── cash-flow.tsx
│   │   │   └── projections.tsx
│   │   ├── crm/                      # CRM module
│   │   │   ├── leads-table.tsx
│   │   │   ├── lead-form.tsx
│   │   │   └── analytics-dashboard.tsx
│   │   ├── discord/                  # Discord module
│   │   │   ├── bot-controls.tsx
│   │   │   ├── webhook-config.tsx
│   │   │   └── morning-coach-config.tsx
│   │   ├── portal/                   # Athlete portal
│   │   │   ├── pokemon-card.tsx
│   │   │   ├── leaderboard-table.tsx
│   │   │   ├── goal-tracker.tsx
│   │   │   └── nutrition-planner.tsx
│   │   └── shared/                   # Shared components
│   │       ├── data-table.tsx
│   │       ├── stat-card.tsx
│   │       ├── loading-skeleton.tsx
│   │       ├── error-boundary.tsx
│   │       └── confirm-dialog.tsx
│   │
│   ├── lib/                          # Utilities & configs
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── types.ts              # Generated types
│   │   ├── auth/
│   │   │   ├── config.ts             # NextAuth config
│   │   │   └── permissions.ts        # RBAC logic
│   │   ├── ai/
│   │   │   ├── claude.ts             # Claude client
│   │   │   └── prompts.ts            # AI prompts
│   │   ├── discord/
│   │   │   ├── client.ts             # Discord API
│   │   │   └── webhooks.ts           # Webhook helpers
│   │   ├── pdf/
│   │   │   └── generator.ts          # PDF generation
│   │   ├── utils.ts                  # General utilities
│   │   └── constants.ts              # App constants
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-members.ts
│   │   ├── use-sessions.ts
│   │   ├── use-programs.ts
│   │   ├── use-auth.ts
│   │   ├── use-realtime.ts
│   │   └── use-permissions.ts
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── members-store.ts
│   │   ├── calendar-store.ts
│   │   └── ui-store.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── database.ts               # Supabase generated
│   │   ├── member.ts
│   │   ├── session.ts
│   │   ├── program.ts
│   │   ├── performance.ts
│   │   └── api.ts
│   │
│   └── data/                         # Static data
│       ├── exercises.json            # Exercise database
│       └── sports-config.json        # Sports configurations
│
├── public/
│   ├── icons/                        # PWA icons
│   ├── images/
│   └── manifest.json                 # PWA manifest
│
├── prisma/                           # Optional: Prisma schema
│   └── schema.prisma
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local                        # Environment variables
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. MODELES DE DONNEES (TypeScript)

### Types de Base

```typescript
// types/database.ts - Types generes par Supabase CLI

// types/member.ts
export interface Member {
  id: string
  name: string
  email: string | null
  phone: string | null
  birthDate: Date | null
  gender: 'male' | 'female' | 'other' | null
  weight: number | null
  height: number | null
  bodyFatPercentage: number | null
  avatarUrl: string | null
  discordId: string | null
  isActive: boolean
  role: UserRole

  // Performance metrics
  squat1rm: number | null
  benchPress1rm: number | null
  deadlift1rm: number | null
  cleanAndJerk1rm: number | null
  snatch1rm: number | null
  pullUpsMax: number | null
  time5k: number | null // en secondes
  hyroxBestTime: number | null // en secondes

  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'ADMIN' | 'COACH' | 'ATHLETE'

// types/session.ts
export interface TrainingSession {
  id: string
  date: Date
  type: SportType
  category: SessionCategory
  title: string
  description: string | null
  duration: number // minutes
  exercises: Exercise[]
  createdBy: string // member_id
  assignedTo: string[] // member_ids
  isRecurring: boolean
  recurringPattern: RecurringPattern | null
  createdAt: Date
  updatedAt: Date
}

export type SportType = 'trail' | 'hyrox' | 'crossfit' | 'bodybuilding' | 'running'
export type SessionCategory = 'endurance' | 'strength' | 'mixed' | 'recovery' | 'skill'

export interface Exercise {
  id: string
  name: string
  sets: number | null
  reps: string | null // "8-12" ou "AMRAP"
  weight: string | null // "70%" ou "50kg"
  duration: number | null // secondes
  rest: number | null // secondes
  notes: string | null
}

// types/program.ts
export interface Program {
  id: string
  memberId: string
  name: string
  sport: SportType
  goal: string
  durationWeeks: number
  currentWeek: number
  weeks: ProgramWeek[]
  status: 'active' | 'paused' | 'completed' | 'archived'
  generatedBy: 'ai' | 'manual'
  createdAt: Date
  updatedAt: Date
}

export interface ProgramWeek {
  weekNumber: number
  theme: string
  sessions: TrainingSession[]
}

// types/performance.ts
export interface Performance {
  id: string
  memberId: string
  exerciseType: PerformanceType
  value: number
  unit: string
  date: Date
  isPR: boolean
  notes: string | null
  createdAt: Date
}

export type PerformanceType =
  | 'squat_1rm' | 'bench_press_1rm' | 'deadlift_1rm'
  | 'clean_and_jerk_1rm' | 'snatch_1rm'
  | 'pull_ups_max' | 'time_5k' | 'hyrox_time'
  | 'vo2max' | 'body_weight' | 'body_fat'
```

---

## 5. MODULES A MIGRER

### Module 1: Authentification & Permissions

**Fichiers source:**
- `js/core/auth.js`
- `js/managers/permissionmanager.js`
- `js/integrations/discordauth.js`

**Implementation cible:**

```typescript
// lib/auth/config.ts
import { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createClient } from '@/lib/supabase/server'

export const authOptions: NextAuthOptions = {
  providers: [
    // OAuth Discord pour athletes
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify guilds guilds.members.read'
        }
      }
    }),
    // Credentials pour admin/coach
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const supabase = createClient()
        // Verification du mot de passe
        const { data, error } = await supabase
          .from('auth_passwords')
          .select('role')
          .eq('password_hash', hashPassword(credentials?.password))
          .single()

        if (data) {
          return { id: data.role, role: data.role }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === 'discord') {
        token.discordId = account.providerAccountId
        // Chercher le membre lie
        const supabase = createClient()
        const { data } = await supabase
          .from('discord_members')
          .select('member_id')
          .eq('discord_id', account.providerAccountId)
          .single()

        if (data) {
          token.memberId = data.member_id
          token.role = 'ATHLETE'
        }
      }
      if (user?.role) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role as UserRole
      session.user.memberId = token.memberId as string | undefined
      session.user.discordId = token.discordId as string | undefined
      return session
    }
  }
}

// lib/auth/permissions.ts
export const PERMISSIONS = {
  ADMIN: ['*'], // Tout
  COACH: [
    'calendar.view', 'calendar.create', 'calendar.edit',
    'members.view', 'members.create', 'members.edit',
    'performances.view', 'performances.edit',
    'programs.view', 'programs.create', 'programs.edit',
    'teams.view', 'teams.create', 'teams.edit',
    'export.pdf', 'notifications.send',
    'crm.view', 'crm.edit'
  ],
  ATHLETE: [
    'calendar.view',
    'members.view_own',
    'performances.view_own',
    'programs.view_own',
    'profile.edit_own'
  ]
} as const

export function hasPermission(role: UserRole, permission: string): boolean {
  if (role === 'ADMIN') return true
  return PERMISSIONS[role]?.includes(permission) ?? false
}

// hooks/use-permissions.ts
export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? 'ATHLETE'

  return {
    role,
    can: (permission: string) => hasPermission(role, permission),
    isAdmin: role === 'ADMIN',
    isCoach: role === 'COACH' || role === 'ADMIN',
    isAthlete: role === 'ATHLETE'
  }
}
```

---

### Module 2: Gestion des Membres

**Fichiers source:**
- `js/modules/members/membermanager.js`
- `js/modules/members/memberimport.js`
- `js/modules/members/duplicate-detector.js`

**Implementation cible:**

```typescript
// hooks/use-members.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types/member'

export function useMembers() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Member[]
    }
  })

  const createMember = useMutation({
    mutationFn: async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('members')
        .insert(member)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    }
  })

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    }
  })

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    }
  })

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    createMember,
    updateMember,
    deleteMember
  }
}

// components/members/member-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

const memberSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional()
})

type MemberFormData = z.infer<typeof memberSchema>

interface MemberFormProps {
  member?: Member
  onSubmit: (data: MemberFormData) => Promise<void>
  onCancel: () => void
}

export function MemberForm({ member, onSubmit, onCancel }: MemberFormProps) {
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member ?? {}
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nom"
        {...form.register('name')}
        error={form.formState.errors.name?.message}
      />
      <Input
        label="Email"
        type="email"
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />
      {/* Autres champs... */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {member ? 'Modifier' : 'Creer'}
        </Button>
      </div>
    </form>
  )
}
```

---

### Module 3: Calendrier & Sessions

**Fichiers source:**
- `js/modules/calendar/calendarmanager.js`

**Implementation cible:**

```typescript
// components/calendar/calendar-view.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, addWeeks, subWeeks, isSameDay
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useSessions } from '@/hooks/use-sessions'
import { SessionCard } from './session-card'
import { SessionDialog } from './session-dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { sessions, isLoading } = useSessions({
    startDate: weekStart,
    endDate: weekEnd
  })

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, TrainingSession[]>()
    sessions.forEach(session => {
      const key = format(new Date(session.date), 'yyyy-MM-dd')
      const existing = map.get(key) ?? []
      map.set(key, [...existing, session])
    })
    return map
  }, [sessions])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(d => subWeeks(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(weekStart, 'd MMM', { locale: fr })} - {format(weekEnd, 'd MMM yyyy', { locale: fr })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(d => addWeeks(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle session
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 divide-x">
        {days.map(day => (
          <div key={day.toISOString()} className="flex flex-col">
            <div className="p-2 text-center border-b bg-muted/50">
              <div className="text-sm font-medium">
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div className={cn(
                "text-2xl",
                isSameDay(day, new Date()) && "text-primary font-bold"
              )}>
                {format(day, 'd')}
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {sessionsByDay.get(format(day, 'yyyy-MM-dd'))?.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => {
                    setSelectedSession(session)
                    setIsDialogOpen(true)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <SessionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        session={selectedSession}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedSession(null)
        }}
      />
    </div>
  )
}
```

---

### Module 4: Generation AI de Programmes

**Fichiers source:**
- `js/integrations/ai-session-generator.js`
- `js/integrations/smart-session-generator.js`

**Implementation cible:**

```typescript
// app/api/ai/generate-session/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { sport, goal, duration, athleteData, preferences } = await req.json()

  const prompt = buildPrompt(sport, goal, duration, athleteData, preferences)

  const result = await streamText({
    model: anthropic('claude-3-5-haiku-20241022'),
    system: `Tu es un coach sportif expert specialise en ${sport}.
Tu crees des programmes d'entrainement personnalises, structures et progressifs.
Reponds TOUJOURS en JSON valide avec la structure demandee.`,
    prompt,
    maxTokens: 4000
  })

  return result.toDataStreamResponse()
}

function buildPrompt(
  sport: SportType,
  goal: string,
  duration: number,
  athleteData: any,
  preferences: any
) {
  return `
Cree un programme de ${duration} semaines pour un athlete avec ces caracteristiques:
- Sport: ${sport}
- Objectif: ${goal}
- Niveau: ${athleteData.level}
- Performances actuelles: ${JSON.stringify(athleteData.performances)}
- Disponibilites: ${preferences.daysPerWeek} jours/semaine
- Equipement: ${preferences.equipment.join(', ')}

Structure JSON attendue:
{
  "name": "Nom du programme",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Theme de la semaine",
      "sessions": [
        {
          "day": 1,
          "type": "strength|endurance|mixed|recovery",
          "title": "Titre",
          "duration": 60,
          "exercises": [
            {
              "name": "Nom exercice",
              "sets": 3,
              "reps": "8-10",
              "weight": "70%",
              "rest": 90,
              "notes": "Instructions"
            }
          ]
        }
      ]
    }
  ]
}
`
}

// components/programmes/ai-generator.tsx
'use client'

import { useState } from 'react'
import { useCompletion } from 'ai/react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'

export function AIGenerator({ memberId }: { memberId: string }) {
  const [sport, setSport] = useState<SportType>('crossfit')
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState(4)

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/ai/generate-session'
  })

  async function handleGenerate() {
    await complete('', {
      body: { sport, goal, duration, memberId }
    })
  }

  const program = completion ? JSON.parse(completion) : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Sport"
          value={sport}
          onValueChange={(v) => setSport(v as SportType)}
          options={[
            { value: 'trail', label: 'Trail Running' },
            { value: 'hyrox', label: 'Hyrox' },
            { value: 'crossfit', label: 'CrossFit' },
            { value: 'bodybuilding', label: 'Musculation' },
            { value: 'running', label: 'Course' }
          ]}
        />
        <Select
          label="Duree (semaines)"
          value={String(duration)}
          onValueChange={(v) => setDuration(Number(v))}
          options={[
            { value: '4', label: '4 semaines' },
            { value: '8', label: '8 semaines' },
            { value: '12', label: '12 semaines' }
          ]}
        />
      </div>

      <Textarea
        label="Objectif"
        placeholder="Decrivez l'objectif de l'athlete..."
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      />

      <Button
        onClick={handleGenerate}
        disabled={isLoading || !goal}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Generer le programme
      </Button>

      {program && (
        <ProgramPreview program={program} />
      )}
    </div>
  )
}
```

---

### Module 5: Discord Integration

**Fichiers source:**
- `js/integrations/discordnotifier.js`
- `js/modules/admin/discord-bot-controls.js`
- `js/integrations/discord-morning-coach.js`

**Implementation cible:**

```typescript
// lib/discord/webhooks.ts
interface WebhookMessage {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

export async function sendWebhook(
  webhookUrl: string,
  message: WebhookMessage
) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  })

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`)
  }
}

export function createSessionEmbed(session: TrainingSession): DiscordEmbed {
  const categoryColors = {
    endurance: 0x3b82f6, // blue
    strength: 0xef4444,  // red
    mixed: 0x8b5cf6,     // purple
    recovery: 0x22c55e,  // green
    skill: 0xf59e0b      // amber
  }

  return {
    title: `${session.title}`,
    description: session.description ?? undefined,
    color: categoryColors[session.category],
    fields: [
      { name: 'Type', value: session.type, inline: true },
      { name: 'Duree', value: `${session.duration} min`, inline: true },
      { name: 'Exercices', value: session.exercises.length.toString(), inline: true }
    ],
    footer: { text: 'Skali Prog' },
    timestamp: new Date().toISOString()
  }
}

// app/api/discord/notify/route.ts
import { sendWebhook, createSessionEmbed } from '@/lib/discord/webhooks'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { type, data } = await req.json()

  const supabase = createClient()
  const { data: config } = await supabase
    .from('settings')
    .select('discord_webhook_url')
    .single()

  if (!config?.discord_webhook_url) {
    return Response.json({ error: 'Webhook not configured' }, { status: 400 })
  }

  let message: WebhookMessage

  switch (type) {
    case 'new_session':
      message = {
        embeds: [createSessionEmbed(data.session)]
      }
      break
    case 'pr_achieved':
      message = {
        content: `**PR!** ${data.memberName} a battu son record de ${data.exerciseType}: ${data.value} ${data.unit}`
      }
      break
    case 'morning_coach':
      message = {
        content: data.message,
        embeds: data.warmup ? [{
          title: 'Echauffement du jour',
          description: data.warmup,
          color: 0x3e8e41
        }] : undefined
      }
      break
    default:
      return Response.json({ error: 'Unknown notification type' }, { status: 400 })
  }

  await sendWebhook(config.discord_webhook_url, message)
  return Response.json({ success: true })
}

// app/api/cron/morning-notification/route.ts
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { sendWebhook } from '@/lib/discord/webhooks'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  // Verifier cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Recuperer config
  const { data: config } = await supabase
    .from('settings')
    .select('morning_coach_enabled, discord_webhook_url')
    .single()

  if (!config?.morning_coach_enabled || !config.discord_webhook_url) {
    return Response.json({ skipped: true })
  }

  // Generer message du jour
  const { text: warmup } = await generateText({
    model: anthropic('claude-3-5-haiku-20241022'),
    prompt: `Genere un echauffement dynamique de 10 minutes pour un groupe de CrossFit.
Format: liste a puces, exercices clairs, durees/reps specifiees.
Sois motivant et energique!`
  })

  await sendWebhook(config.discord_webhook_url, {
    content: 'Bonjour les athletes! Voici votre echauffement du jour:',
    embeds: [{
      title: 'Echauffement du jour',
      description: warmup,
      color: 0x3e8e41,
      footer: { text: 'Skali Prog - Morning Coach' },
      timestamp: new Date().toISOString()
    }]
  })

  return Response.json({ success: true })
}
```

---

### Module 6: Finance

**Fichiers source:**
- `js/modules/finance/finance-manager.js`

**Implementation cible:**

```typescript
// types/finance.ts
export interface FinanceEntry {
  id: string
  type: 'revenue' | 'expense'
  category: string
  amount: number
  date: Date
  description: string
  recurring: boolean
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly'
  createdAt: Date
}

export interface FinanceProjection {
  month: string
  revenue: number
  expenses: number
  netCashFlow: number
  cumulativeCash: number
}

// hooks/use-finance.ts
export function useFinance() {
  const supabase = createClient()

  const entriesQuery = useQuery({
    queryKey: ['finance-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      return data as FinanceEntry[]
    }
  })

  const projections = useMemo(() => {
    if (!entriesQuery.data) return []
    return calculateProjections(entriesQuery.data, 12)
  }, [entriesQuery.data])

  return {
    entries: entriesQuery.data ?? [],
    projections,
    isLoading: entriesQuery.isLoading
  }
}

function calculateProjections(
  entries: FinanceEntry[],
  months: number
): FinanceProjection[] {
  const projections: FinanceProjection[] = []
  let cumulativeCash = 0

  const now = new Date()

  for (let i = 0; i < months; i++) {
    const month = addMonths(now, i)
    const monthKey = format(month, 'yyyy-MM')

    const monthlyRevenue = entries
      .filter(e => e.type === 'revenue' && shouldIncludeInMonth(e, month))
      .reduce((sum, e) => sum + e.amount, 0)

    const monthlyExpenses = entries
      .filter(e => e.type === 'expense' && shouldIncludeInMonth(e, month))
      .reduce((sum, e) => sum + e.amount, 0)

    const netCashFlow = monthlyRevenue - monthlyExpenses
    cumulativeCash += netCashFlow

    projections.push({
      month: monthKey,
      revenue: monthlyRevenue,
      expenses: monthlyExpenses,
      netCashFlow,
      cumulativeCash
    })
  }

  return projections
}
```

---

### Module 7: Pokemon Cards (Gamification)

**Fichiers source:**
- `js/modules/pokemon/index.js`
- `js/modules/pokemon/card-renderer.js`
- `js/modules/pokemon/stats-calculator.js`

**Implementation cible:**

```typescript
// components/portal/pokemon-card.tsx
'use client'

import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PokemonCardProps {
  member: Member
  performances: Performance[]
}

export function PokemonCard({ member, performances }: PokemonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [15, -15])
  const rotateY = useTransform(x, [-100, 100], [-15, 15])

  const stats = calculateStats(performances)
  const rarity = calculateRarity(stats)

  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    uncommon: 'from-green-400 to-green-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-orange-500'
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(e.clientX - centerX)
    y.set(e.clientY - centerY)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      className="w-64 h-96 cursor-pointer perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
    >
      <motion.div
        className={cn(
          "absolute inset-0 rounded-xl p-4",
          "bg-gradient-to-br shadow-xl",
          rarityColors[rarity],
          "backface-hidden"
        )}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
      >
        {/* Front of card */}
        <div className="flex flex-col h-full text-white">
          <div className="flex justify-between items-start">
            <span className="text-lg font-bold">{member.name}</span>
            <span className="text-sm opacity-75">{rarity.toUpperCase()}</span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <img
              src={member.avatarUrl ?? '/default-avatar.png'}
              alt={member.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <StatBar label="Force" value={stats.strength} />
            <StatBar label="Endurance" value={stats.endurance} />
            <StatBar label="Puissance" value={stats.power} />
            <StatBar label="Technique" value={stats.technique} />
          </div>
        </div>
      </motion.div>

      {/* Back of card */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-xl p-4",
          "bg-gradient-to-br from-gray-800 to-gray-900",
          "backface-hidden"
        )}
        animate={{ rotateY: isFlipped ? 0 : -180 }}
      >
        <div className="h-full flex flex-col text-white">
          <h3 className="font-bold mb-4">Records Personnels</h3>
          <div className="space-y-2 text-sm">
            {performances.filter(p => p.isPR).slice(0, 5).map(pr => (
              <div key={pr.id} className="flex justify-between">
                <span>{pr.exerciseType}</span>
                <span className="font-bold">{pr.value} {pr.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function calculateStats(performances: Performance[]) {
  // Calcul base sur les performances reelles
  const squat = performances.find(p => p.exerciseType === 'squat_1rm')?.value ?? 0
  const bench = performances.find(p => p.exerciseType === 'bench_press_1rm')?.value ?? 0
  const deadlift = performances.find(p => p.exerciseType === 'deadlift_1rm')?.value ?? 0
  const pullups = performances.find(p => p.exerciseType === 'pull_ups_max')?.value ?? 0
  const time5k = performances.find(p => p.exerciseType === 'time_5k')?.value ?? 0

  return {
    strength: Math.min(100, Math.round((squat + bench + deadlift) / 6)),
    endurance: Math.min(100, time5k > 0 ? Math.round(100 - (time5k - 1200) / 10) : 0),
    power: Math.min(100, Math.round((squat + deadlift) / 4)),
    technique: Math.min(100, Math.round(pullups * 3))
  }
}

function calculateRarity(stats: { strength: number; endurance: number; power: number; technique: number }) {
  const total = stats.strength + stats.endurance + stats.power + stats.technique
  if (total >= 350) return 'legendary'
  if (total >= 280) return 'epic'
  if (total >= 200) return 'rare'
  if (total >= 120) return 'uncommon'
  return 'common'
}
```

---

### Module 8: Export PDF

**Fichiers source:**
- `tools/pdfexporter.js`

**Implementation cible:**

```typescript
// lib/pdf/generator.ts
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { Program, Member, TrainingSession } from '@/types'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottom: '1 solid #3e8e41',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3e8e41'
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  exerciseRow: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 10
  },
  exerciseName: {
    flex: 2
  },
  exerciseDetails: {
    flex: 1,
    textAlign: 'right'
  }
})

interface ProgramPDFProps {
  program: Program
  member: Member
}

function ProgramPDF({ program, member }: ProgramPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{program.name}</Text>
          <Text style={styles.subtitle}>
            Programme pour {member.name} - {program.durationWeeks} semaines
          </Text>
        </View>

        {program.weeks.map(week => (
          <View key={week.weekNumber} style={styles.section}>
            <Text style={styles.sectionTitle}>
              Semaine {week.weekNumber}: {week.theme}
            </Text>

            {week.sessions.map((session, idx) => (
              <View key={idx} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
                  {session.title} ({session.duration} min)
                </Text>

                {session.exercises.map((ex, exIdx) => (
                  <View key={exIdx} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {ex.sets}x{ex.reps} @ {ex.weight}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  )
}

export async function generateProgramPDF(
  program: Program,
  member: Member
): Promise<Blob> {
  const doc = <ProgramPDF program={program} member={member} />
  return await pdf(doc).toBlob()
}

// app/api/export/pdf/route.ts
import { generateProgramPDF } from '@/lib/pdf/generator'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { programId, memberId } = await req.json()

  const supabase = createClient()

  const [{ data: program }, { data: member }] = await Promise.all([
    supabase.from('programs').select('*').eq('id', programId).single(),
    supabase.from('members').select('*').eq('id', memberId).single()
  ])

  if (!program || !member) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const blob = await generateProgramPDF(program, member)

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${program.name}.pdf"`
    }
  })
}
```

---

## 6. PLAN DE MIGRATION

### Phase 1: Setup & Core (Semaine 1-2)
- [ ] Init projet Next.js 14 + TypeScript
- [ ] Config Tailwind + shadcn/ui
- [ ] Setup Supabase client
- [ ] Systeme auth (NextAuth + Discord OAuth)
- [ ] Layout de base (Sidebar, Header)
- [ ] Routing structure

### Phase 2: Modules Core (Semaine 3-4)
- [ ] Module Membres (CRUD complet)
- [ ] Module Calendrier (view + create/edit sessions)
- [ ] Module Performances (tracking + charts)
- [ ] Integration Supabase Realtime

### Phase 3: Features Avancees (Semaine 5-6)
- [ ] AI Session Generator (Claude integration)
- [ ] Module Programmes (creation + assign)
- [ ] Export PDF
- [ ] Discord notifications

### Phase 4: PWA Athletes (Semaine 7-8)
- [ ] Portal layout mobile-first
- [ ] Leaderboard
- [ ] Pokemon Cards
- [ ] Goals & Nutrition
- [ ] Service Worker + Offline

### Phase 5: Admin Features (Semaine 9-10)
- [ ] CRM (Leads + Stats)
- [ ] Finance module
- [ ] Team Builder
- [ ] Morning Coach automation
- [ ] Settings & Configuration

### Phase 6: Polish & Deploy (Semaine 11-12)
- [ ] Tests (unit + integration + e2e)
- [ ] Performance optimization
- [ ] Migration donnees prod
- [ ] Deploy Vercel
- [ ] Documentation

---

## 7. COMMANDES UTILES

```bash
# Init projet
npx create-next-app@latest skaliprog-next --typescript --tailwind --eslint --app --src-dir

# Installer dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install next-auth @auth/supabase-adapter
npm install zustand @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install recharts framer-motion
npm install @react-pdf/renderer
npm install ai @ai-sdk/anthropic
npm install date-fns lucide-react
npm install -D @types/node

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog input select table tabs toast

# Supabase types
npx supabase gen types typescript --project-id [PROJECT_ID] > src/types/database.ts
```

---

## 8. VARIABLES D'ENVIRONNEMENT

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# Discord
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
DISCORD_GUILD_ID=xxx

# Claude AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Cron
CRON_SECRET=xxx
```

---

## 9. CHECKPOINTS HUMAIN

A chaque fin de phase, valider:
- [ ] Toutes les features de la phase fonctionnent
- [ ] Tests passent
- [ ] Pas de regression
- [ ] Performance acceptable
- [ ] Code review OK

---

*Document genere pour Claude Cowork - Migration Skali Prog v2.4 vers Next.js*
