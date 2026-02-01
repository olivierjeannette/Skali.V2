# Decisions Log - Skali Prog v3.0

> Journal des decisions techniques et architecturales

---

## 2026-01-31 - Stack Technique v3.0

### Contexte
Migration de Vanilla JS vers Next.js pour une application SaaS multi-tenant professionnelle.

### Options Considerees
1. **Vanilla JS + Vite** - Continuer avec l'approche actuelle
   - Avantages: Simple, leger
   - Inconvenients: Pas de SSR, SEO limite, routing manuel

2. **React + Vite** - SPA moderne
   - Avantages: Ecosysteme riche
   - Inconvenients: Pas de SSR natif

3. **Next.js 14 App Router** - Framework fullstack
   - Avantages: SSR, Server Actions, optimisations auto
   - Inconvenients: Complexite initiale plus elevee

### Decision
**Next.js 14 App Router** avec:
- TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Realtime)
- Stripe Connect pour paiements multi-tenant
- Zustand pour state management
- GSAP pour animations

### Consequences
- Meilleure SEO pour landing pages
- Server Actions simplifient l'API
- Meilleure DX avec TypeScript
- Scalabilite assuree

---

## 2026-01-31 - Architecture Multi-Tenant

### Contexte
L'application doit supporter plusieurs salles de sport independantes.

### Options Considerees
1. **Database par tenant** - Isolation complete
   - Avantages: Isolation maximale
   - Inconvenients: Complexe a maintenir, couteux

2. **Schema par tenant** - Schemas PostgreSQL separes
   - Avantages: Bonne isolation
   - Inconvenients: Migrations complexes

3. **Row-Level Security (RLS)** - Colonne org_id
   - Avantages: Simple, efficace, Supabase natif
   - Inconvenients: Risque si mal configure

### Decision
**Row-Level Security avec org_id** sur toutes les tables.
- Fonction `is_org_staff(org_id)` pour verifier l'appartenance
- Fonction `is_member_self(member_id)` pour acces PWA

### Consequences
- Toutes les tables ont `org_id UUID NOT NULL`
- RLS policies obligatoires sur chaque table
- Requetes automatiquement filtrees
- Cout infra reduit (single database)

---

## 2026-01-31 - Systeme de Workflows

### Contexte
Les admins veulent automatiser les taches repetitives (emails, rappels, etc.)

### Options Considerees
1. **Integration N8N externe** - Utiliser N8N heberge
   - Avantages: Outil mature, puissant
   - Inconvenients: Cout supplementaire, integration complexe

2. **Integration Zapier/Make** - SaaS externes
   - Avantages: Facile pour utilisateurs
   - Inconvenients: Cout par execution, limites

3. **Systeme integre avec bpmn-js** - Editeur visuel BPMN
   - Avantages: Standard BPMN, export XML
   - Inconvenients: Lourd, complexe, courbe apprentissage

4. **Systeme integre avec ReactFlow** - Editeur visuel flexible
   - Avantages: Leger, flexible, React-native, grande communaute
   - Inconvenients: Pas de standard BPMN

### Decision
**Systeme integre avec ReactFlow (@xyflow/react)** - IMPLEMENTE

### Consequences
- Migration `00008_workflows.sql` creee
- Editeur visuel complet avec drag & drop
- Nodes custom (triggers, actions)
- Panel de configuration par node
- Server actions CRUD complet (645 lignes)
- Templates et folders supportes

---

## 2026-02-01 - Choix ReactFlow vs bpmn-js

### Contexte
L'editeur de workflows a ete implemente avec ReactFlow au lieu de bpmn-js prevu initialement.

### Justification
1. **Simplicite** - ReactFlow plus leger et facile a integrer
2. **Flexibilite** - Nodes 100% custom sans contrainte BPMN
3. **DX** - React-native, hooks, TypeScript natif
4. **Communaute** - Plus grande communaute, mieux maintenu
5. **Performance** - Plus leger en bundle size
6. **UX** - Plus adapte pour des utilisateurs non-techniques (fitness)

### Fichiers Implementes
- `src/components/workflows/workflow-editor.tsx` - Editeur principal
- `src/components/workflows/workflow-node.tsx` - Nodes custom
- `src/components/workflows/workflow-node-config.tsx` - Config panel
- `src/components/workflows/workflow-sidebar.tsx` - Sidebar draggable
- `src/actions/workflows.ts` - Server actions (CRUD, templates, runs)
- `src/types/workflow.types.ts` - Types TypeScript
- `src/app/(dashboard)/dashboard/workflows/` - Pages

### Status
**COMPLET** - UI fonctionnelle, backend pret, en attente d'execution reelle

---

## 2026-02-01 - Workflow Execution Engine

### Contexte
L'editeur visuel de workflows est complet. Il faut maintenant implementer l'execution reelle.

