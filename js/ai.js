import { GS, UNIT_STATS, ROSTER } from './constants.js';
import { S } from './state.js';
import { r6 } from './utils.js';
import { getReachable } from './movement.js';
import { land, resolveCombat } from './combat.js';
import { el, addLog, renderAll, pName } from './ui.js';
import { sq } from './utils.js';
import { finishTurn, checkWin } from './game.js';

// génère des placements aléatoires pour les unités de l'IA, en remplissant la liste `S.setupPlacements[2]` avec des objets contenant le type d'unité et ses coordonnées de placement, en s'assurant que les unités sont placées dans la zone de départ de l'IA (les deux premières rangées du plateau) et que les placements sont aléatoires à chaque partie.
export function aiRandom() {
  const cells = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < GS; c++) cells.push({ r, c });

  
  for (let i = cells.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  ROSTER.forEach((type, i) => S.setupPlacements[2].push({ type, r:cells[i].r, c:cells[i].c }));
}

// Etape 1 du tour de l'IA : lancer les dés pour déterminer le bonus de ce tour, puis choisir quelle unité activer et appliquer le bonus/nerf avant d'agir avec cette unité.
export function aiDiceAndAct() {
  if (S.phase === 'over') return;

  const my  = r6();
  const opp = r6();

  el('die2').textContent = my;
  el('die1').textContent = opp;

  let bF=0, bH=0, bL='';
  if      (my<=2) { bF=1; bL='+1 Force'; }
  else if (my<=4) { bH=1; bL='+1 PV';   }
  else            { bF=2; bL='+2 Force!'; }

  S.pendingBuff = { force:bF, hp:bH };
  S.pendingNerf = Math.max(0, opp - my);

  const b2 = el('die2-buff');
  b2.textContent = bL + (S.pendingNerf > 0 ? `  ⚠-${S.pendingNerf}` : '');
  b2.className   = 'dice-buff good';

  const b1 = el('die1-buff');
  b1.textContent = S.pendingNerf>0 ? `Nerf IA: -${S.pendingNerf}` : '';
  b1.className   = S.pendingNerf>0 ? 'dice-buff nerf' : 'dice-buff';

  addLog(`IA: dé ${my} → ${bL}${S.pendingNerf>0 ? ` malus-${S.pendingNerf}` : ''}`, 'sys');
  setTimeout(aiAct, S.aiMs);
}

// Etape 2 du tour de l'IA : choisir quelle unité activer et appliquer son bonus.
function aiAct() {
  if (S.phase === 'over') return;

  const aiUnits = S.units.filter(u => u.owner===2);

  if (!aiUnits.length) {
    S.phase = 'dice';
    finishTurn({ usedThisTurn:true, owner:2, buffForce:0, nerfForce:0, resetTurn(){} });
    return;
  }

  const scored = aiUnits.map(u => ({ u, s: aiScore(u) })).sort((a,b) => b.s - a.s);
  const pick   = scored[0].u;

  pick.buffForce = S.pendingBuff.force;
  pick.nerfForce = S.pendingNerf;
  if (S.pendingBuff.hp > 0) pick.hp = Math.min(pick.maxHp, pick.hp + S.pendingBuff.hp);
  S.buffApplied  = true;

  addLog(
    `IA choisit: ${UNIT_STATS[pick.type].name} ${sq(pick.row, pick.col)}`
    + (pick.buffForce>0 ? ` (+${pick.buffForce}F)` : '')
    + (pick.nerfForce>0 ? ` (-${pick.nerfForce})` : ''),
    'p2'
  );

  aiActUnit(pick);
  pick.usedThisTurn = true;
  renderAll();
  checkWin();

  if (S.phase !== 'over') setTimeout(() => finishTurn(pick), S.aiMs);
}

