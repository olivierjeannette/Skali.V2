# Architecture - Skali Prog v2.0

> **Document d'Architecture Technique**
> **Version:** 2.0
> **Date:** 2026-01-30
> **Auteur:** @ARCH Alex
> **Status:** Draft - En attente validation
> **Base sur:** [PRD.md](./PRD.md)

---

## 1. System Overview

```
+------------------------------------------------------------------+
|                         CLIENTS                                   |
+------------------------------------------------------------------+
|  Back-Office (Desktop)  |  PWA Adherents (Mobile)  |  TV Display |
|  Next.js App Router     |  Next.js PWA             |  Next.js    |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      VERCEL (Edge)                                |
+------------------------------------------------------------------+
|  Next.js 14+ App Router                                          |
|  - Server Components (RSC)                                        |
|  - Server Actions                                                 |
|  - API Routes (/api/*)                                           |
|  - Middleware (auth, tenant isolation)                           |
+------------------------------------------------------------------+
                              |
          +-------------------+-------------------+
          v                   v                   v
+------------------+  +------------------+  +------------------+
|    SUPABASE      |  |     RESEND       |  |    DISCORD       |
+------------------+  +------------------+  +------------------+
| - PostgreSQL     |  | - Emails         |  | - Bot            |
| - Auth           |  | - Templates      |  | - Webhooks       |
| - Realtime       |  +------------------+  +------------------+
| - Storage        |
| - Edge Functions |
+------------------+
```

---

## 2. Tech Stack

### Frontend

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| Framework | Next.js | 14.2+ | App Router, RSC, Server Actions, excellent DX |
| Language | TypeScript | 5.x | Type safety, meilleure maintenabilite |
| Styling | Tailwind CSS | 3.4+ | Utility-first, design system facile |
| Components | shadcn/ui | latest | Composants accessibles, customisables |
| Icons | Lucide React | latest | Icones coherentes, tree-shakeable |
| Forms | React Hook Form + Zod | latest | Validation type-safe |
| State | Zustand | latest | State management leger si necessaire |
| Calendar | @fullcalendar/react | 6.x | Calendrier interactif complet |
| Charts | Recharts | 2.x | Graphiques pour dashboard |
| PDF | @react-pdf/renderer | latest | Generation PDF cote client |
| Date | date-fns | latest | Manipulation dates (leger) |

### Backend (Supabase)

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| Database | PostgreSQL | 15+ | Via Supabase, robuste et performant |
| Auth | Supabase Auth | latest | Multi-tenant ready, OAuth, MFA |
| Realtime | Supabase Realtime | latest | Sync TV, notifications live |
| Storage | Supabase Storage | latest | Documents, images adherents |
| Functions | Supabase Edge Functions | latest | Webhooks Discord, cron jobs |
| Client | @supabase/supabase-js | 2.x | SDK officiel TypeScript |
| SSR | @supabase/ssr | latest | Auth cote serveur Next.js |

### Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | Vercel | Next.js optimise, Edge, Preview deploys |
| Database | Supabase | PostgreSQL managed + extras |
| Emails | Resend | Emails transactionnels, templates React |
| Discord | Discord.js | Bot pour notifications WOD |
| Analytics | Vercel Analytics | Performance monitoring |
| Error Tracking | Sentry | Error monitoring (optionnel) |

### Supabase Project

| Config | Value |
|--------|-------|
| Project URL | `https://jhrbzdznuiwjojruiqee.supabase.co` |
| Project Ref | `jhrbzdznuiwjojruiqee` |
| Region | (a confirmer) |

---

## 3. Data Model

### 3.1 Diagramme Entites-Relations

