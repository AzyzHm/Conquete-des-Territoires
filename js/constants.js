export const GS  = 8; // 8*8 plateau
export const WIN = 33; // 33 cases pour gagner

export const UNIT_STATS = { // caractéristiques de chaque type d'unité
  S: { force:3, maxHp:3, movement:1, name:'Soldat'   },
  C: { force:2, maxHp:5, movement:2, name:'Cavalier' },
  T: { force:5, maxHp:8, movement:1, name:'Tank'     },
};

export const ROSTER = ['S','S','C','C','T'];

export const SPECIAL_SQUARES = [ // les cases spéciales du plateau
  { r:2, c:2, t:'bonus'   },
  { r:2, c:5, t:'bonus'   },
  { r:3, c:0, t:'trap'    },
  { r:4, c:7, t:'trap'    },
  { r:3, c:4, t:'spawn'   },
  { r:5, c:3, t:'counter' },
];