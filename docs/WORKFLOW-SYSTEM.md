# Workflow Automation System - Documentation Technique

> Systeme d'automatisation style N8N integre a Skali Prog

---

## Status Implementation

| Composant | Status | Notes |
|-----------|--------|-------|
| Editeur visuel | ✅ COMPLET | ReactFlow (@xyflow/react) |
| Backend CRUD | ✅ COMPLET | Server Actions (645 lignes) |
| Base de donnees | ✅ COMPLET | Migration 00008_workflows.sql |
| Execution Engine | ⏳ A FAIRE | Triggers automatiques, actions reelles |
| Templates | ✅ COMPLET | Support templates + folders |

---

## 1. Vue d'ensemble

Le systeme de workflows permet aux administrateurs de creer des automatisations visuelles pour:
- Envoyer des emails, SMS, notifications push, messages Discord
- Reagir aux evenements (nouveau membre, reservation, paiement, etc.)
- Automatiser les taches repetitives (relances, rappels, felicitations)
- Creer des sequences marketing (nurturing leads, onboarding)

### Stack Technique

| Composant | Technologie | Status |
|-----------|-------------|--------|
| Editeur visuel | ReactFlow (@xyflow/react v12) | ✅ Implemente |
| Backend | Next.js Server Actions | ✅ Implemente |
| Base de donnees | PostgreSQL (Supabase) | ✅ Implemente |
| Execution | Edge Functions + Queue | ⏳ A faire |
| Temps reel | Supabase Realtime | ✅ Pret |

> **Note:** bpmn-js etait prevu initialement mais ReactFlow a ete choisi pour sa simplicite et flexibilite. Voir DECISIONS-LOG.md.

---

## 2. Architecture des Donnees

### Tables Principales

```
workflows
├── id, org_id, name, description
├── is_active, version
├── bpmn_xml (XML BPMN 2.0 pour bpmn-js)
├── canvas_data (positions, zoom)
├── settings (retry, notifications, etc.)
└── stats (executions, success, failure)

workflow_nodes
├── workflow_id, node_id
├── node_type ('trigger', 'action', 'condition')
├── trigger_type / action_type (ENUMs)
├── trigger_config / action_config (JSONB)
└── position, label, icon

workflow_connections
├── workflow_id
├── source_node_id → target_node_id
├── source_handle, target_handle
└── condition_expression, condition_label

workflow_runs
├── workflow_id, org_id
├── status ('pending', 'running', 'completed', 'failed')
├── trigger_data, variables, context
├── output_data, error_message
└── timing (started_at, completed_at, duration_ms)
```

### ENUMs Disponibles

#### Trigger Types (30 types)

| Categorie | Triggers |
|-----------|----------|
| **Member** | `member_created`, `member_updated`, `member_deleted`, `member_birthday`, `member_inactive_days`, `member_first_class` |
| **Subscription** | `subscription_created`, `subscription_renewed`, `subscription_expiring_soon`, `subscription_expired`, `subscription_cancelled`, `subscription_payment_failed` |
| **Class** | `class_created`, `class_cancelled`, `class_starting_soon`, `class_ended`, `reservation_created`, `reservation_cancelled`, `reservation_no_show`, `waitlist_spot_available` |
| **Performance** | `score_submitted`, `personal_record_achieved`, `benchmark_completed`, `challenge_joined`, `challenge_completed`, `achievement_unlocked` |
| **Finance** | `payment_received`, `payment_failed`, `invoice_created`, `invoice_overdue` |
| **Lead** | `lead_created`, `lead_status_changed`, `lead_inactive_days` |
| **Schedule** | `schedule_daily`, `schedule_weekly`, `schedule_monthly`, `schedule_cron` |
| **Other** | `manual_trigger`, `webhook_received` |

#### Action Types (35 types)

| Categorie | Actions |
|-----------|---------|
| **Communication** | `send_email`, `send_sms`, `send_push_notification`, `send_discord_message`, `send_slack_message`, `send_whatsapp`, `send_in_app_notification` |
| **Member** | `update_member`, `add_member_tag`, `remove_member_tag`, `assign_subscription`, `pause_subscription`, `add_pokemon_card`, `add_achievement` |
| **Class** | `create_reservation`, `cancel_reservation`, `add_to_waitlist` |
| **Finance** | `create_invoice`, `apply_discount`, `refund_payment` |
| **Lead** | `update_lead_status`, `assign_lead_owner`, `convert_lead_to_member` |
| **Data** | `create_record`, `update_record`, `delete_record`, `run_query` |
| **Integration** | `http_request`, `call_webhook` |
| **Flow Control** | `delay`, `condition_branch`, `loop`, `merge`, `split` |
| **Utility** | `transform_data`, `set_variable`, `log_event` |

---

## 3. Integration ReactFlow (IMPLEMENTE)

### Installation

```bash
npm install @xyflow/react
```

### Fichiers Implementes