```
+-------------------+       +-------------------+
|   organizations   |       |      users        |
+-------------------+       +-------------------+
| id (PK)           |<----->| id (PK)           |
| name              |       | email             |
| slug              |       | full_name         |
| settings (jsonb)  |       | avatar_url        |
| branding (jsonb)  |       | created_at        |
| created_at        |       +-------------------+
+-------------------+              |
        |                          |
        v                          v
+-------------------+       +-------------------+
| organization_users|       |     members       |
+-------------------+       +-------------------+
| org_id (FK)       |       | id (PK)           |
| user_id (FK)      |       | org_id (FK)       |
| role (enum)       |       | user_id (FK) null |
| created_at        |       | first_name        |
+-------------------+       | last_name         |
                            | email             |
                            | phone             |
                            | status (enum)     |
                            | birth_date        |
                            | emergency_contact |
                            | notes             |
                            | metadata (jsonb)  |
                            | created_at        |
                            +-------------------+
                                    |
        +---------------------------+---------------------------+
        v                           v                           v
+-------------------+       +-------------------+       +-------------------+
|   subscriptions   |       |   reservations    |       |    documents      |
+-------------------+       +-------------------+       +-------------------+
| id (PK)           |       | id (PK)           |       | id (PK)           |
| org_id (FK)       |       | org_id (FK)       |       | org_id (FK)       |
| member_id (FK)    |       | member_id (FK)    |       | member_id (FK)    |
| plan_id (FK)      |       | class_id (FK)     |       | type (enum)       |
| status (enum)     |       | status (enum)     |       | name              |
| start_date        |       | checked_in        |       | file_path         |
| end_date          |       | waitlist_position |       | expires_at        |
| sessions_remaining|       | created_at        |       | created_at        |
| payment_status    |       +-------------------+       +-------------------+
| created_at        |
+-------------------+

+-------------------+       +-------------------+       +-------------------+
|      plans        |       |    class_types    |       |     classes       |
+-------------------+       +-------------------+       +-------------------+
| id (PK)           |       | id (PK)           |       | id (PK)           |
| org_id (FK)       |       | org_id (FK)       |       | org_id (FK)       |
| name              |       | name              |       | class_type_id (FK)|
| description       |       | description       |       | workout_id (FK)   |
| price             |       | color             |       | coach_id (FK)     |
| duration_days     |       | default_duration  |       | start_time        |
| sessions_limit    |       | default_capacity  |       | end_time          |
| is_active         |       | is_active         |       | capacity          |
| created_at        |       | created_at        |       | is_recurring      |
+-------------------+       +-------------------+       | recurrence_rule   |
                                                        | cancelled         |
                                                        | created_at        |
                                                        +-------------------+

+-------------------+       +-------------------+       +-------------------+
|     workouts      |       |  workout_blocks   |       |    exercises      |
+-------------------+       +-------------------+       +-------------------+
| id (PK)           |       | id (PK)           |       | id (PK)           |
| org_id (FK)       |       | workout_id (FK)   |       | org_id (FK) null  |
| title             |       | type (enum)       |       | name              |
| description       |       | title             |       | description       |
| date              |       | content (jsonb)   |       | category          |
| is_template       |       | order_index       |       | video_url         |
| template_name     |       | created_at        |       | is_global         |
| created_by (FK)   |       +-------------------+       | created_at        |
| created_at        |                                   +-------------------+
+-------------------+

+-------------------+       +-------------------+       +-------------------+
|      scores       |       |      teams        |       |   team_members    |
+-------------------+       +-------------------+       +-------------------+
| id (PK)           |       | id (PK)           |       | team_id (FK)      |
| org_id (FK)       |       | org_id (FK)       |       | member_id (FK)    |
| member_id (FK)    |       | class_id (FK)     |       | position          |
| workout_id (FK)   |       | name              |       +-------------------+
| class_id (FK)     |       | color             |
| score_type (enum) |       | created_at        |
| value             |       +-------------------+
| rx_scaled (enum)  |
| notes             |
| created_at        |
+-------------------+

+-------------------+       +-------------------+       +-------------------+
|      leads        |       |  communications   |       |   tv_displays     |
+-------------------+       +-------------------+       +-------------------+
| id (PK)           |       | id (PK)           |       | id (PK)           |
| org_id (FK)       |       | org_id (FK)       |       | org_id (FK)       |
| first_name        |       | member_id (FK)    |       | name              |
| last_name         |       | type (enum)       |       | token             |
| email             |       | subject           |       | current_view      |
| phone             |       | content           |       | settings (jsonb)  |
| source            |       | sent_at           |       | last_ping         |
| status (enum)     |       | created_at        |       | created_at        |
| notes             |       +-------------------+       +-------------------+
| converted_to (FK) |
| created_at        |
+-------------------+

+-------------------+
|  discord_config   |
+-------------------+
| org_id (PK, FK)   |
| guild_id          |
| channel_id        |
| bot_token_enc     |
| auto_post_wod     |
| post_time         |
| created_at        |
+-------------------+
```

