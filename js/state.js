export const S = {

    gameMode: 'ai', // 'ai' (par défault) ou 'pvp'

    grid: [],   // Tableau 2D de cases, chaque case est soit null (vide) soit une unité (objet avec {type, player, hp, force, uid})
    uid: 0,                    // automatiquement incrémenté à chaque création d'unité, sert à leur attribuer un identifiant unique.

    phase: 'dice',             // Indique ce que le joueur doit faire ou ce qui se passe actuellement, parmi:
                                //   'dice'     → attente du lancer de dés (bouton "Lancer les dés" affiché)
                                //   'rolling'  → dés en train de rouler (bouton "Lancer les dés" caché, ignore les clics)
                                //   'p_select' → joueur doit cliquer une unité à activer (affiche les unités sélectionnables)
                                //   'p_dest'   → joueur doit cliquer une case de destination pour l'unité sélectionnée (affiche les cases atteignables)
                                //   'ai_turn'  → l'ordinateur réfléchit à son coup (ignore les clics)
                                //   'over'     → partie terminée (ignore les clics, affiche le gagnant)

    currentP: 1,              // Le joueur actif (1 ou 2)
    turnN: 1,                 // Compteur global de tours (s'incrémente à chaque changement de joueur actif)

    selUnit: null,             // Unité sélectionnée (objet avec {type, player, hp, force, uid}), ou null si aucune sélection
    reachable: [],             // Tableau de cases atteignables par l'unité sélectionnée, mis à jour à chaque sélection ou déplacement d'unité

    pendingBuff: { force:0, hp:0 }, // Buff temporaire à appliquer à l'unité choisie (résultats des dés), réinitialisé après application
    pendingNerf: 0,                 // Nerf temporaire à appliquer à l'unité choisie (résultat du dé "nerf"), réinitialisé après application
    buffApplied: false,             // Indique si le buff/nerf a déjà été appliqué à l'unité sélectionnée, pour éviter de les appliquer plusieurs fois

    stats: { turns:0, c1:0, c2:0, bat:0 },

    setupPlayer: 1,
    setupPlacements: { 1:[], 2:[] },
    selectedTrayType: null, // type d'unité sélectionné pour le placement initial (S, C ou T), ou null si aucune sélection
    trayRemaining: { 1:{S:2,C:2,T:1}, 2:{S:2,C:2,T:1} },

    
    aiMs: 700, // Durée de réflexion de l'IA en millisecondes
}


export function nextUid() { return S.uid++; } // Génère un nouvel identifiant unique pour une unité, en incrémentant le compteur global S.uid

export function stat(k)   { S.stats[k]++; } // Incrémente le compteur de la statistique k (par exemple "turns", "c1", "c2", "bat") dans l'objet S.stats, utilisé pour suivre les statistiques de la partie