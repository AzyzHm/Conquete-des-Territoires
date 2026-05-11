export const GS  = 8; // 8*8 plateau
export const WIN = 33; // 33 cases pour gagner

export const UNIT_STATS = { // caractéristiques de chaque type d'unité
  S: { force:3, maxHp:3, movement:1, name:'Soldat'   },
  C: { force:2, maxHp:5, movement:2, name:'Cavalier' },
  T: { force:5, maxHp:8, movement:1, name:'Tank'     },
};

export const ROSTER = ['S','S','C','C','T'];


// génère aléatoirement les cases spéciales (bonus, piège, spawn, contre) sur le plateau
function randomSpecialSquares() {
  const types = ['bonus', 'bonus', 'trap', 'trap', 'spawn', 'counter'];
  const cells = [];

  // construire une liste de toutes les cases possibles (hors 2 premières lignes) et les mélanger
  const pool = [];
  for (let r = 2; r <= 5; r++)
    for (let c = 0; c < 8; c++)
      pool.push({ r, c });

  // Utiliser l'algorithme de Fisher-Yates pour mélanger le pool de cases
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // prendre les 6 premières cases du pool mélangé et les associer aux types de cases spéciales
  for (let i = 0; i < types.length; i++)
    cells.push({ r: pool[i].r, c: pool[i].c, t: types[i] });

  return cells;
}

export const SPECIAL_SQUARES = randomSpecialSquares();