### 3.2 Tables Detaillees

#### organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{
    "timezone": "Europe/Paris",
    "currency": "EUR",
    "booking_rules": {
      "min_hours_before": 2,
      "max_days_ahead": 14,
      "cancellation_hours": 2
    }
  }'::jsonb,
  branding JSONB DEFAULT '{
    "primary_color": "#2D8B3E",
    "secondary_color": "#9C27B0",
    "accent_color": "#FF6B35",
    "logo_url": null
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Enums
```sql
-- Roles utilisateurs staff
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'coach');

-- Statuts membres
CREATE TYPE member_status AS ENUM ('prospect', 'active', 'expired', 'suspended', 'archived');

-- Statuts abonnements
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'suspended', 'cancelled');

-- Statuts reservations
CREATE TYPE reservation_status AS ENUM ('confirmed', 'cancelled', 'no_show', 'waitlist');

-- Types de blocs WOD
CREATE TYPE block_type AS ENUM ('warmup', 'skill', 'strength', 'wod', 'cooldown', 'accessory');

-- Types de WOD
CREATE TYPE wod_type AS ENUM ('amrap', 'emom', 'for_time', 'tabata', 'chipper', 'ladder', 'custom');

-- Types de scores
CREATE TYPE score_type AS ENUM ('time', 'rounds_reps', 'weight', 'reps', 'distance', 'calories');

-- RX ou Scaled
CREATE TYPE rx_scaled AS ENUM ('rx', 'scaled', 'rx_plus');

-- Types de documents
CREATE TYPE document_type AS ENUM ('medical_certificate', 'id_card', 'contract', 'other');

-- Statuts leads
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'trial_scheduled', 'trial_done', 'converted', 'lost');

-- Types de communication
CREATE TYPE communication_type AS ENUM ('email', 'push', 'discord', 'sms');
```

### 3.3 Row Level Security (Multi-Tenant)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- ... etc pour toutes les tables

-- Fonction helper pour obtenir les orgs de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(org_id)
  FROM organization_users
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policy exemple pour members
CREATE POLICY "Users can view members of their org"
  ON members FOR SELECT
  USING (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Users can insert members in their org"
  ON members FOR INSERT
  WITH CHECK (org_id = ANY(get_user_org_ids()));

CREATE POLICY "Users can update members in their org"
  ON members FOR UPDATE
  USING (org_id = ANY(get_user_org_ids()));

-- Policy pour adherents (via leur user_id)
CREATE POLICY "Members can view their own data"
  ON members FOR SELECT
  USING (user_id = auth.uid());
```

---

## 4. API Design

### 4.1 Approche

- **Server Components** : Lecture directe Supabase (pas d'API)
- **Server Actions** : Mutations (create, update, delete)
- **API Routes** : Webhooks externes (Discord, site web, MCP)

### 4.2 Server Actions Structure

```typescript
// app/actions/members.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateMemberSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
})

export async function createMember(orgId: string, formData: FormData) {
  const supabase = createClient()

  const validated = CreateMemberSchema.parse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
  })

  const { data, error } = await supabase
    .from('members')
    .insert({ org_id: orgId, ...validated })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/members')
  return data
}
```

### 4.3 API Routes (Externes)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | /api/leads | Creer un lead (formulaire site) | API Key |
| POST | /api/webhooks/discord | Callbacks Discord | Signature |
| GET | /api/tv/[token] | Donnees pour affichage TV | Token TV |
| POST | /api/mcp/workouts | Creation WOD via MCP Claude | MCP Auth |
| GET | /api/public/schedule/[slug] | Planning public d'une salle | Public |

### 4.4 Realtime Subscriptions

```typescript
// Sync TV en temps reel
const channel = supabase
  .channel('tv-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'classes',
      filter: `org_id=eq.${orgId}`,
    },
    (payload) => {
      // Mise a jour affichage TV
    }
  )
  .subscribe()
