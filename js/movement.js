import { GS } from './constants.js';
import { S }  from './state.js';


export function inBounds(r, c) { return r >= 0 && r < GS && c >= 0 && c < GS; }

// retourne les 4 cases orthogonales adjacentes (up, down, left, right) dans les limites du plateau (Tank)
export function adj4(r, c) {
  return [[0,1],[0,-1],[1,0],[-1,0]]
    .map(([dr,dc]) => ({ r:r+dr, c:c+dc }))
    .filter(p => inBounds(p.r, p.c));
}

// retourne les 8 cases adjacentes (y compris diagonales) dans les limites du plateau (Soldat)
export function adj8(r, c) {
  const a = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      if ((dr||dc) && inBounds(r+dr, c+dc)) a.push({ r:r+dr, c:c+dc });
  return a;
}

// retourne un tableau de cases atteignables par l'unité `u` selon les règles de déplacement ou d'attaque de son type
export function getReachable(u, mode) {
  const g   = S.grid;
  const res = [];
  const seen = new Set();

  const add = (r, c, foe) => {
    const k = `${r},${c}`;
    if (!seen.has(k)) { seen.add(k); res.push({r, c, foe}); }
  };


  if (u.type === 'S') {
    if (mode === 'attack') {
      adj8(u.row, u.col).forEach(({r,c}) => {
        if (g[r][c].friendly(u.owner).length) return;
        if (g[r][c].hasEnemy(u.owner)) add(r, c, true);
      });

      // Attaque spéciale : peut attaquer à distance 2 ou 3 cases orthogonalement, mais pas en diagonale, et ne peut pas sauter par-dessus une unité alliée (mais peut sauter par-dessus une unité ennemie)
      for (const dr of [-1, 1]) {
        for (let s = 2; s <= 3; s++) {
          const nr = u.row + dr*s, nc = u.col;
          if (!inBounds(nr, nc)) break;
          if (g[nr][nc].friendly(u.owner).length) break;
          if (g[nr][nc].hasEnemy(u.owner)) { add(nr, nc, true); break; }
        }
      }
    } else { // Déplacement : 1 case dans n'importe quelle direction, tant que la case n'est pas occupée par une unité alliée
      adj8(u.row, u.col).forEach(({r,c}) => {
        if (g[r][c].friendly(u.owner).length) return;
        add(r, c, g[r][c].hasEnemy(u.owner));
      });
    }

  } else if (u.type === 'C') {
    // 1 ou 2 cases orthogonalement
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc]) => {
      for (let s = 1; s <= 2; s++) {
        const nr = u.row+dr*s, nc = u.col+dc*s;
        if (!inBounds(nr,nc)) break;
        if (g[nr][nc].friendly(u.owner).length) break;
        const foe = g[nr][nc].hasEnemy(u.owner);
        add(nr, nc, foe);
        if (foe) break;
      }
    });

    // 1 case en diagonale
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => {
      const nr = u.row+dr, nc = u.col+dc;
      if (!inBounds(nr,nc)) return;
      if (g[nr][nc].friendly(u.owner).length) return;
      add(nr, nc, g[nr][nc].hasEnemy(u.owner));
    });

  } else if (u.type === 'T') {
    if (mode === 'attack') {
      // comme le chateu de l'échec, peut attaquer à n'importe quelle distance orthogonalement, mais pas en diagonale
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc]) => {
        for (let s = 1; s < GS; s++) {
          const nr = u.row+dr*s, nc = u.col+dc*s;
          if (!inBounds(nr,nc)) break;
          if (g[nr][nc].friendly(u.owner).length) break;
          if (g[nr][nc].hasEnemy(u.owner)) { add(nr, nc, true); break; }
        }
      });
    } else {
      // 1 case orthogonalement
      adj4(u.row, u.col).forEach(({r,c}) => {
        if (g[r][c].friendly(u.owner).length) return;
        add(r, c, g[r][c].hasEnemy(u.owner));
      });
    }
  }

  return res;
}