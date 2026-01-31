# Project Brief - Skàli Prog v2.0

> **Version:** 2.0 - Refonte complète Next.js/TypeScript/Neon
> **Date:** 2026-01-30
> **Auteur:** @ANALYST (Mary)
> **Status:** Draft - En attente validation

---

## 1. Executive Summary

**Skàli Prog** est une application complète de gestion pour salles de sport (CrossFit, functional fitness), conçue pour digitaliser l'intégralité des opérations : gestion des adhérents, vente d'abonnements, planning des cours, création et affichage des séances (WOD), et communication multi-canal.

La v2.0 est une **refonte technique majeure** sur stack moderne (Next.js 14+, TypeScript, Neon PostgreSQL) avec une **architecture multi-tenant native** permettant une commercialisation en SaaS à terme.

**Vision:** Devenir la référence française des logiciels de gestion pour box CrossFit et salles de functional fitness.

---

## 2. Problem Statement

### Quel problème résolvons-nous ?

Les gérants de salles de sport (particulièrement CrossFit/functional fitness) jonglent entre :
- Fichiers Excel pour les adhérents
- WhatsApp/SMS pour la communication
- Tableaux blancs pour les WOD
- Plusieurs outils non connectés (Calendly, Stripe, etc.)

**Résultat :** Perte de temps, erreurs, expérience adhérent fragmentée, pas de vision unifiée.

### Pour qui ?

1. **Gérants de box CrossFit** (priorité 1) - 800+ boxes en France
2. **Salles de functional fitness** (priorité 2)
3. **Petites salles indépendantes** (priorité 3)

### Pourquoi maintenant ?

- Marché CrossFit en croissance continue
- Aucune solution française vraiment complète
- Les solutions US (Wodify, SugarWOD) sont chères et mal adaptées
- Stack technique moderne disponible (Next.js App Router, Edge, etc.)

---

## 3. Proposed Solution

### Description

Application web full-stack avec :

1. **Back-office Admin/Coach** (desktop-first)
   - Dashboard de gestion complet
   - CRM adhérents
   - Builder de séances avec affichage TV
   - Planning et réservations
   - Communications automatisées

2. **PWA Adhérents** (mobile-first)
   - Inscription aux cours
   - Consultation WOD du jour
   - Suivi performances (PRs)
   - Shop intégré
   - Notifications push

3. **Intégrations**
   - Discord (bot WOD + notifications)
   - API publique (connexion site web)
   - MCP Claude (création séances IA)
   - Webhooks (automatisations)

### Différenciateurs clés

| Concurrent | Faiblesse | Notre avantage |
|------------|-----------|----------------|
| Wodify | Cher, US-centric | Prix FR, langue FR, support FR |
| SugarWOD | WOD only, pas de CRM | Solution tout-en-un |
| Deciplus | Généraliste, pas CrossFit | Spécialisé functional fitness |
| Excel/Notion | Manuel, pas connecté | Automatisé, intégré |
| **Skàli Prog** | - | Complet + IA + Discord + SaaS-ready |

---

## 4. Target Users

### Persona 1: Le Gérant (Owner)
- **Profil:** 30-45 ans, ancien athlète devenu entrepreneur
- **Douleurs:** Admin chronophage, pas de visibilité sur le business
- **Besoins:** Dashboard clair, automatisation, gain de temps
- **Usage:** Quotidien, desktop principalement

### Persona 2: Le Coach
- **Profil:** 25-40 ans, passionné, souvent à temps partiel
- **Douleurs:** Création WOD longue, communication dispersée
- **Besoins:** Builder WOD rapide, affichage TV, planning clair
- **Usage:** Quotidien, mix desktop/mobile

### Persona 3: L'Adhérent
- **Profil:** 25-50 ans, sportif régulier
- **Douleurs:** Inscription cours compliquée, pas de suivi perfs
- **Besoins:** App simple, réserver en 2 clics, voir le WOD
- **Usage:** 3-5x/semaine, mobile exclusivement

### Persona 4: Le Prospect (Lead)
- **Profil:** Curieux, veut essayer
- **Douleurs:** Pas de visibilité sur les cours, inscription floue
- **Besoins:** Voir le planning, demander un essai facilement
- **Usage:** Ponctuel, via site web

---

## 5. Success Metrics

### KPIs Business (SaaS)
| Metric | Target M+6 | Target M+12 |
|--------|------------|-------------|
| Salles clientes | 5 | 20 |
| MRR | 500€ | 3000€ |
| Churn mensuel | < 5% | < 3% |
| NPS | > 40 | > 50 |