```

---

## 5. Component Architecture

### 5.1 Structure Projet

```
/skaliprog
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + Header
│   │   ├── page.tsx                # Dashboard home
│   │   ├── members/
│   │   │   ├── page.tsx            # Liste membres
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx        # Detail membre
│   │   │   └── new/
│   │   │       └── page.tsx        # Nouveau membre
│   │   ├── subscriptions/
│   │   ├── schedule/
│   │   │   ├── page.tsx            # Calendrier
│   │   │   └── [classId]/
│   │   ├── workouts/
│   │   │   ├── page.tsx            # Liste WODs
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Detail/Edit WOD
│   │   │   │   └── tv/
│   │   │   │       └── page.tsx    # Mode TV
│   │   │   └── builder/
│   │   │       └── page.tsx        # Builder WOD
│   │   ├── leads/
│   │   ├── communications/
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── organization/
│   │   │   ├── team/
│   │   │   ├── plans/
│   │   │   ├── class-types/
│   │   │   ├── discord/
│   │   │   └── branding/
│   │   └── reports/
│   ├── (member)/                   # PWA Adherent
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Home adherent
│   │   ├── schedule/
│   │   ├── wod/
│   │   ├── scores/
│   │   ├── profile/
│   │   └── shop/
│   ├── tv/
│   │   └── [token]/
│   │       └── page.tsx            # Affichage TV
│   ├── api/
│   │   ├── leads/
│   │   ├── webhooks/
│   │   ├── tv/
│   │   └── mcp/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── forms/
│   │   ├── member-form.tsx
│   │   ├── workout-form.tsx
│   │   └── ...
│   ├── tables/
│   │   ├── members-table.tsx
│   │   ├── data-table.tsx
│   │   └── ...
│   ├── calendar/
│   │   ├── schedule-calendar.tsx
│   │   └── class-card.tsx
│   ├── workout/
│   │   ├── workout-builder.tsx
│   │   ├── block-editor.tsx
│   │   ├── exercise-picker.tsx
│   │   └── timer.tsx
│   ├── tv/
│   │   ├── tv-display.tsx
│   │   ├── workout-view.tsx
│   │   └── team-view.tsx
│   ├── dashboard/
│   │   ├── stats-cards.tsx
│   │   ├── alerts-widget.tsx
│   │   └── today-schedule.tsx
│   └── layout/
│       ├── sidebar.tsx
│       ├── header.tsx
│       ├── mobile-nav.tsx
│       └── org-switcher.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   ├── middleware.ts           # Auth middleware
│   │   └── admin.ts                # Service role client
│   ├── validations/
│   │   ├── member.ts
│   │   ├── workout.ts
│   │   └── ...
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── cn.ts
│   └── constants/
│       ├── exercises.ts
│       └── wod-types.ts
├── actions/
│   ├── members.ts
│   ├── subscriptions.ts
│   ├── classes.ts
│   ├── workouts.ts
│   ├── reservations.ts
│   └── ...
├── hooks/
│   ├── use-org.ts
│   ├── use-realtime.ts
│   └── use-member.ts
├── types/
│   ├── database.ts                 # Types generes Supabase
│   ├── api.ts
│   └── index.ts
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   └── icons/
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_rls_policies.sql
│   │   └── ...
│   ├── seed.sql
│   └── config.toml
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 5.2 Composants Cles

#### Layout Dashboard
```
+----------------------------------------------------------+
|  Header (org name, notifications, user menu)              |
+----------+-----------------------------------------------+
|          |                                               |
| Sidebar  |  Main Content Area                            |
|          |                                               |
| - Home   |  +------------------------------------------+ |
| - Members|  |  Page Header (title, actions)            | |
| - Subs   |  +------------------------------------------+ |
| - Schedule  |                                           | |
| - Workouts  |  Content                                  | |
| - Leads  |  |                                           | |
| - Comms  |  |                                           | |
| -------- |  |                                           | |
| Settings |  |                                           | |
|          |  +------------------------------------------+ |
+----------+-----------------------------------------------+
```