```
src/components/workflows/
├── workflow-editor.tsx      # Editeur principal avec ReactFlow
├── workflow-node.tsx        # Nodes custom (trigger, action)
├── workflow-node-config.tsx # Panel de configuration
└── workflow-sidebar.tsx     # Sidebar avec nodes draggables

src/app/(dashboard)/dashboard/workflows/
├── page.tsx                 # Liste des workflows
├── workflows-manager.tsx    # Manager avec stats
└── [id]/
    ├── page.tsx             # Page detail
    └── workflow-editor-page.tsx

src/actions/workflows.ts     # Server actions CRUD (645 lignes)
src/types/workflow.types.ts  # Types TypeScript
```

### Fonctionnalites Implementees

- Drag & drop de nodes depuis sidebar
- Connexions entre nodes (edges smoothstep)
- Selection et suppression de nodes
- Panel de configuration contextuel
- Sauvegarde du canvas (nodes, edges, viewport)
- Raccourcis clavier (Delete, Ctrl+S)
- Boutons Undo/Redo (UI prete, logique a implementer)
- Templates pre-configures
- Folders pour organiser les workflows
- Stats d'execution par workflow

---

## 4. Composants React (IMPLEMENTE)

### WorkflowEditor (Reel)

Voir le code complet dans `src/components/workflows/workflow-editor.tsx`

Caracteristiques:
- ReactFlowProvider pour le contexte
- useNodesState / useEdgesState pour la gestion d'etat
- Drag & drop avec onDrop/onDragOver
- Selection avec onNodeClick
- Save avec getViewport pour persister le zoom/pan

### WorkflowNodeConfig (Reel)

Voir `src/components/workflows/workflow-node-config.tsx`

- Panel lateral de configuration
- Formulaires dynamiques selon le type de node
- Update en temps reel des donnees du node

### WorkflowSidebar (Reel)

Voir `src/components/workflows/workflow-sidebar.tsx`

- Liste des triggers disponibles
- Liste des actions disponibles
- Drag & drop vers le canvas

---

## 5. Moteur d'Execution

### Architecture

```
Trigger Event
     ↓
[Event Listener] → Trouve les workflows actifs avec ce trigger
     ↓
[Queue (pg_boss)] → Ajoute l'execution a la queue
     ↓
[Worker] → Execute chaque node sequentiellement
     ↓
[Node Executor] → Execute l'action specifique
     ↓
[Logger] → Log le resultat
```

### Edge Function - Workflow Runner

```typescript
// supabase/functions/workflow-runner/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { workflow_id, run_id, trigger_data } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Charger le workflow
    const { data: workflow } = await supabase
      .from('workflows')
      .select('*, workflow_nodes(*), workflow_connections(*)')
      .eq('id', workflow_id)
      .single();

    // Creer le contexte d'execution
    const context = {
      workflow,
      run_id,
      trigger_data,
      variables: {},
      org_id: workflow.org_id,
    };

    // Trouver le node de depart (trigger)
    const startNode = workflow.workflow_nodes.find(
      (n) => n.node_type === 'trigger'
    );

    // Executer le workflow
    await executeNode(supabase, context, startNode, workflow);

    // Marquer comme complete
    await supabase
      .from('workflow_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', run_id);

  } catch (error) {
    await supabase
      .from('workflow_runs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', run_id);
  }

  return new Response(JSON.stringify({ success: true }));
});
```

### Node Executors

```typescript
// lib/workflow/executors/index.ts
export const nodeExecutors: Record<ActionType, NodeExecutor> = {
  send_email: async (context, config) => {
    const { to, subject, template, variables } = config;
    const html = await renderEmailTemplate(template, {
      ...context.trigger_data,
      ...variables,
    });
    await sendEmail({ to, subject, html });
    return { sent: true };
  },

  send_sms: async (context, config) => {
    const { to, message } = config;
    const interpolated = interpolateVariables(message, context);
    await twilioClient.messages.create({
      to,
      from: process.env.TWILIO_PHONE,
      body: interpolated,
    });
    return { sent: true };
  },

  send_discord_message: async (context, config) => {
    const { webhook_url, channel, message, embed } = config;
    await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: interpolateVariables(message, context),
        embeds: embed ? [buildEmbed(embed, context)] : undefined,
      }),
    });
    return { sent: true };
  },

  delay: async (context, config) => {
    const { duration, unit } = config;
    const ms = convertToMs(duration, unit);
    // Planifier la reprise
    await scheduleResume(context.run_id, ms);
    return { waiting: true, resume_at: Date.now() + ms };
  },

  condition_branch: async (context, config) => {
    const { expression } = config;
    const result = evaluateExpression(expression, context);
    return { branch: result ? 'true' : 'false' };
  },

  // ... autres executors
};
```

---

## 6. Templates Pre-configures

Le systeme inclut 8 templates officiels:

