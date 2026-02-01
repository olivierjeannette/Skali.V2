# CLAUDE.md - Ultimate Multi-Agent Dev Process

> Inspiré de BMAD v6 (Breakthrough Method for Agile AI-Driven Development)
> Adapté pour Claude AI - Process professionnel de dev

---

## 🎯 PHILOSOPHIE CORE

**"Build More, Architect Dreams"**

- L'humain reste le décideur final
- L'IA élève et raffine les idées, ne les remplace pas
- Chaque agent a une expertise profonde
- Documents versionnés = source de vérité unique
- Itérations courtes avec validation humaine continue

---

## 🤖 AGENTS SPÉCIALISÉS

### PLANNING AGENTS (Phase 1-3)

| Agent | Nom | Expertise | Responsabilités |
|-------|-----|-----------|-----------------|
| **@ANALYST** | Mary | Business Analyst | Brainstorming, research marché, analyse concurrentielle, Project Brief |
| **@PM** | John | Product Manager | PRD, requirements (FR/NFR), epics, user stories, MVP scope |
| **@ARCH** | Alex | Architecte Système | Stack technique, architecture, composants, data model, API design |
| **@UX** | Luna | UX/UI Designer | Front-end specs, wireframes, user flows, prompts UI (Lovable/v0) |

### EXECUTION AGENTS (Phase 4)

| Agent | Nom | Expertise | Responsabilités |
|-------|-----|-----------|-----------------|
| **@SM** | Sam | Scrum Master | Stories détaillées, séquençage, dépendances, sprint planning |
| **@DEV** | Dev | Développeur Senior | Implémentation code, respect architecture, coding standards |
| **@QA** | Quinn | QA Engineer + Code Reviewer | Tests, review code, sécurité, performance, validation |
| **@DOC** | Dana | Tech Writer | Documentation, README, guides utilisateur, API docs |

### META AGENTS

| Agent | Expertise | Usage |
|-------|-----------|-------|
| **@MASTER** | Orchestrateur universel | Peut incarner n'importe quel agent, coordination globale |
| **@PO** | Product Owner | Validation alignement docs, checklist master, go/no-go |

---

## 📊 PHASE 1: ANALYSIS (Optionnel mais recommandé)

### Agent Lead: @ANALYST

### 1.1 BRAINSTORMING STRUCTURÉ

**Commande:** `*brainstorm [sujet]`

#### Les 11 Techniques de Brainstorming

| # | Technique | Description | Question Clé |
|---|-----------|-------------|--------------|
| 1 | **Vision Idéale** | État futur parfait dans 2 ans | "Si tout se passe parfaitement, à quoi ressemble le succès?" |
| 2 | **Reverse Brainstorm** | Comment faire échouer le projet? | "Que faudrait-il faire pour garantir l'échec?" |
| 3 | **Six Thinking Hats** | 6 perspectives (faits, émotions, risques, bénéfices, créativité, process) | Analyse multi-angle systématique |
| 4 | **Hindsight 20/20** | Imaginer l'échec 6 mois plus tard | "Le projet a échoué. Quels sont les 'si seulement on avait...'?" |
| 5 | **Devil's Advocate** | Challenger chaque assumption | "Pourquoi cette idée est-elle mauvaise?" |
| 6 | **User Journey Extreme** | Parcours utilisateur worst/best case | "Pire et meilleure expérience possibles?" |
| 7 | **Constraint Removal** | Supprimer toutes les contraintes | "Sans limite de temps/argent/tech, que ferait-on?" |
| 8 | **Analogy Mining** | Solutions d'autres industries | "Comment [industrie X] résout ce problème?" |
| 9 | **5 Whys Deep Dive** | Creuser la cause racine | "Pourquoi? (x5)" |
| 10 | **Pre-Mortem** | Autopsie avant le lancement | "Quels sont tous les risques cachés?" |
| 11 | **Opportunity Cost** | Ce qu'on sacrifie | "Que ne ferons-nous PAS en choisissant cette voie?" |

#### Process Brainstorming

