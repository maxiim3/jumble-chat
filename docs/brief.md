# Project Brief: Jumble Chat

## Executive Summary

**Jumble Chat** est une application de chat temps réel minimaliste et éphémère. Pas de compte, pas de connexion — chaque visiteur rejoint instantanément la conversation avec une identité temporaire. Seuls les 50 derniers messages sont conservés, créant un espace de discussion léger et sans historique permanent.

**Objectif principal :** Projet éducatif pour maîtriser Angular et les WebSockets en contexte pratique.

---

## Problem Statement

**Contexte personnel :**
En tant que développeur Vue/React, Angular reste un angle mort dans mes compétences frontend. Les WebSockets, bien que conceptuellement compris, n'ont jamais été mis en pratique.

**Le problème :**
- Apprendre Angular via des tutoriels isolés manque de contexte applicatif réel
- Les WebSockets nécessitent un projet concret pour comprendre la gestion des connexions, la synchronisation d'état, et les edge cases (déconnexions, reconnexions)

**Pourquoi ce projet :**
Un chat temps réel est le cas d'usage idéal — suffisamment simple pour ne pas se perdre dans la logique métier, suffisamment riche pour toucher aux vrais défis : communication bidirectionnelle, état partagé, et réactivité UI.

---

## Proposed Solution

**Concept :**
Une Single Page Application Angular connectée via WebSocket à un serveur léger. L'interface affiche un fil de messages en temps réel, avec un champ de saisie pour participer.

**Fonctionnement :**
- À l'ouverture, le client établit une connexion WebSocket et reçoit les 50 derniers messages
- Chaque nouveau message est broadcasté instantanément à tous les clients connectés
- Une identité temporaire (pseudo généré ou couleur) distingue les participants
- Aucune donnée persistante côté client — fermer l'onglet = nouvelle session

**Stack :**
- **Frontend :** Angular (standalone components, signals)
- **Backend :** Bun.js avec WebSocket natif
- **Persistance :** In-memory (50 messages max)

---

## MVP Scope

### Core Features (Must Have)
- Connexion WebSocket automatique à l'ouverture
- Réception des 50 derniers messages au connect
- Envoi de message (broadcast à tous les clients)
- Réception temps réel des messages des autres
- Identité temporaire par session

### Out of Scope (MVP)
- Authentification / comptes utilisateurs
- Historique au-delà de 50 messages
- Messages privés / rooms
- Indicateurs de présence ("X personnes connectées")
- Notifications
- Persistance côté client (localStorage)

### MVP Success Criteria
Deux onglets de navigateur peuvent échanger des messages en temps réel.

---

## Technical Considerations

### Frontend (Angular)
- Angular 19+ avec standalone components
- Signals pour la gestion d'état local
- Un service dédié pour la connexion WebSocket
- Reactive patterns pour le flux de messages

### Backend (Bun.js)
- Serveur WebSocket natif Bun (`Bun.serve` avec websocket handler)
- Stockage in-memory : array circulaire de 50 messages
- Pas de framework HTTP nécessaire (WebSocket only, ou minimal)

### Points d'apprentissage clés
- Cycle de vie WebSocket : open, message, close, error
- Gestion des reconnexions côté client
- Synchronisation de l'état initial (hydratation des 50 messages)
- Cleanup des connexions côté serveur

---

## Constraints & Assumptions

### Contraintes
- **Temps :** Projet personnel, pas de deadline
- **Budget :** Aucun — tout en local, outils gratuits
- **Ressources :** Solo developer
- **Technique :** Pas de base de données — in-memory uniquement

### Hypothèses
- Bun.js est installé ou facilement installable
- Environnement Angular CLI fonctionnel
- Usage local uniquement (pas de déploiement prévu initialement)
- Nombre de connexions simultanées : faible (tests perso)

---

## Risks & Open Questions

### Risques potentiels
- **Courbe Angular :** Concepts spécifiques (DI, RxJS, zones) peuvent ralentir si trop différents de Vue/React
- **WebSocket debugging :** Moins intuitif que REST — outils de dev différents
- **Reconnexion :** Gérer les déconnexions proprement demande de la réflexion

### Questions ouvertes
- Quel format pour les messages WebSocket ? (JSON simple ?)
- Comment générer l'identité temporaire ? (UUID côté serveur ? pseudo aléatoire ?)
- Faut-il typer les messages (TypeScript partagé frontend/backend) ?

### À explorer en faisant
- RxJS vs Signals pour le flux de messages — ou les deux ensemble ?
- Comportement si le serveur redémarre (perte des 50 messages OK ?)

---

## Next Steps

1. Setup projet Angular (`ng new` ou existant)
2. Setup serveur Bun avec WebSocket minimal
3. Établir une connexion WebSocket basique entre les deux
4. Envoyer/recevoir un premier message "hello world"
5. Itérer : liste de messages, broadcast, identité, persistance 50 msgs