| Template | Categorie | Description |
|----------|-----------|-------------|
| Welcome New Member | Onboarding | Email de bienvenue 1h apres inscription |
| Inactive Member Reminder | Retention | Rappel apres 7 jours d'inactivite |
| Subscription Expiring Soon | Billing | Alerte 7 jours avant expiration |
| Class Reminder | Classes | Rappel 2h avant une seance |
| Personal Record Celebration | Performance | Felicitations + carte Pokemon pour PR |
| Lead Follow-up Sequence | Marketing | Sequence 3 emails sur 5 jours |
| Birthday Wishes | Engagement | Email + code promo anniversaire |
| No-Show Follow-up | Operations | Gestion des absences non signalees |

---

## 7. Variables et Expressions

### Variables Disponibles

```typescript
// Contexte disponible dans les templates
interface WorkflowContext {
  // Organisation
  org: {
    id: string;
    name: string;
    settings: object;
  };

  // Membre (si applicable)
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    // ... autres champs
  };

  // Donnees du trigger
  trigger_data: {
    // Varie selon le type de trigger
    [key: string]: any;
  };

  // Variables definies dans le workflow
  variables: {
    [key: string]: any;
  };

  // Fonctions utilitaires
  now: Date;
  format: (date: Date, format: string) => string;
}
```

### Syntaxe des Expressions

```handlebars
<!-- Variables simples -->
{{member.first_name}}

<!-- Formatage de date -->
{{format(class.starts_at, "DD/MM/YYYY HH:mm")}}

<!-- Conditions -->
{{#if member.has_active_subscription}}
  Votre abonnement est actif
{{else}}
  Renouvelez votre abonnement
{{/if}}

<!-- Boucles -->
{{#each upcoming_classes}}
  - {{this.name}} le {{format(this.starts_at, "DD/MM")}}
{{/each}}
```

---

## 8. Securite

### RLS Policies

- Chaque table a RLS active
- Staff peut voir/modifier les workflows de son org uniquement
- Les templates officiels (org_id = NULL) sont visibles par tous
- Les credentials sont chiffres en base

### Validation

```typescript
// Validation avant execution
async function validateWorkflow(workflow: Workflow): Promise<ValidationResult> {
  const errors: string[] = [];

  // Verifier qu'il y a au moins un trigger
  const triggers = workflow.nodes.filter(n => n.node_type === 'trigger');
  if (triggers.length === 0) {
    errors.push('Le workflow doit avoir au moins un trigger');
  }

  // Verifier que tous les nodes sont connectes
  const unconnected = findUnconnectedNodes(workflow);
  if (unconnected.length > 0) {
    errors.push(`Nodes non connectes: ${unconnected.join(', ')}`);
  }

  // Verifier les configurations requises
  for (const node of workflow.nodes) {
    const nodeErrors = validateNodeConfig(node);
    errors.push(...nodeErrors);
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 9. Monitoring

### Dashboard Metrics

- Nombre d'executions (total, succes, echec)
- Temps moyen d'execution
- Actions par type (emails envoyes, SMS, etc.)
- Workflows les plus utilises
- Erreurs recentes

### Logs

Chaque execution genere des logs detailles:

```typescript
// Niveaux de log
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Structure d'un log
interface WorkflowLog {
  run_id: string;
  node_id: string;
  level: LogLevel;
  message: string;
  data: object;
  created_at: Date;
}
```

---

## 10. API Endpoints

```typescript
// API Routes pour les workflows

// GET /api/workflows - Liste des workflows
// POST /api/workflows - Creer un workflow
// GET /api/workflows/:id - Details d'un workflow
// PUT /api/workflows/:id - Modifier un workflow
// DELETE /api/workflows/:id - Supprimer un workflow
// POST /api/workflows/:id/activate - Activer
// POST /api/workflows/:id/deactivate - Desactiver
// POST /api/workflows/:id/duplicate - Dupliquer
// POST /api/workflows/:id/run - Execution manuelle

// GET /api/workflows/:id/runs - Historique des executions
// GET /api/workflows/:id/runs/:runId - Details d'une execution
// GET /api/workflows/:id/runs/:runId/logs - Logs d'une execution

// GET /api/workflow-templates - Templates disponibles
// POST /api/workflows/from-template - Creer depuis template
```

---

## 11. Roadmap

### Phase 1 (MVP) - COMPLET
- [x] Schema de base (migration 00008_workflows.sql)
- [x] Editeur ReactFlow complet
- [x] Types TypeScript (triggers, actions)
- [x] Server Actions CRUD
- [x] Templates et folders
- [x] Pages dashboard

### Phase 2 - EN COURS
- [ ] Execution Engine (triggers automatiques)
- [ ] Actions reelles (email, SMS, push)
- [ ] Variables et expressions
- [ ] Templates officiels pre-remplis
- [ ] Dashboard monitoring

### Phase 3 - FUTUR
- [ ] Branches conditionnelles avancees
- [ ] Boucles
- [ ] Sous-workflows
- [ ] Webhooks entrants
- [ ] Integrations tierces (Zapier, Make)

---

*Documentation v2.0 - Systeme de Workflows Skali Prog*
*Mise a jour: 2026-02-01 - ReactFlow implemente*
