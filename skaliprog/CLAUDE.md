# CLAUDE.md - Skali Prog v2.0 Development Guide

> **Project:** Skali Prog - Application de gestion pour salles de sport
> **Stack:** Next.js 14+ / TypeScript / Supabase / Tailwind / shadcn/ui
> **Repository:** https://github.com/olivierjeannette/Skali.V2

---

## Quick Reference

### Project Structure
```
skaliprog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Protected admin pages
│   │   ├── (member)/          # PWA member pages
│   │   ├── tv/                # TV display pages
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── forms/             # Form components
│   │   ├── tables/            # Data tables
│   │   ├── layout/            # Layout components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── workout/           # WOD builder components
│   │   ├── calendar/          # Calendar components
│   │   └── tv/                # TV display components
│   ├── lib/
│   │   ├── supabase/          # Supabase clients
│   │   └── utils.ts           # Utility functions
│   ├── actions/               # Server Actions
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript types
├── supabase/
│   └── migrations/            # Database migrations
└── docs/                      # Project documentation
```

### Key Files
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/lib/supabase/client.ts` - Browser-side Supabase client
- `src/middleware.ts` - Auth middleware
- `src/types/database.ts` - Database types

### Supabase Config
- **URL:** https://jhrbzdznuiwjojruiqee.supabase.co
- **Project Ref:** jhrbzdznuiwjojruiqee

---

## Development Commands

### Run Development Server
```bash
cd skaliprog && npm run dev
```

### Build for Production
```bash
cd skaliprog && npm run build
```

### Add shadcn Component
```bash
cd skaliprog && npx shadcn@latest add [component-name]
```

### Generate Supabase Types
```bash
npx supabase gen types typescript --project-id jhrbzdznuiwjojruiqee > src/types/database.ts
```

---

## Coding Standards

### File Naming
- Components: `PascalCase.tsx` (e.g., `MemberForm.tsx`)
- Utilities: `kebab-case.ts` (e.g., `date-utils.ts`)
- Types: `kebab-case.ts` in `/types` folder

### Component Pattern
```tsx
// src/components/forms/member-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const memberSchema = z.object({
  first_name: z.string().min(1, 'Prenom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
})

type MemberFormValues = z.infer<typeof memberSchema>

interface MemberFormProps {
  onSubmit: (values: MemberFormValues) => Promise<void>
  defaultValues?: Partial<MemberFormValues>
}

export function MemberForm({ onSubmit, defaultValues }: MemberFormProps) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prenom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ... autres champs */}
        <Button type="submit">Enregistrer</Button>
      </form>
    </Form>
  )
}
```

### Server Action Pattern
```tsx
// src/actions/members.ts
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
  const supabase = await createClient()

  // Verify user has access to org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifie')

  const validated = CreateMemberSchema.parse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
  })

  const { data, error } = await supabase
    .from('members')
    .insert({ org_id: orgId, ...validated, status: 'prospect' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/members')
  return data
}
```

### Page Pattern (Server Component)
```tsx
// src/app/(dashboard)/members/page.tsx
import { createClient } from '@/lib/supabase/server'
import { MembersTable } from '@/components/tables/members-table'

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Adherents</h1>
      </div>
      <MembersTable data={members || []} />
    </div>
  )
}
```

---

## Design System (La Skali)

### Colors
```css
--primary: #2D8B3E;      /* Vert */
--primary-dark: #0F4F35;
--secondary: #9C27B0;    /* Violet */
--secondary-dark: #673AB7;
--accent: #FF6B35;       /* Orange */
--accent-dark: #E85D2F;
```

### Typography
- **Font:** Inter (Google Fonts)
- **Headings:** font-weight 700-800
- **Body:** font-weight 400-500

---

## Database Schema

### Main Tables
| Table | Description |
|-------|-------------|
| `organizations` | Salles (multi-tenant) |
| `organization_users` | Staff (owner, admin, coach) |
| `members` | Adherents |
| `plans` | Formules d'abonnement |
| `subscriptions` | Abonnements vendus |
| `class_types` | Types de cours (WOD, Haltero...) |
| `classes` | Creneaux de cours |
| `reservations` | Inscriptions aux cours |
| `workouts` | Seances/WODs |
| `workout_blocks` | Blocs de seance |
| `exercises` | Bibliotheque mouvements |
| `scores` | Performances adherents |
| `leads` | Prospects |
| `documents` | Fichiers (certificats...) |

### RLS (Row Level Security)
Toutes les tables utilisent RLS pour l'isolation multi-tenant.
Les policies verifient que `org_id` correspond a une organisation de l'utilisateur.

---

## Common Tasks

### Ajouter une nouvelle page dashboard
1. Creer `src/app/(dashboard)/[nom]/page.tsx`
2. Ajouter le lien dans `src/components/layout/sidebar.tsx`

### Ajouter un nouveau composant shadcn
```bash
npx shadcn@latest add [nom]
```

### Creer une migration Supabase
```sql
-- supabase/migrations/YYYYMMDD_description.sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  -- ... colonnes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their org data"
  ON new_table FOR ALL
  USING (org_id IN (
    SELECT org_id FROM organization_users WHERE user_id = auth.uid()
  ));
```

---

## Documentation Links

- [PROJECT-BRIEF.md](../docs/PROJECT-BRIEF.md) - Vision et scope
- [PRD.md](../docs/PRD.md) - Requirements fonctionnels
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Architecture technique

---

## MCP Integration

### Supabase MCP
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

Permet d'interagir avec la base de donnees directement via Claude.

---

## Git Workflow

### Branches
- `main` - Production
- `staging` - Pre-production
- `feature/*` - Nouvelles fonctionnalites
- `fix/*` - Corrections de bugs

### Commit Convention
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: members, workouts, schedule, auth, ui, etc.

Examples:
feat(members): add member creation form
fix(auth): resolve session refresh issue
docs(readme): update installation instructions
```

---

## Contacts & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/jhrbzdznuiwjojruiqee
- **Vercel:** (a configurer)
- **Discord Bot:** (a configurer)
