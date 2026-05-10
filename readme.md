# Documentation Détaillée — Conquête des Territoires

## 1. Vue d'ensemble

Ce dépôt contient un jeu de stratégie au tour par tour basé sur un plateau, implémenté en tant qu'application web monopage. Le jeu est intitulé "Conquête des Territoires" et oppose deux joueurs (ou un joueur contre une IA) sur un plateau de 8x8 cases. L'objectif est de contrôler au moins 33 cases (majorité sur 64) ou d'éliminer toutes les unités ennemies.

- **Point d'entrée** : index.html
- **Styles** : index.css (et autres fichiers CSS pour les composants)
- **JavaScript** : main.js (modules ES6)
- **Technologies** : HTML5, CSS3, JavaScript (ES6 modules), pas de dépendances externes.
- **Écrans principaux** :
  - Menu : `#screen-menu`
  - Règles : `#screen-rules`
  - Déploiement : `#screen-setup`
  - Jeu : `#screen-game`
- **Superpositions** :
  - Lancer d'initiative : `#init-overlay`
  - Fin de partie : `#win-modal`

Le jeu est entièrement fonctionnel et peut être joué directement en ouvrant index.html dans un navigateur moderne.

## 2. Architecture et Structure des Modules

Le code est organisé en modules JavaScript ES6, chacun responsable d'une fonctionnalité spécifique. Le fichier main.js importe tous les modules dans l'ordre de dépendance.

### Graphique des dépendances :
- constants.js et utils.js : Modules de base sans dépendances.
- state.js : État global du jeu.
- models.js : Classes de données (Unit, Cell).
- movement.js : Logique de mouvement et portée.
- combat.js : Résolution des combats.
- ui.js : Mise à jour de l'interface utilisateur.
- game.js : Boucle principale du jeu.
- setup.js : Phase de déploiement initial.
- initiative.js : Lancer d'initiative.
- ai.js : Logique de l'IA.
- navigation.js : Navigation entre écrans (expose des fonctions globales pour les événements HTML).

### Fichiers CSS :
- `base.css` : Styles de base (variables CSS, reset).
- `game_board.css` : Plateau de jeu.
- `game_controls.css` : Contrôles et boutons.
- `game_layout.css` : Mise en page générale.
- `index.css` : Styles principaux.
- `menu.css` : Menu et écrans d'accueil.
- `modals.css` : Modales (initiative, victoire).
- `rules.css` : Écran des règles.
- `setup.css` : Écran de déploiement.
- `shared.css` : Styles partagés.

## 3. Modèle de Données et État d'Exécution

### État Global (state.js)
L'objet `S` contient tout l'état mutable du jeu :
- `gameMode` : `'ai'` (contre IA) ou `'pvp'` (joueur contre joueur).
- `grid` : Tableau 2D 8x8 d'objets `Cell`.
- `units` : Liste des unités vivantes (`Unit`).
- `phase` : Phase actuelle (`'dice'`, `'rolling'`, `'p_select'`, `'p_dest'`, `'ai_turn'`, `'over'`).
- `currentP` : Joueur actif (1 ou 2).
- `turnN` : Numéro du tour.
- `selUnit` : Unité sélectionnée.
- `reachable` : Cases atteignables pour l'unité sélectionnée.
- `pendingBuff` : Bonus temporaire (force ou HP).
- `pendingNerf` : Pénalité temporaire.
- `buffApplied` : Indicateur si le bonus a été appliqué.
- `stats` : Statistiques (tours, captures, combats).
- `setupPlayer`, `setupPlacements`, `trayRemaining` : État de la phase de déploiement.
- `aiMs` : Délai de réflexion de l'IA (700ms).

### Classe Unit (models.js)
Représente une unité sur le plateau.
- Propriétés : `type` ('S', 'C', 'T'), `owner` (1 ou 2), `id` (unique), `row`/`col`, `force`, `maxHp`, `hp`, `buffForce`, `nerfForce`, `usedThisTurn`.
- Getters : `totalForce` (force effective), `hpPct` (pourcentage de vie), `hpClass` (couleur de la barre de vie).
- Méthodes : `resetTurn()` (réinitialise les flags par tour).