### Options Considerees
1. **Queue externe (Redis/BullMQ)** - Queue robuste
   - Avantages: Resilient, scalable
   - Inconvenients: Infrastructure supplementaire

2. **Supabase Edge Functions** - Serverless
   - Avantages: Integration native, pas d'infra
   - Inconvenients: Cold starts, limites d'execution

3. **PostgreSQL + API Routes** - Simple et integre
   - Avantages: Pas d'infra supplementaire, transactionnel
   - Inconvenients: Limites pour gros volumes

### Decision
**PostgreSQL pour scheduling + Next.js API Routes pour execution**

Architecture implementee:
- `WorkflowEngine` class pour orchestration
- Action handlers modulaires
- Tables DB pour scheduled runs et notifications
- API Cron pour jobs periodiques
- Triggers integres dans les server actions existantes

### Fichiers Crees
- `src/lib/workflows/engine.ts` - Moteur d'execution (~450 lignes)
- `src/lib/workflows/action-handlers.ts` - 10+ handlers (~600 lignes)
- `src/lib/workflows/triggers.ts` - Fonctions trigger (~200 lignes)
- `src/lib/workflows/index.ts` - Exports
- `src/app/api/workflows/trigger/route.ts` - API trigger
- `src/app/api/workflows/cron/route.ts` - Jobs cron
- `supabase/migrations/00009_workflow_execution.sql` - Tables additionnelles
- `src/app/(dashboard)/dashboard/workflows/[id]/runs/` - Page historique

### Triggers Implementes (MVP)
- member_created
- subscription_expiring_soon
- class_starting_soon
- personal_record_achieved
- manual_trigger
- schedule_daily
- schedule_weekly

### Actions Implementees
- send_email (templates Resend)
- send_in_app_notification
- delay (scheduling)
- condition_branch
- update_member
- send_push_notification
- add/remove_member_tag
- http_request / call_webhook
- log_event

### Consequences
- Workflows executables manuellement via dashboard
- Triggers automatiques sur evenements (creation membre, etc.)
- Jobs cron pour notifications periodiques
- Historique complet des executions avec logs
- Extensible pour futures actions (Discord, SMS, etc.)

---

## 2026-02-01 - Integration Discord

### Contexte
Besoin d'integrer Discord pour publier automatiquement les WODs et envoyer des notifications a la communaute.

### Options Considerees
1. **Bot Discord complet** - Client discord.js avec OAuth
   - Avantages: Commandes slash, reactions, interactions riches
   - Inconvenients: Complexite OAuth, gestion permissions, hebergement bot

2. **Webhooks Discord uniquement** - API webhooks simple
   - Avantages: Simple, pas de bot a gerer, configuration par org facile
   - Inconvenients: Pas de commandes interactives

3. **Integration N8N/Zapier** - Services externes
   - Avantages: Pas de code
   - Inconvenients: Cout, dependance externe, limites

### Decision
**Webhooks Discord uniquement (Phase 1)** avec architecture extensible pour bot futur

### Fichiers Crees
- `supabase/migrations/00011_discord_integration.sql` - Tables DB
- `src/lib/discord/client.ts` - Client webhook (~350 lignes)
- `src/lib/discord/index.ts` - Exports
- `src/actions/discord.ts` - Server actions (~500 lignes)
- `src/app/(dashboard)/dashboard/settings/discord/page.tsx` - UI settings (~400 lignes)

### Fichiers Modifies
- `src/lib/workflows/action-handlers.ts` - Ajout handler `send_discord_message`
- `src/types/workflow.types.ts` - Ajout type et metadata Discord
- `src/app/api/workflows/cron/route.ts` - Ajout job `discord_wod`
- `src/app/(dashboard)/dashboard/settings/page.tsx` - Onglet Discord
- `src/components/workflows/workflow-node.tsx` - Icon Discord
- `src/components/workflows/workflow-sidebar.tsx` - Icon Discord

### Fonctionnalites Implementees
- Publication automatique WOD (configurable par jour/heure)
- Notifications: welcome, class reminder, achievement, announcement
- Action workflow `send_discord_message` avec interpolation variables
- Embeds riches avec formatage WOD detaille
- Historique et stats des messages
- Test webhook depuis UI

### Consequences
- Les orgs peuvent configurer Discord en autonomie
- WODs publies automatiquement chaque matin
- Integration naturelle dans le systeme de workflows
- Extensible vers bot complet si besoin

---

## 2026-01-31 - Mode Developpement Autonome

### Contexte
Besoin de developper l'application complete avec minimum d'interventions.

### Decision
**Mode autonome active** avec:
- Toutes permissions de dev accordees
- Auto-verification apres chaque modification
- Log des decisions dans ce fichier
- Sauvegarde d'etat si contexte limite
- Sous-agents pour parallelisation

