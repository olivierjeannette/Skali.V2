# PRD - Skàli Prog v2.0

> **Product Requirements Document**
> **Version:** 2.0
> **Date:** 2026-01-30
> **Auteur:** @PM John
> **Status:** Draft - En attente validation
> **Basé sur:** [PROJECT-BRIEF.md](./PROJECT-BRIEF.md)

---

## 1. Overview

Skàli Prog v2.0 est une refonte complète de l'application de gestion pour salles de sport (CrossFit/Functional Fitness). L'objectif est de créer une solution tout-en-un, moderne et prête pour une commercialisation SaaS.

**Stack technique:** Next.js 14+ / TypeScript / Supabase / Vercel

**Utilisateurs cibles:**
- Gérants de salle (Owner)
- Coachs
- Staff administratif
- Adhérents (via PWA)

---

## 2. Functional Requirements (FR)

### Epic 1: Authentication & Multi-Tenant

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-1.1 | Inscription utilisateur avec email/password | P0 | Given un email valide, When l'utilisateur s'inscrit, Then un compte est créé et un email de confirmation envoyé |
| FR-1.2 | Connexion avec email/password | P0 | Given des credentials valides, When l'utilisateur se connecte, Then il accède à son dashboard |
| FR-1.3 | Connexion OAuth (Google) | P1 | Given un compte Google, When l'utilisateur clique "Continuer avec Google", Then il est authentifié |
| FR-1.4 | Reset password par email | P0 | Given un email existant, When l'utilisateur demande un reset, Then un lien sécurisé est envoyé |
| FR-1.5 | Isolation multi-tenant par organisation | P0 | Given un utilisateur connecté, When il accède aux données, Then il ne voit que les données de son organisation |
| FR-1.6 | Gestion des rôles (Owner, Admin, Coach, Member) | P0 | Given un rôle assigné, When l'utilisateur navigue, Then il ne voit que les fonctionnalités autorisées |
| FR-1.7 | Invitation de nouveaux membres staff | P0 | Given un email, When un Owner invite un coach, Then le coach reçoit un lien d'invitation |
| FR-1.8 | Création d'organisation (onboarding SaaS) | P0 | Given un nouvel utilisateur, When il s'inscrit, Then il peut créer ou rejoindre une organisation |

### Epic 2: Gestion des Adhérents (CRM)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-2.1 | Créer un adhérent (fiche complète) | P0 | Given les infos requises (nom, prénom, email, téléphone), When le staff crée l'adhérent, Then une fiche est créée avec statut "prospect" |
| FR-2.2 | Modifier un adhérent | P0 | Given une fiche existante, When le staff modifie, Then les changements sont sauvegardés avec historique |
| FR-2.3 | Rechercher/filtrer les adhérents | P0 | Given une liste d'adhérents, When le staff recherche par nom/email/statut, Then les résultats filtrés s'affichent |
| FR-2.4 | Voir le détail d'un adhérent | P0 | Given un adhérent, When le staff clique sur sa fiche, Then il voit toutes les infos, abonnements, réservations, historique |
| FR-2.5 | Gérer les statuts (prospect, actif, expiré, suspendu, archivé) | P0 | Given un adhérent, When son statut change, Then l'historique est conservé et les règles métier appliquées |
| FR-2.6 | Upload documents (certificat médical, etc.) | P1 | Given un adhérent, When le staff upload un document, Then il est stocké de façon sécurisée et visible sur la fiche |
| FR-2.7 | Alertes certificat médical expiré | P1 | Given un certificat avec date d'expiration, When la date approche (30j), Then une alerte s'affiche |
| FR-2.8 | Notes et commentaires sur adhérent | P1 | Given un adhérent, When le staff ajoute une note, Then elle est horodatée et visible dans l'historique |
| FR-2.9 | Import CSV/Excel adhérents | P1 | Given un fichier CSV valide, When le staff l'importe, Then les adhérents sont créés avec mapping des colonnes |
| FR-2.10 | Export adhérents CSV | P1 | Given une liste filtrée, When le staff exporte, Then un CSV est téléchargé |
| FR-2.11 | Fusion de doublons | P2 | Given deux fiches en doublon, When le staff fusionne, Then une seule fiche reste avec toutes les données |
| FR-2.12 | Photo de profil adhérent | P2 | Given un adhérent, When une photo est uploadée, Then elle s'affiche sur la fiche et dans les listes |