#### PWA Adherent (Mobile)
```
+---------------------------+
|  Header (logo, profile)   |
+---------------------------+
|                           |
|  Today's WOD Card         |
|                           |
+---------------------------+
|                           |
|  Upcoming Classes         |
|  (swipeable cards)        |
|                           |
+---------------------------+
|                           |
|  My Stats / PRs           |
|                           |
+---------------------------+
| [Home] [Schedule] [WOD] [Profile] |
+---------------------------+
```

---

## 6. Security Considerations

### 6.1 Authentication Flow

```
1. User enters email/password
2. Supabase Auth validates credentials
3. Session cookie set (httpOnly, secure)
4. Middleware checks session on each request
5. RLS policies enforce data access
```

### 6.2 Security Checklist

- [x] **Authentication:** Supabase Auth avec sessions securisees
- [x] **Authorization:** RLS PostgreSQL + verification cote serveur
- [x] **Data Encryption:** HTTPS (Vercel), at-rest (Supabase)
- [x] **Input Validation:** Zod schemas sur toutes les entrees
- [x] **CSRF Protection:** Next.js Server Actions (built-in)
- [x] **XSS Prevention:** React auto-escape + CSP headers
- [x] **SQL Injection:** Supabase client parameterized queries
- [x] **Rate Limiting:** Vercel Edge + Supabase (a configurer)
- [x] **Secrets Management:** Variables d'environnement Vercel
- [ ] **Audit Logging:** A implementer (table audit_logs)
- [ ] **2FA/MFA:** Supabase Auth MFA (optionnel)

### 6.3 Donnees Sensibles

| Donnee | Protection |
|--------|------------|
| Certificats medicaux | Storage prive, signed URLs, expiration |
| Mots de passe | Hash bcrypt (Supabase Auth) |
| Tokens Discord | Chiffrement applicatif (crypto) |
| Donnees paiement | Pas stockees (Stripe si integration) |

---

## 7. Scalability Strategy

### 7.1 Architecture Scalable

```
                    +------------------+
                    |    Cloudflare    |
                    |    (CDN, DDoS)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |      Vercel      |
                    |   Edge Network   |
                    | (auto-scaling)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+   +------v------+  +----v-----+
     | Supabase   |   | Supabase    |  | Supabase |
     | Pooler     |   | Realtime    |  | Storage  |
     | (PgBouncer)|   | (WebSocket) |  | (S3)     |
     +--------+---+   +-------------+  +----------+
              |
     +--------v--------+
     |   PostgreSQL    |
     |   (Read Replicas|
     |    si besoin)   |
     +-----------------+
```

### 7.2 Optimisations

| Niveau | Strategie |
|--------|-----------|
| Frontend | ISR, Edge caching, Image optimization |
| API | Connection pooling, query optimization |
| Database | Indexes, materialized views si besoin |
| Realtime | Channels par org (isolation) |
| Storage | CDN Supabase, lazy loading images |

### 7.3 Limites Estimees (Supabase Pro)

| Metrique | Limite | Notre usage estime |
|----------|--------|-------------------|
| Database | 8GB | < 1GB (debut) |
| Storage | 100GB | < 5GB (debut) |
| Bandwidth | 250GB | < 50GB/mois |
| Realtime connections | 500 | < 50 (1 salle) |
| Edge Function invocations | 2M/mois | < 100K |

---

## 8. Deployment Architecture

### 8.1 Environnements

| Environnement | URL | Branche | Supabase |
|---------------|-----|---------|----------|
| Production | skaliprog.com | main | Prod project |
| Staging | staging.skaliprog.com | staging | Staging project |
| Preview | *.vercel.app | PR branches | Dev project |
| Local | localhost:3000 | - | Local / Dev |

### 8.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 8.3 Database Migrations