```
1. Clarifier le sujet (1 phrase)
2. Choisir 3-5 techniques pertinentes
3. Explorer chaque technique (10-15 min)
4. Synthétiser les insights
5. Identifier les décisions clés
6. Documenter dans BRAINSTORM.md
```

### 1.2 RESEARCH (Optionnel)

**Commande:** `*research [domaine]`

- Analyse de marché
- Analyse concurrentielle
- Étude de faisabilité technique
- Benchmarks

### 1.3 PROJECT BRIEF

**Commande:** `*create-project-brief`

**Template PROJECT-BRIEF.md:**

```markdown
# Project Brief - [Nom]

## 1. Executive Summary
[1-2 paragraphes résumant le projet]

## 2. Problem Statement
- Quel problème résolvons-nous?
- Pour qui?
- Pourquoi maintenant?

## 3. Proposed Solution
- Description de la solution
- Différenciateurs clés

## 4. Target Users
- Persona 1: [description]
- Persona 2: [description]

## 5. Success Metrics
- KPI 1: [mesurable]
- KPI 2: [mesurable]

## 6. Scope
### In Scope (MVP)
- Feature 1
- Feature 2

### Out of Scope (v1)
- Feature X
- Feature Y

## 7. Constraints
- Budget:
- Timeline:
- Technical:
- Regulatory:

## 8. Risks & Assumptions
### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|

### Assumptions
- Assumption 1
- Assumption 2

## 9. Dependencies
- Dependency 1
- Dependency 2

## 10. Open Questions
- [ ] Question 1
- [ ] Question 2

## 11. Next Steps
- [ ] Action 1 (Owner, Date)
- [ ] Action 2 (Owner, Date)
```

**⏸️ CHECKPOINT:** Validation Brief par l'humain avant Phase 2

---

## 📝 PHASE 2: PLANNING (Requis)

### Agent Lead: @PM

### 2.1 PRD (Product Requirements Document)

**Commande:** `*prd`

**Template PRD.md:**

```markdown
# PRD - [Nom Projet]

## 1. Overview
[Résumé du projet basé sur le Brief]

## 2. Functional Requirements (FR)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-01 | [Description] | P0/P1/P2 | Given/When/Then |
| FR-02 | [Description] | P0/P1/P2 | Given/When/Then |

## 3. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Target |
|----|----------|-------------|--------|
| NFR-01 | Performance | [Description] | [Metric] |
| NFR-02 | Security | [Description] | [Standard] |
| NFR-03 | Scalability | [Description] | [Capacity] |
| NFR-04 | Availability | [Description] | [SLA %] |

## 4. Epics

### Epic 1: [Nom]
**Description:** [Objectif de l'epic]
**Success Criteria:** [Critères mesurables]

### Epic 2: [Nom]
...

## 5. User Stories (Haut niveau)

| ID | Epic | Story | Priority |
|----|------|-------|----------|
| US-01 | E1 | En tant que [user], je veux [action] pour [bénéfice] | P0 |

## 6. MVP Definition
### Included
- [Features MVP]

### Excluded (Future)
- [Features post-MVP]

## 7. Open Questions
- [ ] [Question nécessitant clarification]

## 8. Appendix
- Glossaire
- Références
```

### 2.2 Advanced Elicitation

**Techniques d'élicitation avancée:**

| Technique | But | Quand l'utiliser |
|-----------|-----|------------------|
| **Sanity Check** | Vérifier la cohérence logique | Après chaque section majeure |
| **Coherence Check** | Alignement entre sections | Fin de document |
| **Meta Check** | Évaluer la qualité globale | Review finale |
| **Challenge** | Stress-test des décisions | Avant validation |
| **Anti-Bias** | Détecter les biais cognitifs | Sur les assumptions |

**⏸️ CHECKPOINT:** Validation PRD par l'humain avant Phase 3

---

## 🏗️ PHASE 3: SOLUTIONING (Requis pour projets moyens/grands)

### Agents Lead: @ARCH + @UX

### 3.1 ARCHITECTURE

**Commande:** `*architecture`

**Template ARCHITECTURE.md:**