### Epic 3: Gestion des Abonnements & Ventes

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-3.1 | Configurer les formules d'abonnement | P0 | Given un Owner, When il crée une formule (nom, prix, durée, nb séances), Then elle est disponible à la vente |
| FR-3.2 | Vendre un abonnement à un adhérent | P0 | Given un adhérent et une formule, When le staff crée la vente, Then l'abonnement est actif avec dates de début/fin |
| FR-3.3 | Voir les abonnements actifs/expirés | P0 | Given un adhérent, When on consulte sa fiche, Then on voit tous ses abonnements avec statuts |
| FR-3.4 | Alertes expiration abonnement | P0 | Given un abonnement, When l'expiration approche (7j, 30j), Then une alerte s'affiche (dashboard + liste) |
| FR-3.5 | Renouveler un abonnement | P0 | Given un abonnement expiré/expirant, When le staff renouvelle, Then un nouvel abonnement est créé (continuation) |
| FR-3.6 | Suspendre/réactiver un abonnement | P1 | Given un abonnement actif, When le staff suspend (vacances, blessure), Then les jours sont gelés |
| FR-3.7 | Gérer les paiements (comptant, échelonné) | P1 | Given une vente, When le staff enregistre un paiement, Then le solde est mis à jour |
| FR-3.8 | Historique des paiements | P1 | Given un adhérent, When on consulte les paiements, Then on voit toutes les transactions |
| FR-3.9 | Appliquer un code promo | P2 | Given un code valide, When appliqué à une vente, Then la réduction est appliquée |
| FR-3.10 | Gérer les formules "carnet" (10 séances, etc.) | P1 | Given un carnet, When l'adhérent réserve un cours, Then une séance est décomptée |
| FR-3.11 | Générer une facture PDF | P2 | Given une vente, When le staff génère la facture, Then un PDF est téléchargeable |
| FR-3.12 | Dashboard ventes (CA, stats) | P1 | Given le Owner, When il consulte le dashboard, Then il voit le CA du mois, répartition formules, etc. |