### Classe Cell (models.js)
Représente une case du plateau.
- Propriétés : `row`/`col`, `owner` (0, 1 ou 2), `units` (liste d'unités), `special` (null, 'bonus', 'trap', 'spawn', 'counter'), `revealed`, `spawnUsed`.
- Méthodes : `add(u)`, `rem(u)`, `hasEnemy(p)`, `friendly(p)`, `enemies(p)`.

## 4. Règles du Jeu et Mécaniques

### Constantes (constants.js)
- `GS = 8` : Taille du plateau.
- `WIN = 33` : Cases à contrôler pour gagner.
- `UNIT_STATS` : Statistiques des unités.
  - Soldat ('S') : Force 3, Vie 3, Mouvement 1.
  - Cavalier ('C') : Force 2, Vie 5, Mouvement 2.
  - Tank ('T') : Force 5, Vie 8, Mouvement 1.
- `ROSTER = ['S','S','C','C','T']` : Composition de l'armée (2 Soldats, 2 Cavaliers, 1 Tank).
- `SPECIAL_SQUARES` : Positions des cases spéciales cachées.

### Phase de Déploiement (setup.js)
- Chaque joueur place ses 5 unités dans ses 2 rangées de départ.
- L'IA place aléatoirement.
- Interface : Plateau avec zones colorées, panneau de sélection des unités restantes.

### Lancer d'Initiative (initiative.js)
- Dés lancés simultanément pour décider qui commence.
- Le plus haut gagne.

### Tours de Jeu (game.js)
- Alternance des tours.
- Début de tour : Lancer de dés pour bonus/malus.
  - Dé propre : 1-2 → +1 Force, 3-4 → +1 HP, 5-6 → +2 Force.
  - Si dé adverse > dé propre, malus sur les attaques (-différence).
- Sélection d'une unité, puis action : déplacer ou attaquer.
- Fin de tour : Réinitialisation des buffs, vérification de victoire.

### Mouvement (movement.js)
- Soldat : 8 directions adjacentes (mouvement), attaque adjacente ou verticale jusqu'à 3 cases.
- Cavalier : Orthogonal 1-2 cases, diagonal 1 case.
- Tank : Orthogonal 1 case (mouvement), orthogonal n'importe quelle distance (attaque).

### Combat (combat.js)
- Score Attaquant = Force effective + dé (1-6) + bonus case.
- Score Défenseur = Force + dé (1-6) + bonus case.
- Dégâts = max(1, scoreA - scoreD), plafonné à ceil(HP max / 2) - 1.
- Attaque à distance : dégâts normaux, pas de capture de case.

### Cases Spéciales
- Bonus (★) : +1 ATK/DEF.
- Piège (⚠) : -1 HP à l'entrée.
- Portail Allié (✦) : Copie l'unité à la base alliée.
- Portail Ennemi (☠) : Copie l'unité à la base ennemie.

### Victoire
- Contrôler 33+ cases ou éliminer toutes les unités ennemies.

### IA (ai.js)
- Placement aléatoire.
- Sélection d'unité basée sur score (priorité attaques gagnables, captures).
- Actions : Attaque si possible, sinon déplacement pour capturer/avancer.

## 5. Interface Utilisateur (ui.js)
- `renderGrid()` : Affiche le plateau avec unités, cases spéciales, sélection, portées.
- `renderPanels()` : Compteurs de territoires, listes d'unités, statistiques.
- `addLog()` : Journal des événements.
- `istrip()` : Messages d'information temporaires.

## 6. Navigation (navigation.js)
- Fonctions pour basculer entre écrans.
- Exposition de fonctions globales pour les `onclick` HTML.

## 7. Utilitaires (utils.js)
- `r6()` : Lancer de dé 1-6.
- `sq(r, c)` : Notation algébrique (A1, B2, etc.).

## 8. Installation et Utilisation
- Ouvrir index.html dans un navigateur web moderne (Chrome, Firefox, etc.).
- Pas de serveur requis, fonctionne localement.
- Pour développement : Éditer les fichiers JS/CSS, recharger la page.

## 9. Licence
MIT License - Copyright (c) 2026 Mohammed Aziz Hammemi. Voir le fichier licence pour les détails.