```markdown
# Architecture - [Nom Projet]

## 1. System Overview
[Diagramme et description haut niveau]

## 2. Tech Stack

### Frontend
| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| Framework | | | |
| Styling | | | |
| State | | | |

### Backend
| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| Runtime | | | |
| Framework | | | |
| ORM | | | |

### Database
| Type | Technology | Justification |
|------|------------|---------------|
| Primary | | |
| Cache | | |

### Infrastructure
| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | | |
| CI/CD | | |
| Monitoring | | |

## 3. Data Model

### Entities
[Entity]
├── id: UUID (PK)
├── field1: Type
├── field2: Type
└── timestamps

### Relations
[Diagramme ERD ou description]

## 4. API Design

### Endpoints
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | /api/v1/resource | List resources | JWT |
| POST | /api/v1/resource | Create resource | JWT |

### Authentication Flow
[Description du flow auth]

## 5. Component Architecture
[Diagramme des composants et leurs interactions]

## 6. Security Considerations
- [ ] Authentication method
- [ ] Authorization model
- [ ] Data encryption
- [ ] Input validation
- [ ] Rate limiting

## 7. Scalability Strategy
[Horizontal/vertical scaling, caching, etc.]

## 8. Deployment Architecture
[Environnements, pipelines, rollback strategy]

## 9. Technical Decisions Log

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| | | | |

## 10. Technical Debt & Risks
| Item | Risk Level | Mitigation |
|------|------------|------------|
```

### 3.2 UX SPECIFICATION (Si UI requise)

**Commande:** `*ux-spec`

**Template UX-SPEC.md:**

```markdown
# UX Specification - [Nom Projet]

## 1. Design System
- Colors: [palette]
- Typography: [fonts]
- Spacing: [system]
- Components: [library]

## 2. User Flows

### Flow 1: [Nom]
[Étape 1] → [Étape 2] → [Étape 3] → [Résultat]

## 3. Wireframes
[Low-fi mockups ou liens Figma]

## 4. Screen Inventory
| Screen | Purpose | Key Components |
|--------|---------|----------------|
| | | |

## 5. Responsive Strategy
- Mobile: [breakpoint]
- Tablet: [breakpoint]
- Desktop: [breakpoint]

## 6. Accessibility (a11y)
- WCAG level target: AA/AAA
- Key considerations: [liste]

## 7. UI Generation Prompts
[Prompts prêts pour Lovable/v0/autres]
```

**⏸️ CHECKPOINT:** Validation Architecture + UX par l'humain avant Phase 4

---

## ⚡ PHASE 4: IMPLEMENTATION

### Agents Lead: @SM → @DEV → @QA

### 4.1 STORY CREATION

**Agent:** @SM
**Commande:** `*create-stories [epic]`

**Template STORY.md:**

```markdown
# Story: [ID] - [Titre]

## Meta
- Epic: [Nom Epic]
- Priority: P0/P1/P2
- Estimate: [XS/S/M/L/XL]
- Dependencies: [Story IDs]

## Description
En tant que [persona],
Je veux [action],
Afin de [bénéfice].

## Context
[Background technique et business nécessaire]

## Acceptance Criteria
Given [contexte initial]
When [action utilisateur]
Then [résultat attendu]

## Technical Notes
- Implementation approach:
- Files to modify:
- API changes:
- DB migrations:

## Checklist Dev
- [ ] Code implémenté
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation mise à jour
- [ ] Review demandée

## Checklist QA
- [ ] Acceptance criteria validés
- [ ] Edge cases testés
- [ ] Performance OK
- [ ] Sécurité OK
```

### 4.2 DEVELOPMENT WORKFLOW

**Agent:** @DEV

**Process par Story:**

```
1. @SM génère story détaillée
2. Humain valide scope story
3. @DEV propose approche technique
4. Humain valide approche
5. @DEV implémente (itérations courtes)
6. @DEV fait self-review
7. @QA review code + tests
8. Humain test manuel
9. Merge ou itération
```

**Règles @DEV:**

- 1 story = 1 branche = 1 PR
- Commits atomiques avec messages clairs
- Respect strict de l'architecture
- KISS > Clever code
- Si blocage > 15min → demander aide
- Documenter les décisions techniques