```bash
# Local development
supabase db reset      # Reset + apply all migrations
supabase db push       # Push local changes to remote

# Production (via Supabase Dashboard ou CLI)
supabase db push --db-url $PRODUCTION_DB_URL
```

---

## 9. Technical Decisions Log

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Database | Neon, PlanetScale, Supabase | Supabase | All-in-one (Auth, Realtime, Storage) |
| Auth | NextAuth, Clerk, Supabase | Supabase Auth | Integre, RLS natif, moins de deps |
| ORM | Prisma, Drizzle, Supabase JS | Supabase JS | Direct, moins de build step, types generes |
| Styling | CSS Modules, styled-components, Tailwind | Tailwind + shadcn | Productivite, design system, accessibilite |
| State | Redux, Zustand, Jotai | Server State + Zustand si besoin | RSC first, minimal client state |
| Forms | Formik, React Hook Form | React Hook Form + Zod | Performant, type-safe |
| Calendar | react-big-calendar, FullCalendar | FullCalendar | Features completes, mobile-ready |
| Email | Nodemailer, SendGrid, Resend | Resend | React Email templates, DX moderne |
| Realtime | Pusher, Ably, Supabase | Supabase Realtime | Deja integre, moins de cout |

---

## 10. Technical Debt & Risks

| Item | Risk Level | Mitigation |
|------|------------|------------|
| Supabase vendor lock-in | Medium | Standard PostgreSQL, migrations exportables |
| Vercel vendor lock-in | Low | Next.js portable, Docker possible |
| Realtime scaling | Low | Channels isoles par org, upgrade plan si besoin |
| PWA limitations iOS | Medium | Web Push workaround, notifications email fallback |
| Discord bot rate limits | Low | Queue messages, respect rate limits |
| Large file uploads | Low | Direct to Storage avec signed URLs |

---

## 11. Design System (Charte Graphique)

### 11.1 Couleurs (basees sur laskali.eu)

```typescript
// tailwind.config.ts
const colors = {
  // Couleurs principales
  primary: {
    DEFAULT: '#2D8B3E',  // Vert
    dark: '#0F4F35',
    light: '#4CAF50',
  },
  secondary: {
    DEFAULT: '#9C27B0',  // Violet
    dark: '#673AB7',
    light: '#BA68C8',
  },
  accent: {
    DEFAULT: '#FF6B35',  // Orange
    dark: '#E85D2F',
    light: '#FF8A65',
  },

  // Neutres
  background: '#FFFFFF',
  foreground: '#1A1A1A',
  muted: '#F5F5F5',
  border: '#E5E5E5',
}

// Gradients
const gradients = {
  green: 'linear-gradient(135deg, #2D8B3E, #0F4F35)',
  purple: 'linear-gradient(135deg, #9C27B0, #673AB7)',
  orange: 'linear-gradient(135deg, #FF6B35, #E85D2F)',
}
```

### 11.2 Typographie

```typescript
// Famille: Inter (Google Fonts)
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
}
```

### 11.3 Composants UI

- Boutons avec gradients sur hover
- Cards avec effet glass (backdrop-blur)
- Badges arrondis (border-radius: 50px)
- Shadows douces (6-12% opacity)
- Transitions fluides (200-300ms)

---

## 12. MCP Claude Integration (Future)

### 12.1 Configuration

```json
{
  "servers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=jhrbzdznuiwjojruiqee"
    }
  }
}
```

### 12.2 Endpoint Custom MCP

```typescript
// app/api/mcp/workouts/route.ts
export async function POST(request: Request) {
  // Verification auth MCP
  // Parse la requete Claude
  // Cree le workout via Supabase
  // Retourne le resultat
}
```

---

**CHECKPOINT:** Validation de cette architecture requise avant de passer aux Stories detaillees.

**@ARCH -> Humain:** Cette architecture te convient ? On a :
- Schema BDD complet avec 15+ tables
- RLS multi-tenant
- Structure projet Next.js
- Design system base sur La Skali
- Config Supabase prete

Tu valides avant que @SM Sam cree les stories detaillees pour le premier sprint ?