### KPIs Produit
| Metric | Target |
|--------|--------|
| Temps création WOD | < 2 min |
| Taux adoption app adhérents | > 60% |
| Réservations via app | > 80% |
| Uptime | 99.9% |

### KPIs Skàli (Usage interne)
| Metric | Target |
|--------|--------|
| Adhérents actifs gérés | 100% |
| Cours avec réservation digitale | 100% |
| WOD créés/semaine | 15+ |

---

## 6. Scope

### In Scope (MVP v2.0)

#### Module 1: Core CRM Adhérents
- [ ] CRUD adhérents complet
- [ ] Statuts (prospect, actif, expiré, suspendu)
- [ ] Upload documents (certificat médical, etc.)
- [ ] Historique complet
- [ ] Import CSV/Excel

#### Module 2: Gestion Abonnements & Ventes
- [ ] Catalogue formules configurable
- [ ] Process de vente (devis → paiement)
- [ ] Suivi paiements (comptant, prélèvement)
- [ ] Renouvellements
- [ ] Codes promo

#### Module 3: Planning & Réservations
- [ ] Calendrier interactif (jour/semaine/mois)
- [ ] Types de cours configurables
- [ ] Capacité et liste d'attente
- [ ] Inscription/désinscription adhérents
- [ ] Rappels automatiques

#### Module 4: Builder Séances & Affichage TV
- [ ] Éditeur WOD (exercices, temps, rounds)
- [ ] Bibliothèque exercices
- [ ] Templates réutilisables
- [ ] Mode affichage TV (plein écran)
- [ ] Multi-écrans synchronisés
- [ ] Timer intégré

#### Module 5: Teams & Tirage au Sort
- [ ] Création équipes manuelles
- [ ] Tirage aléatoire équilibré
- [ ] Répartition postes cardio
- [ ] Affichage équipes TV

#### Module 6: Intégration Discord
- [ ] Bot Discord dédié
- [ ] Publication auto WOD
- [ ] Commandes (/wod, /planning)
- [ ] Notifications push

#### Module 7: Communications
- [ ] Templates emails
- [ ] Workflows automatisés (welcome, rappels)
- [ ] Notifications push PWA
- [ ] Historique communications

#### Module 8: Exports & Documents
- [ ] Export PDF WOD
- [ ] Export adhérents CSV
- [ ] Factures PDF
- [ ] Rapports statistiques

#### Module 9: Leads & Acquisition
- [ ] API formulaire site web
- [ ] Pipeline leads (lead → prospect → client)
- [ ] Sources tracking
- [ ] Relances automatiques

#### Module 10: PWA Adhérents
- [ ] Authentification
- [ ] Dashboard perso
- [ ] Inscription cours
- [ ] WOD du jour
- [ ] Historique performances (PRs)
- [ ] Shop (catalogue + commande)
- [ ] Notifications push

#### Module 11: Administration
- [ ] Dashboard analytics
- [ ] Gestion utilisateurs/rôles
- [ ] Configuration salle
- [ ] **Multi-tenant architecture**

### Out of Scope (v2.1+)

| Feature | Raison report | Priorité future |
|---------|---------------|-----------------|
| MCP Claude | Innovation, pas critique MVP | P1 - v2.1 |
| Paiement Stripe intégré | Complexité juridique | P1 - v2.1 |
| App native iOS/Android | PWA suffisante pour MVP | P2 - v2.2 |
| Leaderboard compétitions | Nice-to-have | P2 - v2.2 |
| Multi-langues | Focus France d'abord | P3 - v3.0 |
| API publique documentée | Pour partenaires | P2 - v2.2 |
| Marketplace templates WOD | Communauté | P3 - v3.0 |

---

## 7. Constraints

### Budget
- **Développement:** Interne (Claude + humain)
- **Infrastructure:**
  - Supabase Pro: ~$25/mois (inclut DB, Auth, Realtime, Storage)
  - Vercel Pro: ~$20/mois
  - Discord bot hosting: inclus
  - Resend (emails): ~$0-20/mois selon volume
  - Total: ~$50-65/mois

### Timeline
- **Phase 1 (Fondations):** Architecture + Auth + Multi-tenant
- **Phase 2 (Core):** CRM + Abonnements + Planning
- **Phase 3 (Séances):** Builder WOD + TV + Teams
- **Phase 4 (Intégrations):** Discord + Emails + PWA
- **Phase 5 (Polish):** Tests + Migration + Launch