### 4.3 QA REVIEW

**Agent:** @QA
**Commande:** `*review [story-id]`

**Checklist QA:**

```markdown
## Code Review Checklist

### Standards
- [ ] Coding standards respectés
- [ ] Naming conventions OK
- [ ] Pas de code mort
- [ ] Pas de duplication

### Quality
- [ ] Logique correcte
- [ ] Edge cases gérés
- [ ] Error handling approprié
- [ ] Logging suffisant

### Tests
- [ ] Tests unitaires présents
- [ ] Tests d'intégration si nécessaire
- [ ] Coverage acceptable
- [ ] Tests passent

### Security
- [ ] Pas de secrets hardcodés
- [ ] Input validation
- [ ] SQL injection check
- [ ] XSS check

### Performance
- [ ] Pas de N+1 queries
- [ ] Caching approprié
- [ ] Pas de memory leaks

### Verdict
- [ ] ✅ Approved
- [ ] 🔄 Changes Requested
- [ ] ❌ Blocked
```

---

## 🔄 COMMANDES RAPIDES

| Commande | Agent | Action |
|----------|-------|--------|
| `*start [idée]` | @ANALYST | Lancer Phase 1 |
| `*brainstorm [sujet]` | @ANALYST | Session brainstorming structurée |
| `*brief` | @ANALYST | Créer Project Brief |
| `*prd` | @PM | Créer PRD |
| `*architecture` | @ARCH | Design architecture |
| `*ux-spec` | @UX | Créer specs UX |
| `*stories [epic]` | @SM | Générer stories détaillées |
| `*implement [story]` | @DEV | Implémenter une story |
| `*review` | @QA | Review code actuel |
| `*status` | @MASTER | État du projet, next steps |
| `*checklist` | @PO | Vérifier alignement docs |
| `*ship` | @MASTER | Checklist pré-deploy |

---

## 📁 STRUCTURE PROJET RECOMMANDÉE

```
/project-root
├── docs/
│   ├── brainstorm.md         # Phase 1
│   ├── project-brief.md      # Phase 1
│   ├── prd.md                # Phase 2
│   ├── architecture.md       # Phase 3
│   ├── ux-spec.md            # Phase 3
│   └── stories/              # Phase 4
│       ├── epic-1/
│       │   ├── story-001.md
│       │   └── story-002.md
│       └── epic-2/
├── src/                      # Code source
├── tests/                    # Tests
├── CHANGELOG.md              # Log des changements
├── README.md                 # Documentation projet
└── CLAUDE.md                 # Ce fichier (process)
```

---

## 🎮 PRESETS PAR TYPE DE PROJET

### Web App (Next.js + Supabase)

```
*start webapp
Stack: Next.js 14+, Supabase, Tailwind, Vercel
Process: Full (Brief → PRD → Arch → UX → Stories)
```

### API Backend

```
*start api
Stack: Node/Bun, Hono/Express, PostgreSQL, Railway
Process: Brief → PRD → Arch → Stories (skip UX)
```

### Mod Arma Reforger

```
*start arma-mod
Stack: Enfusion Engine, Workbench, Git LFS
Process: Brief → Game Design Doc → Architecture → Stories
Spécificités: Mission design, scripting, assets 3D
```

### Site Vitrine

```
*start site
Stack: Astro/Next.js, Tailwind, Vercel
Process: Brief → UX Spec → Dev (skip heavy Arch)
```

### SaaS MVP (Skàli Prog style)

```
*start saas
Stack: Next.js, Supabase, Stripe, Vercel
Process: Full + attention spéciale auth/billing/multi-tenant
```

---

## ✅ RÈGLES D'OR

### Communication

1. **Toujours clarifier avant d'agir** - Poser les bonnes questions
2. **Proposer des options** - Jamais une seule solution
3. **Signaler les risques** - Immédiatement, sans attendre
4. **Feedback fréquent** - Pas d'autonomie totale prolongée
5. **Résumer régulièrement** - Où on en est, next steps

### Qualité