### Consequences
- Developpement plus rapide
- Tracabilite complete
- Reprise possible a tout moment

---

## 2026-02-01 - Architecture Super Admin Platform (B2B2C)

### Contexte
Besoin d'un systeme multi-tenant ou le super admin (proprietaire de la plateforme) peut creer des organisations pour d'autres gerants de salles, avec facturation et fees sur transactions.

### Options Considerees
1. **Multi-database** - Une base par tenant
   - Avantages: Isolation totale
   - Inconvenients: Tres complexe, couteux, maintenance lourde

2. **Multi-schema PostgreSQL** - Un schema par tenant
   - Avantages: Bonne isolation
   - Inconvenients: Migrations complexes, Supabase ne supporte pas bien

3. **Row-Level Security + Super Admin** - RLS existant avec role super admin
   - Avantages: Simple, evolutif, Supabase natif
   - Inconvenients: Requiert attention sur les policies

### Decision
**Row-Level Security avec Super Admin role** - Extension du systeme existant

### Architecture Implementee

```
NIVEAU 1: SUPER ADMIN (is_super_admin = true sur profiles)
├── Acces /admin/*
├── Cree des organisations
├── Invite des owners
├── Configure les plans et fees
├── Voit toutes les stats globales
└── Peut impersonate n'importe quelle org

NIVEAU 2: OWNERS/ADMINS (role = owner/admin dans organization_users)
├── Acces /dashboard/* de leur org uniquement
├── Gerent leurs membres, planning, etc.
├── Configurent Stripe Connect (leur compte)
└── Paient un abonnement platform

NIVEAU 3: MEMBRES (via global_members + member_org_links)
├── Acces /member/* pour leur salle
├── Compte global unique (email)
├── Peuvent etre lies a plusieurs salles
└── Transfert possible avec copie des donnees
```

### Fichiers Crees
- `supabase/migrations/00013_super_admin_platform.sql` (~500 lignes)
- `src/types/platform.types.ts` (~250 lignes)
- `src/actions/platform.ts` (~780 lignes)
- `src/app/(admin)/admin/layout.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/app/(admin)/admin/organizations/page.tsx`
- `src/app/(admin)/admin/organizations/new/page.tsx`
- `src/app/(admin)/admin/organizations/[id]/page.tsx`
- `src/app/(admin)/admin/organizations/[id]/org-actions.tsx`

### Plans Platform (prix en centimes)

| Tier | Prix/mois | Max membres | Fee % | Features |
|------|-----------|-------------|-------|----------|
| free_trial | 0 | 20 | 0% | Toutes (14 jours) |
| basic | 2900 | 50 | 1.5% | Base |
| pro | 7900 | 200 | 1.0% | + TV, Teams, Discord, Workflows |
| enterprise | 14900 | illimite | 0.5% | + API, White-label, Support |

### Consequences
- Migration doit etre appliquee sur Supabase
- Premiere organisation = la tienne (marquer is_super_admin manuellement)
- Nouvelles orgs creees via /admin/organizations/new
- Stripe Platform fees a configurer dans Stripe Dashboard

---

## 2026-02-01 - Platform Billing & Coupons (Session 20)

### Contexte
Les 3 dernieres fonctionnalites a implementer pour completer le MVP:
1. Facturation salles (Stripe Billing pour abonnements platform)
2. Email d'invitation owner (templates Resend)
3. Codes promo / Coupons (Stripe Coupons API)

### Decisions

#### 1. Stripe Billing pour Platform Subscriptions
- Utilisation de Stripe Checkout pour les abonnements platform
- Support des intervalles monthly et yearly
- Integration des coupons Stripe lors du checkout
- Tables DB pour historique (platform_subscriptions, platform_invoices)

#### 2. Systeme de Coupons
- Synchronisation Stripe Coupons + Promotion Codes
- Validation cote serveur via fonction PostgreSQL `validate_coupon`
- Support discount percent et fixed_amount
- Restrictions: max_redemptions, first_time_only, applies_to_plans, valid_until

#### 3. Owner Invitation Flow
- Email d'invitation via Resend avec template React
- Token unique genere par PostgreSQL (gen_random_uuid)
- Expiration 7 jours
- Page d'acceptation: creation compte + liaison org + email welcome

### Fichiers Crees
- `supabase/migrations/00014_platform_billing_coupons.sql`
- `src/types/billing.types.ts`
- `src/actions/billing.ts`
- `src/lib/resend/templates/owner-invitation.tsx`
- `src/app/(auth)/invite/accept/page.tsx`
- `src/app/(admin)/admin/coupons/page.tsx`

### Consequences
- Migration 00014 a appliquer sur Supabase
- Stripe Products/Prices pour platform plans a creer manuellement ou via sync
- Email FROM a configurer dans Resend

---

*Derniere mise a jour: 2026-02-01*