### Technical
- **Stack imposé:** Next.js 14+, TypeScript, **Supabase** (PostgreSQL + Auth + Realtime + Storage)
- **Hébergement:** Vercel (Edge-ready)
- **Auth:** Supabase Auth (natif, multi-tenant ready)
- **Realtime:** Supabase Realtime (sync TV, notifications)
- **Storage:** Supabase Storage (documents, images)
- **ORM:** Supabase JS Client + éventuellement Drizzle pour les queries complexes
- **Styling:** Tailwind CSS + shadcn/ui

### Regulatory
- **RGPD:** Données personnelles, consentement, droit à l'oubli
- **CGV:** Conditions générales (si SaaS payant)
- **Données santé:** Certificats médicaux = données sensibles

---

## 8. Risks & Assumptions

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep MVP | High | High | Scope figé, backlog strict |
| Complexité multi-tenant | Medium | High | Architecture dès le départ |
| Migration données existantes | Medium | Medium | Script migration dédié, tests |
| Adoption adhérents faible | Medium | Medium | UX simple, onboarding guidé |
| Performance TV multi-écrans | Low | Medium | WebSockets, tests charge |
| Sécurité données | Low | Critical | Auth robuste, audits, RGPD |

### Assumptions

1. Les adhérents ont un smartphone et acceptent une app
2. Les coachs sont à l'aise avec une interface web
3. La connexion internet de la salle est stable
4. Discord est déjà utilisé par la communauté
5. Le volume initial (1 salle) ne posera pas de problème de scaling

---

## 9. Dependencies

### Externes
| Dependency | Purpose | Criticité |
|------------|---------|-----------|
| **Supabase** | DB + Auth + Realtime + Storage | Critical |
| Vercel | Hosting Next.js | Critical |
| Discord API | Bot intégration | High |
| Resend | Emails transactionnels | High |

### Internes
| Dependency | Description |
|------------|-------------|
| Données existantes | Export Excel adhérents actuels |
| Liste des formules | Catalogue abonnements à configurer |
| Planning type | Structure cours semaine type |
| Exercices | Base d'exercices pour le builder |

---

## 10. Open Questions

### Business
- [ ] Quel pricing SaaS ? (par adhérent ? forfait ? freemium ?)
- [ ] Nom de domaine dédié pour le SaaS ?
- [ ] CGV/CGU à rédiger avant commercialisation ?

### Technique
- [x] ~~NextAuth.js vs Clerk~~ → **Supabase Auth** (décidé)
- [x] ~~WebSockets~~ → **Supabase Realtime** (décidé)
- [ ] Drizzle en complément de Supabase JS pour queries complexes ?
- [ ] PWA push notifications : Supabase + web-push natif ?

### Données
- [ ] Format exact des données à migrer ?
- [ ] Liste complète des exercices pour la bibliothèque ?
- [ ] Templates de WOD existants à importer ?

### Design
- [ ] Charte graphique Skàli existante à respecter ?
- [ ] Maquettes Figma existantes ?

---

## 11. Next Steps

### Immédiat (cette session)
- [ ] **Validation ce brief** par l'humain
- [ ] Créer le PRD détaillé (requirements)
- [ ] Définir l'architecture technique

### Court terme
- [ ] Répondre aux Open Questions
- [ ] Créer les user stories par epic
- [ ] Setup projet Next.js + Neon

### Moyen terme
- [ ] Développement itératif par modules
- [ ] Tests avec La Skàli (beta)
- [ ] Ajustements et polish
- [ ] Lancement MVP

---

## 12. Appendix

### Glossaire
| Terme | Définition |
|-------|------------|
| WOD | Workout Of the Day - Séance du jour |
| Box | Salle de CrossFit |
| PR | Personal Record - Record personnel |
| AMRAP | As Many Rounds As Possible |
| EMOM | Every Minute On the Minute |
| For Time | Terminer le plus vite possible |
| RX | Prescribed - Charge/mouvement standard |
| Scaled | Adapté au niveau |

### Références
- [CrossFit Affiliate Map](https://map.crossfit.com/) - 800+ boxes FR
- [Wodify](https://www.wodify.com/) - Concurrent principal
- [SugarWOD](https://www.sugarwod.com/) - Concurrent WOD
- [Deciplus](https://www.deciplus.pro/) - Concurrent généraliste

### Inspirations UI
- [Linear](https://linear.app/) - Dashboard clean
- [Notion](https://notion.so/) - Flexibilité
- [Cal.com](https://cal.com/) - Calendrier moderne

---

**⏸️ CHECKPOINT:** Validation de ce brief requise avant de passer au PRD.

**@ANALYST → Humain:** Ce brief te convient ? Des éléments à ajouter/modifier/supprimer avant que @PM John prenne le relais pour le PRD ?