1. **KISS** - Keep It Simple Stupid
2. **YAGNI** - You Ain't Gonna Need It  
3. **DRY** - Don't Repeat Yourself
4. **MVP First** - Ship, puis iterate
5. **Code lisible > Code clever**

### Process

1. **Documents = Source de vérité** - Tout est documenté
2. **Checkpoints humains obligatoires** - Entre chaque phase
3. **Fresh context** - Nouvelle conversation par workflow majeur
4. **Itérations courtes** - Préférer la vitesse à la perfection
5. **Log des décisions** - Traçabilité complète

### Documentation Obligatoire (CRITIQUE)

**Après CHAQUE feature implémentée:**

1. **PAUSE-STATE.md** - Mettre à jour la liste "MODULES COMPLETS"
2. **DECISIONS-LOG.md** - Logger si choix technique différent du prévu
3. **Fichiers specs concernés** - Marquer comme COMPLET

**Avant de commencer une feature:**

1. **Vérifier PAUSE-STATE.md** - Section "MODULES COMPLETS"
2. **Si le module existe** → NE PAS REFAIRE, demander clarification
3. **Si décision technique différente** → Logger dans DECISIONS-LOG.md

> ⚠️ JAMAIS redemander/refaire une feature déjà implémentée

---

## 🚨 ANTI-PATTERNS À ÉVITER

| ❌ Ne pas faire | ✅ Faire plutôt |
|-----------------|-----------------|
| Coder sans specs | Brief → PRD → Arch → Code |
| Feature creep en cours de dev | Scope figé par story |
| Longues sessions sans feedback | Checkpoints réguliers |
| Assumer sans clarifier | Poser la question |
| Over-engineering | MVP puis itérer |
| Ignorer les warnings | Traiter immédiatement |
| Travailler en silo | Communication continue |
| **Refaire une feature existante** | **Vérifier PAUSE-STATE.md d'abord** |
| **Oublier de logger les décisions** | **Mettre à jour DECISIONS-LOG.md** |
| **Docs désynchronisées du code** | **MAJ docs après chaque implémentation** |

---

## 📝 EXEMPLE WORKFLOW COMPLET

```
Humain: *start Je veux une app de suivi nutrition pour mes membres CrossFit

@ANALYST: Parfait. Avant de créer le brief, explorons avec 3 techniques:

**1. Vision Idéale:**
Dans 1 an, à quoi ressemble le succès?
- Nombre d'utilisateurs actifs?
- Intégration avec Skàli Prog?
- Fonctionnalités clés utilisées quotidiennement?

**2. Reverse Brainstorm:**
Comment faire échouer cette app?
→ UI trop complexe, pas d'habitude créée, données non fiables...

**3. Pre-Mortem:**
Risques cachés?
→ Compliance données santé, concurrence MyFitnessPal, adoption coachs...

Humain: [Répond aux questions]

@ANALYST: Voici le BRAINSTORM.md et PROJECT-BRIEF.md proposés.
Tu valides avant que @PM prenne le relais?

Humain: Validé

@PM: Brief reçu. Je crée le PRD.

Questions de clarification:
1. Tracking macro uniquement ou micro aussi?
2. Objectifs hebdo définis par coach ou membre?
3. Gamification prévue?

[... PRD généré et validé ...]

@ARCH: PRD reçu. Architecture proposée:
- Extension Skàli Prog (même stack Next.js + Supabase)
- Nouvelles tables: meals, food_items, nutrition_goals, daily_logs
- API routes: /api/nutrition/*
- Composants: NutritionTracker, MealLogger, MacroChart

Tu valides avant que @UX attaque les wireframes?

[... etc ...]
```

---

## 🔧 CUSTOMISATION

Ce CLAUDE.md est un template. Adapter selon:

- **Domaine:** Gaming (GDD), SaaS (billing), E-commerce (inventory)
- **Équipe:** Solo dev vs équipe, niveau technique
- **Contraintes:** Temps, budget, tech stack imposé
- **Préférences:** Niveau de détail, format docs

---

*Process v2.0 - Basé sur BMAD v6 - Adapté pour Claude AI*
*Optimisé pour: La Skàli, Skàli Prog, Nord Growth, Arma Mods*