// évalue une unité `u` pour l'IA en lui attribuant un score basé sur les cibles d'attaque disponibles,
// les mouvements possibles, et des critères spécifiques à son type (Tank, Cavalier, Soldat), 
// afin de guider le choix de l'unité à activer pour maximiser les chances de succès de l'IA.
function aiScore(u) {
  let s = 0;

  getReachable(u, 'attack').filter(x => x.foe).forEach(({r, c}) => {
    const en   = S.grid[r][c].enemies(2);
    const weak = en.reduce((a,b) => (a.totalForce) <= (b.totalForce) ? a : b);
    const ab   = (S.grid[u.row][u.col].special==='bonus' && S.grid[u.row][u.col].revealed) ? 1 : 0;
    const db   = (S.grid[r][c].special==='bonus' && S.grid[r][c].revealed) ? 1 : 0;
    const canWin = u.totalForce + 3.5 + ab > weak.totalForce + 3.5 + db;
    s += canWin ? 20 + (8 - weak.hp) : 5;
  });

  getReachable(u, 'move').filter(x => !x.foe && S.grid[x.r][x.c].owner !== 2).forEach(() => s += 3);

  if (u.type==='T') s += 2;
  if (u.type==='C') s += 1;
  s += u.row;

  return s;
}

// gère l'action d'une unité `u` de l'IA en choisissant la meilleure action disponible (attaque prioritaire, sinon déplacement vers une case avantageuse), en appliquant les effets de cette action (résolution de combat, capture de territoire, etc.), et en mettant à jour le journal de combat avec les actions de l'IA.
function aiActUnit(u) {
  const fr = u.row, fc = u.col;

  // Priorité 1 : Attaquer une unité ennemie si possible, en choisissant la cible la plus faible et en évaluant les chances de succès du combat pour maximiser les chances de victoire de l'IA.
  const atks = getReachable(u, 'attack').filter(x => x.foe);
  if (atks.length) {
    const scored = atks.map(({r, c}) => {
      const en     = S.grid[r][c].enemies(2);
      const weak   = en.reduce((a,b) => (a.totalForce) <= (b.totalForce) ? a : b);
      const ab     = (S.grid[fr][fc].special==='bonus' && S.grid[fr][fc].revealed) ? 1 : 0;
      const db     = (S.grid[r][c].special==='bonus'   && S.grid[r][c].revealed)   ? 1 : 0;
      const canWin = u.totalForce + 3.5 + ab > weak.totalForce + 3.5 + db;
      return { r, c, weak, canWin, score: (canWin ? 1000 : 0) + (8 - weak.hp) * 10 };
    }).sort((a,b) => b.score - a.score);

    const tgt   = scored[0];
    const dest  = S.grid[tgt.r][tgt.c];
    const enemy = dest.enemies(2).reduce((a,b) => (a.totalForce) >= (b.totalForce) ? a : b);
    const result = resolveCombat(u, enemy, S.grid[fr][fc], dest);

    if (result === 'win') {
      const ranged = Math.abs(tgt.r-fr) > 1 || Math.abs(tgt.c-fc) > 1;
      if (ranged) {
        addLog(`IA tir longue portée ${sq(tgt.r, tgt.c)}! (case non capturée)`, 'cap');
      } else {
        land(u, tgt.r, tgt.c);
      }
    }
    return;
  }

  // Priorité 2 : Déplacer et capturer
  const moves = getReachable(u, 'move').filter(x => !x.foe);
  if (moves.length) {
    const cap  = moves.filter(x => S.grid[x.r][x.c].owner !== 2);
    const pool = cap.length ? cap : moves;

    let ch;
    if (u.type === 'C') {
      ch = pool.reduce((b, t) => t.r > b.r ? t : b);
    } else if (u.type === 'T') {
      const bon = pool.filter(x => S.grid[x.r][x.c].special === 'bonus');
      ch = bon.length ? bon[0] : pool.reduce((b, t) => t.r > b.r ? t : b);
    } else {
      ch = pool.reduce((b, t) => t.r > b.r ? t : b);
    }

    land(u, ch.r, ch.c);
    addLog(`IA: ${UNIT_STATS[u.type].name} ${sq(fr,fc)}→${sq(ch.r, ch.c)}`, 'p2');
    return;
  }

  // Aucune action possible : rester sur place
  addLog(`IA: ${UNIT_STATS[u.type].name} ${sq(fr,fc)} sans mouvement possible.`, 'p2');
}