### Epic 4: Planning & Réservations

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-4.1 | Configurer les types de cours | P0 | Given un Owner, When il crée un type (WOD, Haltéro, Open Gym), Then il définit couleur, durée par défaut, capacité |
| FR-4.2 | Créer un créneau de cours | P0 | Given un type de cours, When le staff crée un créneau (jour, heure, coach), Then il apparaît au planning |
| FR-4.3 | Planning semaine récurrent | P0 | Given des créneaux, When le staff définit une semaine type, Then les cours se répètent automatiquement |
| FR-4.4 | Vue calendrier jour/semaine/mois | P0 | Given le planning, When le staff navigue, Then il voit les cours avec nb inscrits/capacité |
| FR-4.5 | Réserver un adhérent à un cours | P0 | Given un cours avec places, When le staff inscrit un adhérent, Then il apparaît dans la liste |
| FR-4.6 | Annuler une réservation | P0 | Given une réservation, When annulée (staff ou adhérent), Then la place est libérée |
| FR-4.7 | Liste d'attente automatique | P1 | Given un cours complet, When un adhérent veut s'inscrire, Then il est mis en liste d'attente |
| FR-4.8 | Notification place libérée | P1 | Given une liste d'attente, When une place se libère, Then le premier est notifié |
| FR-4.9 | Limiter réservations par abonnement | P1 | Given un abonnement limité, When l'adhérent a atteint le quota, Then il ne peut plus réserver |
| FR-4.10 | Annuler un cours (pluie, coach absent) | P1 | Given un cours avec inscrits, When le staff annule, Then tous les inscrits sont notifiés |
| FR-4.11 | Délai inscription/annulation | P1 | Given des règles (ex: pas d'annulation < 2h), When l'adhérent essaie, Then il est bloqué |
| FR-4.12 | Vue "Qui vient aujourd'hui" | P0 | Given le jour courant, When le staff consulte, Then il voit tous les inscrits par créneau |
| FR-4.13 | Check-in adhérent (présence) | P1 | Given un inscrit, When le coach valide sa présence, Then c'est enregistré |
| FR-4.14 | Statistiques fréquentation | P2 | Given une période, When le Owner consulte, Then il voit taux de remplissage, heures creuses, etc. |

### Epic 5: Builder de Séances (WOD)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-5.1 | Créer une séance (WOD) | P0 | Given un coach, When il crée une séance, Then il peut ajouter titre, description, blocs |
| FR-5.2 | Blocs de séance (Warm-up, Skill, WOD, Cool-down) | P0 | Given une séance, When le coach ajoute des blocs, Then ils s'affichent dans l'ordre |
| FR-5.3 | Types de WOD (AMRAP, EMOM, For Time, Tabata, etc.) | P0 | Given un bloc WOD, When le coach choisit le type, Then le format d'affichage s'adapte |
| FR-5.4 | Bibliothèque d'exercices | P0 | Given la bibliothèque, When le coach cherche un mouvement, Then il le trouve et l'ajoute |
| FR-5.5 | Ajouter un exercice custom | P1 | Given un mouvement non existant, When le coach le crée, Then il est ajouté à la bibliothèque |
| FR-5.6 | Spécifier charges/reps/temps par exercice | P0 | Given un exercice, When le coach définit les paramètres, Then ils s'affichent correctement |
| FR-5.7 | Options RX / Scaled | P1 | Given un exercice, When le coach définit les variantes, Then elles sont affichées |
| FR-5.8 | Timer intégré à la séance | P1 | Given un WOD avec temps, When affiché, Then un timer est disponible |
| FR-5.9 | Sauvegarder comme template | P1 | Given une séance, When le coach la sauvegarde comme template, Then elle est réutilisable |
| FR-5.10 | Dupliquer une séance | P1 | Given une séance existante, When le coach la duplique, Then il peut la modifier |
| FR-5.11 | Attacher une séance à un créneau | P0 | Given une séance et un créneau, When le coach les lie, Then la séance s'affiche pour ce cours |
| FR-5.12 | Historique des séances | P1 | Given un historique, When le coach consulte, Then il voit toutes les séances passées par date |
| FR-5.13 | Rechercher dans l'historique | P2 | Given l'historique, When le coach recherche un mouvement, Then il trouve les séances le contenant |

### Epic 6: Affichage TV & Multi-Écrans

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-6.1 | Mode affichage TV (plein écran) | P0 | Given une séance, When on active le mode TV, Then elle s'affiche en grand sans UI admin |
| FR-6.2 | URL dédiée par écran | P0 | Given un écran, When il accède à son URL, Then il affiche le contenu assigné |
| FR-6.3 | Affichage automatique séance du créneau actuel | P0 | Given l'heure actuelle, When un cours est en cours, Then la séance correspondante s'affiche |
| FR-6.4 | Timer plein écran | P1 | Given un WOD avec temps, When le mode timer est activé, Then un timer géant s'affiche |
| FR-6.5 | Synchronisation multi-écrans (Realtime) | P1 | Given plusieurs TVs, When le coach change de séance, Then toutes les TVs se mettent à jour |
| FR-6.6 | Affichage équipes/tirage au sort | P1 | Given des équipes créées, When on les affiche, Then elles apparaissent sur la TV |
| FR-6.7 | Mode "En attente" entre les cours | P2 | Given pas de cours en cours, When la TV est allumée, Then un écran d'attente (logo, prochain cours) s'affiche |
| FR-6.8 | Personnalisation affichage (logo, couleurs) | P2 | Given les settings, When le Owner personnalise, Then l'affichage TV reflète la marque |
| FR-6.9 | Affichage résultats/leaderboard | P2 | Given des scores enregistrés, When le coach affiche le leaderboard, Then il apparaît sur TV |

### Epic 7: Teams & Tirage au Sort

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-7.1 | Créer des équipes manuellement | P1 | Given les inscrits d'un cours, When le coach crée des équipes, Then il répartit manuellement |
| FR-7.2 | Tirage au sort aléatoire | P1 | Given les inscrits, When le coach lance le tirage, Then des équipes équilibrées sont créées |
| FR-7.3 | Équilibrage par critère (niveau, genre) | P2 | Given des critères, When le tirage est lancé, Then les équipes sont équilibrées selon ces critères |
| FR-7.4 | Répartition postes cardio (rower, bike, ski) | P1 | Given X rameurs et Y inscrits, When le coach répartit, Then chacun a un poste assigné |
| FR-7.5 | Animation tirage au sort (effet visuel) | P2 | Given un tirage, When il est affiché sur TV, Then une animation révèle les équipes |
| FR-7.6 | Sauvegarder la répartition | P1 | Given une répartition, When sauvegardée, Then elle est consultable après le cours |

### Epic 8: Intégration Discord

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-8.1 | Configurer le bot Discord (token, channel) | P1 | Given un serveur Discord, When le Owner configure le bot, Then il se connecte |
| FR-8.2 | Publier automatiquement le WOD du jour | P1 | Given une séance attachée, When l'heure de publication arrive, Then le WOD est posté sur Discord |
| FR-8.3 | Commande /wod pour voir la séance | P2 | Given le bot connecté, When un membre tape /wod, Then la séance du jour s'affiche |
| FR-8.4 | Commande /planning pour voir les cours | P2 | Given le bot connecté, When un membre tape /planning, Then le planning du jour/semaine s'affiche |
| FR-8.5 | Notifications changements dernière minute | P1 | Given un cours annulé/modifié, When le staff l'indique, Then un message est posté sur Discord |
| FR-8.6 | Personnaliser les messages | P2 | Given les templates, When le Owner les modifie, Then les messages Discord utilisent le nouveau format |

### Epic 9: Communications & Notifications

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-9.1 | Envoyer un email à un adhérent | P1 | Given un adhérent avec email, When le staff envoie un message, Then l'email est envoyé et historisé |
| FR-9.2 | Emails transactionnels (confirmation résa, rappel) | P0 | Given une action (réservation, etc.), When elle se produit, Then l'email approprié est envoyé |
| FR-9.3 | Templates d'emails personnalisables | P1 | Given un template, When le Owner le modifie, Then les futurs emails utilisent ce template |
| FR-9.4 | Email de bienvenue automatique | P1 | Given un nouvel adhérent, When son compte est créé, Then il reçoit un email de bienvenue |
| FR-9.5 | Rappel de cours (J-1, H-2) | P1 | Given une réservation, When le rappel est dû, Then l'adhérent est notifié (email/push) |
| FR-9.6 | Notification push PWA | P1 | Given un adhérent avec la PWA, When un événement survient, Then il reçoit une notification push |
| FR-9.7 | Workflow relance abonnement expiré | P2 | Given un abonnement expiré, When X jours passent, Then une séquence d'emails est déclenchée |
| FR-9.8 | Historique des communications | P1 | Given un adhérent, When on consulte, Then on voit tous les messages envoyés |
| FR-9.9 | Envoi groupé (newsletter) | P2 | Given une sélection d'adhérents, When le staff envoie un message, Then tous le reçoivent |

### Epic 10: Exports & Documents

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-10.1 | Export PDF d'une séance | P1 | Given une séance, When le coach exporte, Then un PDF formaté est téléchargé |
| FR-10.2 | Export liste adhérents CSV | P1 | Given une liste filtrée, When export, Then CSV téléchargé avec colonnes choisies |
| FR-10.3 | Export planning semaine PDF | P2 | Given le planning, When export, Then PDF du planning téléchargeable |
| FR-10.4 | Génération facture PDF | P2 | Given une vente, When génération facture, Then PDF conforme (mentions légales, etc.) |
| FR-10.5 | Rapport fréquentation PDF | P2 | Given une période, When export rapport, Then statistiques en PDF |

### Epic 11: Leads & Acquisition

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-11.1 | API endpoint pour formulaire site web | P1 | Given le site web, When un visiteur remplit le formulaire, Then un lead est créé dans Skàli Prog |
| FR-11.2 | Liste des leads avec statuts | P1 | Given les leads, When le staff consulte, Then il voit nouveau/contacté/essai planifié/converti/perdu |
| FR-11.3 | Convertir un lead en adhérent | P1 | Given un lead qualifié, When le staff le convertit, Then une fiche adhérent est créée |
| FR-11.4 | Source du lead (tracking) | P2 | Given un formulaire, When le lead arrive, Then la source est enregistrée (Meta, Google, etc.) |
| FR-11.5 | Relance automatique leads | P2 | Given un lead non contacté depuis X jours, When le workflow s'exécute, Then une relance est envoyée |
| FR-11.6 | Dashboard leads (conversion funnel) | P2 | Given les leads, When le Owner consulte, Then il voit le funnel et taux de conversion |

### Epic 12: PWA Adhérents (Mobile)

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-12.1 | Inscription / Connexion adhérent | P0 | Given un adhérent invité, When il crée son compte, Then il accède à la PWA |
| FR-12.2 | Voir ses abonnements et statut | P0 | Given l'adhérent connecté, When il consulte son profil, Then il voit ses abonnements actifs/expirés |
| FR-12.3 | Voir le planning et s'inscrire aux cours | P0 | Given le planning, When l'adhérent sélectionne un cours, Then il peut s'y inscrire |
| FR-12.4 | Annuler une réservation | P0 | Given une réservation, When l'adhérent annule (dans les délais), Then la place est libérée |
| FR-12.5 | Voir le WOD du jour | P0 | Given un WOD publié, When l'adhérent consulte, Then il voit la séance complète |
| FR-12.6 | Historique des WODs passés | P1 | Given l'historique, When l'adhérent consulte, Then il voit les séances passées |
| FR-12.7 | Enregistrer ses performances (scores, temps, PRs) | P1 | Given un WOD, When l'adhérent enregistre son score, Then il est sauvegardé |
| FR-12.8 | Voir son historique de performances | P1 | Given les performances, When l'adhérent consulte, Then il voit son historique et progression |
| FR-12.9 | Voir ses PRs (Personal Records) | P1 | Given les performances, When l'adhérent consulte ses PRs, Then il voit ses records par mouvement |
| FR-12.10 | Recevoir des notifications push | P1 | Given l'adhérent avec notifications activées, When un événement survient, Then il reçoit une notif |
| FR-12.11 | Consulter le shop | P2 | Given le shop configuré, When l'adhérent consulte, Then il voit les produits disponibles |
| FR-12.12 | Commander dans le shop | P2 | Given un produit, When l'adhérent commande, Then la commande est enregistrée |
| FR-12.13 | Modifier ses infos personnelles | P1 | Given son profil, When l'adhérent modifie, Then les infos sont mises à jour |
| FR-12.14 | Installation PWA (Add to Home Screen) | P0 | Given la PWA, When l'adhérent visite, Then il peut l'installer sur son téléphone |

### Epic 13: Administration & Settings

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-13.1 | Dashboard principal (KPIs) | P0 | Given le Owner/Admin, When il se connecte, Then il voit adhérents actifs, CA, cours du jour, alertes |
| FR-13.2 | Gérer les utilisateurs staff | P0 | Given le Owner, When il gère le staff, Then il peut inviter/modifier/supprimer des utilisateurs |
| FR-13.3 | Gérer les rôles et permissions | P0 | Given les rôles, When le Owner configure, Then les permissions sont appliquées |
| FR-13.4 | Configurer la salle (nom, horaires, capacités) | P0 | Given les settings, When le Owner configure, Then les infos sont utilisées partout |
| FR-13.5 | Personnaliser le branding (logo, couleurs) | P2 | Given les settings, When le Owner configure, Then l'app reflète la marque |
| FR-13.6 | Configurer les emails (expéditeur, templates) | P1 | Given les settings email, When le Owner configure, Then les emails sont envoyés avec ces paramètres |
| FR-13.7 | Configurer le Discord | P1 | Given les settings Discord, When le Owner configure, Then le bot utilise ces paramètres |
| FR-13.8 | Logs d'activité (audit trail) | P2 | Given les logs, When le Owner consulte, Then il voit qui a fait quoi et quand |
| FR-13.9 | Export RGPD données adhérent | P1 | Given un adhérent qui demande ses données, When export, Then toutes ses données sont fournies |
| FR-13.10 | Suppression RGPD (droit à l'oubli) | P1 | Given un adhérent qui demande suppression, When exécuté, Then toutes ses données sont supprimées |

---

## 3. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Target | Priority |
|----|----------|-------------|--------|----------|
| NFR-01 | Performance | Temps de chargement pages | < 2s (LCP) | P0 |
| NFR-02 | Performance | Temps de réponse API | < 500ms (p95) | P0 |
| NFR-03 | Performance | Sync Realtime TV | < 1s de latence | P1 |
| NFR-04 | Scalabilité | Adhérents par organisation | 1000+ | P1 |
| NFR-05 | Scalabilité | Organisations simultanées (SaaS) | 100+ | P2 |
| NFR-06 | Disponibilité | Uptime | 99.9% | P0 |
| NFR-07 | Sécurité | Authentification | Sessions sécurisées, HTTPS | P0 |
| NFR-08 | Sécurité | Isolation données | RLS Supabase, multi-tenant strict | P0 |
| NFR-09 | Sécurité | Données sensibles | Chiffrement at-rest et in-transit | P0 |
| NFR-10 | Sécurité | Protection OWASP Top 10 | Toutes vulnérabilités couvertes | P0 |
| NFR-11 | UX | Mobile-first PWA | Score Lighthouse > 90 | P1 |
| NFR-12 | UX | Accessibilité | WCAG 2.1 AA | P2 |
| NFR-13 | UX | Offline capability | Consultation WOD hors-ligne | P2 |
| NFR-14 | Maintenance | Tests automatisés | Coverage > 70% | P1 |
| NFR-15 | Maintenance | CI/CD | Deploy auto sur merge main | P0 |
| NFR-16 | Compliance | RGPD | Export et suppression données | P0 |
| NFR-17 | i18n | Langue | Français (English v3.0) | P0 |

---

## 4. Epics Summary

| # | Epic | Description | Stories | Priority |
|---|------|-------------|---------|----------|
| E1 | Auth & Multi-Tenant | Authentification, rôles, isolation | 8 | P0 |
| E2 | CRM Adhérents | Gestion complète des membres | 12 | P0 |
| E3 | Abonnements & Ventes | Formules, paiements, renouvellements | 12 | P0 |
| E4 | Planning & Réservations | Calendrier, cours, inscriptions | 14 | P0 |
| E5 | Builder Séances | Création WOD, bibliothèque | 13 | P0 |
| E6 | Affichage TV | Mode TV, multi-écrans, realtime | 9 | P1 |
| E7 | Teams & Tirage | Équipes, répartition | 6 | P1 |
| E8 | Discord | Bot, WOD auto, commandes | 6 | P1 |
| E9 | Communications | Emails, push, workflows | 9 | P1 |
| E10 | Exports | PDFs, CSVs, rapports | 5 | P2 |
| E11 | Leads | Acquisition, pipeline, conversion | 6 | P1 |
| E12 | PWA Adhérents | App mobile complète | 14 | P0 |
| E13 | Administration | Dashboard, settings, RGPD | 10 | P0 |

**Total:** 124 requirements fonctionnels

---

## 5. User Stories (Haut niveau)

### Epic 1: Auth & Multi-Tenant
| ID | Story | Priority |
|----|-------|----------|
| US-1.1 | En tant que nouveau gérant, je veux créer mon compte et ma salle pour commencer à utiliser l'app | P0 |
| US-1.2 | En tant que Owner, je veux inviter mes coachs pour qu'ils puissent gérer les cours | P0 |
| US-1.3 | En tant que coach, je veux me connecter avec mon email pour accéder à mon espace | P0 |
| US-1.4 | En tant qu'utilisateur, je veux réinitialiser mon mot de passe si je l'oublie | P0 |

### Epic 2: CRM Adhérents
| ID | Story | Priority |
|----|-------|----------|
| US-2.1 | En tant que staff, je veux créer une fiche adhérent pour enregistrer un nouveau membre | P0 |
| US-2.2 | En tant que staff, je veux rechercher un adhérent pour retrouver rapidement sa fiche | P0 |
| US-2.3 | En tant que Owner, je veux importer mes adhérents existants depuis Excel | P1 |
| US-2.4 | En tant que staff, je veux voir les alertes certificats médicaux expirés | P1 |

### Epic 3: Abonnements
| ID | Story | Priority |
|----|-------|----------|
| US-3.1 | En tant que Owner, je veux configurer mes formules d'abonnement | P0 |
| US-3.2 | En tant que staff, je veux vendre un abonnement à un adhérent | P0 |
| US-3.3 | En tant que Owner, je veux voir les abonnements qui expirent bientôt | P0 |
| US-3.4 | En tant que staff, je veux renouveler un abonnement expiré | P0 |

### Epic 4: Planning
| ID | Story | Priority |
|----|-------|----------|
| US-4.1 | En tant que Owner, je veux créer ma semaine type de cours | P0 |
| US-4.2 | En tant que staff, je veux voir qui est inscrit à un cours | P0 |
| US-4.3 | En tant que staff, je veux inscrire un adhérent à un cours | P0 |
| US-4.4 | En tant qu'adhérent, je veux voir les places disponibles | P0 |

### Epic 5: Séances
| ID | Story | Priority |
|----|-------|----------|
| US-5.1 | En tant que coach, je veux créer la séance du jour avec blocs | P0 |
| US-5.2 | En tant que coach, je veux utiliser ma bibliothèque d'exercices | P0 |
| US-5.3 | En tant que coach, je veux sauvegarder une séance comme template | P1 |
| US-5.4 | En tant que coach, je veux attacher la séance à un créneau du planning | P0 |

### Epic 6: TV
| ID | Story | Priority |
|----|-------|----------|
| US-6.1 | En tant que coach, je veux afficher la séance sur la TV de la salle | P0 |
| US-6.2 | En tant que coach, je veux que la TV affiche automatiquement le bon WOD | P1 |
| US-6.3 | En tant que coach, je veux afficher le timer en grand | P1 |

### Epic 7: Teams
| ID | Story | Priority |
|----|-------|----------|
| US-7.1 | En tant que coach, je veux créer des équipes pour la séance | P1 |
| US-7.2 | En tant que coach, je veux faire un tirage au sort équilibré | P1 |
| US-7.3 | En tant que coach, je veux répartir les postes cardio | P1 |

### Epic 8: Discord
| ID | Story | Priority |
|----|-------|----------|
| US-8.1 | En tant que Owner, je veux connecter le bot Discord de ma salle | P1 |
| US-8.2 | En tant que Owner, je veux que le WOD soit posté automatiquement | P1 |
| US-8.3 | En tant que membre, je veux voir le WOD avec /wod sur Discord | P2 |

### Epic 9: Communications
| ID | Story | Priority |
|----|-------|----------|
| US-9.1 | En tant que staff, je veux envoyer un email à un adhérent | P1 |
| US-9.2 | En tant qu'adhérent, je veux recevoir un rappel avant mon cours | P1 |
| US-9.3 | En tant que Owner, je veux personnaliser les templates d'emails | P1 |

### Epic 10: Exports
| ID | Story | Priority |
|----|-------|----------|
| US-10.1 | En tant que coach, je veux exporter le WOD en PDF | P1 |
| US-10.2 | En tant que Owner, je veux exporter ma liste d'adhérents | P1 |

### Epic 11: Leads
| ID | Story | Priority |
|----|-------|----------|
| US-11.1 | En tant que Owner, je veux que les demandes du site arrivent dans l'app | P1 |
| US-11.2 | En tant que staff, je veux suivre les leads et leur statut | P1 |
| US-11.3 | En tant que staff, je veux convertir un lead en adhérent | P1 |

### Epic 12: PWA
| ID | Story | Priority |
|----|-------|----------|
| US-12.1 | En tant qu'adhérent, je veux m'inscrire aux cours depuis mon téléphone | P0 |
| US-12.2 | En tant qu'adhérent, je veux voir le WOD du jour | P0 |
| US-12.3 | En tant qu'adhérent, je veux enregistrer mon score | P1 |
| US-12.4 | En tant qu'adhérent, je veux voir mes PRs | P1 |

### Epic 13: Admin
| ID | Story | Priority |
|----|-------|----------|
| US-13.1 | En tant que Owner, je veux voir un dashboard avec mes KPIs | P0 |
| US-13.2 | En tant que Owner, je veux configurer les infos de ma salle | P0 |
| US-13.3 | En tant qu'adhérent, je veux pouvoir demander l'export de mes données (RGPD) | P1 |

---

## 6. MVP Definition

### Phase 1 - Fondations (Sprint 1-2)
**Must Have:**
- E1: Auth complète + Multi-tenant
- E13: Dashboard de base + Settings salle
- Setup projet Next.js + Supabase + CI/CD

### Phase 2 - Core Business (Sprint 3-5)
**Must Have:**
- E2: CRM Adhérents (CRUD complet)
- E3: Abonnements & Ventes (formules, vente, statuts)
- E4: Planning & Réservations (calendrier, inscriptions)

### Phase 3 - Séances (Sprint 6-7)
**Must Have:**
- E5: Builder WOD complet
- E6: Affichage TV (mode base)
- E7: Teams (création manuelle + tirage)

### Phase 4 - Engagement (Sprint 8-9)
**Must Have:**
- E12: PWA Adhérents (inscriptions, WOD, scores)
- E9: Communications (emails transactionnels, rappels)
- E8: Discord (bot + WOD auto)

### Phase 5 - Growth (Sprint 10+)
**Should Have:**
- E11: Leads & Acquisition
- E10: Exports (PDFs, CSVs)
- Améliorations TV (multi-écrans, animations)
- Shop adhérents

### Excluded from MVP v2.0
- MCP Claude (v2.1)
- Stripe intégré (v2.1)
- App native (v2.2)
- Multi-langues (v3.0)

---

## 7. Open Questions

### Résolus
- [x] Stack technique → Next.js 14+ / TypeScript / Supabase
- [x] Auth → Supabase Auth
- [x] Realtime → Supabase Realtime
- [x] Mobile → PWA

### En attente
- [ ] Pricing SaaS (par adhérent ? forfait mensuel ?)
- [ ] Intégration paiement (Stripe Connect pour le SaaS ?)
- [ ] Bibliothèque exercices initiale (liste à fournir ?)
- [ ] Templates WOD existants à importer ?
- [ ] Charte graphique Skàli ?

---

## 8. Appendix

### Glossaire métier
(cf. PROJECT-BRIEF.md)

### Diagramme des entités principales

```
Organization (Salle)
├── Users (Staff: Owner, Admin, Coach)
├── Members (Adhérents)
│   ├── Subscriptions (Abonnements)
│   ├── Reservations (Inscriptions cours)
│   ├── Scores (Performances)
│   └── Documents (Certificats, etc.)
├── Plans (Formules d'abonnement)
├── ClassTypes (Types de cours)
├── Classes (Créneaux de cours)
│   ├── Reservations
│   └── Workout (Séance attachée)
├── Workouts (Séances/WODs)
│   ├── Blocks (Warm-up, Skill, WOD, etc.)
│   └── Exercises
├── Exercises (Bibliothèque mouvements)
├── Leads (Prospects site web)
├── Communications (Historique messages)
└── Settings (Configuration salle)
```

### Matrice RACI simplifiée

| Tâche | Owner | Admin | Coach | Adhérent |
|-------|-------|-------|-------|----------|
| Config salle | R/A | C | - | - |
| Gérer staff | R/A | - | - | - |
| Gérer adhérents | A | R | R | - |
| Vendre abonnement | A | R | R | - |
| Créer planning | A | R | R | - |
| Créer séances | A | C | R | - |
| S'inscrire cours | - | - | - | R |
| Voir WOD | I | I | R | R |

R = Responsible, A = Accountable, C = Consulted, I = Informed

---

**⏸️ CHECKPOINT:** Validation de ce PRD requise avant de passer à l'Architecture.

**@PM → Humain:** Ce PRD te convient ? On a 124 requirements fonctionnels répartis en 13 Epics. C'est ambitieux mais structuré. Tu valides avant que @ARCH Alex prenne le relais pour l'architecture technique ?
