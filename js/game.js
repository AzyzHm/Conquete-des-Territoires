import { GS, WIN, UNIT_STATS, SPECIAL_SQUARES, ROSTER } from './constants.js';
import { S, stat, nextUid } from './state.js';
import { Unit } from './models.js';
import { Cell } from './models.js';
import { r6, sq } from './utils.js';
import { getReachable } from './movement.js';
import { land } from './combat.js';
import { resolveCombat } from './combat.js';
import {el, renderAll, renderGrid, addLog, istrip, setPhase, setBanner,resetDiceUI, pName,} from './ui.js';
import { aiDiceAndAct } from './ai.js';

// Initialise une nouvelle partie
export function initGame(firstPlayer) {
  S.grid=[]; S.units=[]; S.uid=0; S.selUnit=null; S.reachable=[];
  S.phase='dice'; S.currentP=firstPlayer; S.turnN=1;
  S.pendingBuff={force:0,hp:0}; S.pendingNerf=0; S.buffApplied=false;
  S.stats={turns:0,c1:0,c2:0,bat:0};

  // Initialise la grille de jeu avec des cellules vides, en appliquant les propriétés spéciales définies dans SPECIAL_SQUARES (bonus, piège, portail allié/ennemi).
  for (let r=0; r<GS; r++) {
    S.grid[r]=[];
    for (let c=0; c<GS; c++) {
      const sp = SPECIAL_SQUARES.find(s => s.r===r && s.c===c);
      S.grid[r][c] = new Cell(r, c, sp ? sp.t : null);
    }
  }

  // Placer les unités de départ pour les deux joueurs selon les placements définis dans S.setupPlacements, en créant des instances de Unit pour chaque unité
  [1,2].forEach(p => S.setupPlacements[p].forEach(({type,r,c}) => placeGameUnit(type, p, r, c)));

  // le téritoire de départ de chaque joueur est automatiquement capturé au début de la partie
  for (let c=0; c<GS; c++) { S.grid[6][c].owner=1; S.grid[7][c].owner=1; }
  for (let c=0; c<GS; c++) { S.grid[0][c].owner=2; S.grid[1][c].owner=2; }

  // mettre à jour l'interface utilisateur pour refléter l'état initial du jeu.
  const isAI = S.gameMode==='ai';
  el('mode-tag').textContent    = isAI ? 'Joueur contre Ordinateur' : 'Joueur contre Joueur';
  el('left-label').textContent  = 'Joueur 1';
  el('left-name').textContent   = '▲ JOUEUR 1';
  el('right-label').textContent = isAI ? 'Ordinateur' : 'Joueur 2';
  el('right-name').textContent  = isAI ? '▼ ORDINATEUR' : '▼ JOUEUR 2';
  el('dp1-lbl').textContent     = 'Joueur 1';
  el('dp2-lbl').textContent     = isAI ? 'Ordinateur' : 'Joueur 2';
  el('win-modal').classList.remove('on');
  el('logbox').innerHTML = '';
  el('btn-dice').disabled = false;
  resetDiceUI();

  hideAll();
  el('screen-game').style.display='flex';
  renderAll();

  const starterName = S.currentP===1 ? 'Joueur 1' : (isAI ? "l'Ordinateur" : 'Joueur 2');
  addLog(`Partie commencée — ${starterName} commence !`, 'sys');

  if (isAI && S.currentP===2) {
    S.phase='ai_turn'; setBanner(); setPhase('Ordinateur lance les dés...');
    istrip("L'ordinateur joue en premier...", 'gold');
    el('btn-dice').disabled=true;
    setTimeout(aiDiceAndAct, S.aiMs);
  } else {
    istrip('Lancez les dés pour commencer votre tour!', 'gold');
    setPhase('Lancez les dés'); setBanner();
    el('btn-dice').disabled=false;
  }
}

// place une unité de type `type` appartenant au joueur `owner` à la position (r, c) sur le plateau, en créant une instance de Unit, en l'ajoutant à la liste globale des unités et à la cellule correspondante, et en mettant à jour le propriétaire de la cellule.
function placeGameUnit(type, owner, r, c) {
  const u = new Unit(type, owner, nextUid());
  S.units.push(u);
  S.grid[r][c].add(u);
  S.grid[r][c].owner = owner;
}

// gére les dés
export function rollTurnDice() {
  if (S.phase !== 'dice') return;
  S.phase = 'rolling';
  el('btn-dice').disabled = true;

  const d1 = el('die1'), d2 = el('die2');
  d1.classList.add('rolling'); d2.classList.add('rolling');
  setTimeout(() => { d1.classList.remove('rolling'); d2.classList.remove('rolling'); }, 500);

  setTimeout(() => {
    const my = r6(), opp = r6();
    const [av, ov] = S.currentP===1 ? [my, opp] : [opp, my];
    d1.textContent = my; d2.textContent = opp;

    let bF=0, bH=0, bL='';
    if (av<=2)      { bF=1; bL='+1 Force'; }
    else if (av<=4) { bH=1; bL='+1 PV';   }
    else            { bF=2; bL='+2 Force!'; }

    S.pendingBuff  = { force:bF, hp:bH };
    S.pendingNerf  = Math.max(0, ov - av);

    const b1 = el('die1-buff'), b2 = el('die2-buff');
    if (S.currentP===1) {
      b1.textContent = bL;                              b1.className = 'dice-buff good';
      b2.textContent = S.pendingNerf>0 ? `Nerf atk: -${S.pendingNerf}` : 'Pas de malus';
      b2.className   = S.pendingNerf>0 ? 'dice-buff nerf' : 'dice-buff';
    } else {
      b2.textContent = bL;                              b2.className = 'dice-buff good';
      b1.textContent = S.pendingNerf>0 ? `Nerf atk: -${S.pendingNerf}` : 'Pas de malus';
      b1.className   = S.pendingNerf>0 ? 'dice-buff nerf' : 'dice-buff';
    }

    addLog(`Tour ${S.turnN} — ${S.currentP===1?'J1':'J2/IA'}: dé ${av} → ${bL}${S.pendingNerf>0?` ⚠ Malus -${S.pendingNerf}`:''}`, 'sys');
    S.phase = 'p_select'; setPhase('Sélectionnez votre unité');
    istrip(`Dé: ${av} → ${bL}${S.pendingNerf>0 ? ` ⚠ Malus atk: -${S.pendingNerf}` : ' — aucun malus'}. Sélectionnez une unité.`, 'gold');
    renderAll();
  }, 600);
}

// gére les clicks sur les cellules du plateau
export function cellClick(r, c, btn) {
  if (['over','rolling','ai_turn'].includes(S.phase)) return;
  const cell = S.grid[r][c];

  if (S.phase === 'p_select') {
    const fr = cell.friendly(S.currentP);
    if (!fr.length) { istrip('Cliquez sur une de vos unités.','bad'); return; }
    if (fr[0].usedThisTurn) { istrip('Cette unité a déjà joué ce tour.','bad'); return; }

    S.selUnit   = fr[0];
    applyBuff(S.selUnit);
    S.reachable = getReachable(S.selUnit, 'move');
    S.phase     = 'p_dest';
    setPhase('Choisissez une destination');

    const nn = S.pendingNerf>0 ? `  ⚠ Malus atk: -${S.pendingNerf}` : '';
    const tn = S.selUnit.type==='T'
      ? ' | Clic droit=attaque longue portée'
      : S.selUnit.type==='S' ? ' | Clic droit=tir vertical x3' : '';
    istrip(`Clic gauche=déplacer${tn} · Clic droit=attaquer${nn}`);
    renderGrid(); return;
  }

  if (S.phase === 'p_dest') {
    // clique sur la même unité sélectionnée → désélectionner
    if (cell.units.includes(S.selUnit)) {
      unapplyBuff(S.selUnit); S.selUnit=null; S.reachable=[]; S.phase='p_select';
      setPhase('Sélectionnez votre unité'); istrip('Désélectionnée.'); renderGrid(); return;
    }

    // clique sur une autre unité amie → changer la sélection
    const fr = cell.friendly(S.currentP);
    if (fr.length && !fr[0].usedThisTurn) {
      unapplyBuff(S.selUnit);
      S.selUnit   = fr[0];
      applyBuff(S.selUnit);
      S.reachable = getReachable(S.selUnit, 'move');
      setPhase('Choisissez une destination'); renderGrid(); return;
    }

    if (btn === 'L') {
      const rc = S.reachable.find(x => x.r===r && x.c===c);
      if (!rc)    { istrip('Case hors de portée.','bad'); return; }
      if (rc.foe) { istrip('Case ennemie — utilisez le clic droit pour attaquer.','bad'); return; }
      doMove(S.selUnit, r, c);
    } else {
      const ar = getReachable(S.selUnit, 'attack');
      const rc = ar.find(x => x.r===r && x.c===c && x.foe);
      if (!rc) { istrip('Aucune cible ennemie ici.','bad'); return; }
      doAttack(S.selUnit, r, c);
    }
  }
}

// Applique le bonus
function applyBuff(u) {
  if (S.buffApplied) return;
  u.buffForce = S.pendingBuff.force;
  u.nerfForce = S.pendingNerf;
  if (S.pendingBuff.hp > 0) u.hp = Math.min(u.maxHp, u.hp + S.pendingBuff.hp);
  S.buffApplied = true;
}

// Retire le bonus (si n'est pas un bonus de vie)
function unapplyBuff(u) {
  if (!S.buffApplied || !u) return;
  u.buffForce = 0;
  u.nerfForce = 0;
  S.buffApplied = false;
}

// Déplacer
function doMove(u, toR, toC) {
  land(u, toR, toC);
  istrip(`${UNIT_STATS[u.type].name} déplacé vers ${sq(toR, toC)}.`);
  addLog(`${pName(u.owner)}: ${UNIT_STATS[u.type].name} → ${sq(toR, toC)}`, u.owner===1 ? 'p1' : 'p2');
  finishTurn(u);
}

// Attaquer
function doAttack(u, toR, toC) {
  const dest = S.grid[toR][toC];
  if (!dest.hasEnemy(u.owner)) { istrip('Aucun ennemi sur cette case.','bad'); return; }

  const fromR = u.row, fromC = u.col;
  const isRanged = Math.abs(toR-fromR) > 1 || Math.abs(toC-fromC) > 1;

  const enemy = dest.enemies(u.owner).reduce((a,b) =>
    (a.totalForce+a.defBonus) >= (b.totalForce+b.defBonus) ? a : b
  );

  const result = resolveCombat(u, enemy, S.grid[fromR][fromC], dest);

  if (result === 'win') {
    if (isRanged) {
      addLog(`${UNIT_STATS[u.type].name}: tir longue portée ${sq(toR,toC)}. Ennemi éliminé (case non capturée).`, 'cap');
      istrip('Tir à distance! Ennemi éliminé. Case non capturée.', 'good');
    } else {
      land(u, toR, toC);
      istrip('Ennemi éliminé! Territoire capturé.', 'good');
    }
  } else if (result === 'hit') {
    istrip(`Touché! ${UNIT_STATS[enemy.type].name} a ${enemy.hp} HP restants.`, 'good');
  } else {
    istrip('Attaque repoussée!', 'bad');
  }

  finishTurn(u);
}

// Fin de Tour
export function finishTurn(u) {
  u.usedThisTurn = true;
  S.selUnit      = null;
  S.reachable    = [];

  renderAll();
  checkWin();
  if (S.phase === 'over') return;

  S.currentP = S.currentP===1 ? 2 : 1;
  S.turnN++;
  stat('turns');

  S.units.forEach(x => x.resetTurn());
  S.buffApplied = false;
  S.pendingBuff = { force:0, hp:0 };
  S.pendingNerf = 0;
  resetDiceUI();

  if (S.gameMode==='ai' && S.currentP===2) {
    S.phase = 'ai_turn'; setBanner(); setPhase('Ordinateur lance les dés...');
    istrip("L'ordinateur joue...", 'gold');
    el('btn-dice').disabled = true;
    renderAll();
    setTimeout(aiDiceAndAct, S.aiMs);
  } else {
    S.phase = 'dice'; setBanner(); setPhase('Lancez les dés');
    istrip('Votre tour! Lancez les dés.', 'gold');
    el('btn-dice').disabled = false;
    renderAll();
    addLog(`--- Tour ${S.turnN} — ${S.currentP===1?'Joueur 1':S.gameMode==='ai'?'IA':'Joueur 2'} ---`, 'sys');
  }
}

// Vérifier les conditions de victoire : un joueur gagne s'il contrôle au moins 33 cases ou si l'adversaire n'a plus d'unités en vie. Si une condition de victoire est remplie, déclencher la fin de partie avec doWin().
export function checkWin() {
  let t1=0, t2=0;
  for (let r=0; r<GS; r++) for (let c=0; c<GS; c++) {
    if (S.grid[r][c].owner===1) t1++; else if (S.grid[r][c].owner===2) t2++;
  }
  const u1 = S.units.filter(u => u.owner===1).length;
  const u2 = S.units.filter(u => u.owner===2).length;

  if (t1>=WIN || u2===0) { doWin(1); return; }
  if (t2>=WIN || u1===0) { doWin(2); return; }
}

// Déclanche la victoire
function doWin(w) {
  S.phase = 'over';
  const ai       = S.gameMode==='ai';
  const winnerEl = el('win-winner');
  const titleEl  = el('win-title');
  const icoEl    = el('win-ico');
  const msgEl    = el('win-msg');

  if (ai) {
    icoEl.textContent   = w===1 ? '🏆' : '🤖';
    titleEl.textContent = w===1 ? 'Victoire!' : 'Défaite!';
    titleEl.style.color = w===1 ? '' : 'var(--ng)';
    winnerEl.textContent = '';
    msgEl.textContent   = w===1
      ? `Vous avez vaincu l'IA en ${S.turnN} tours!`
      : `L'IA a conquis le territoire en ${S.turnN} tours.`;
    msgEl.style.color   = '';
  } else {
    icoEl.textContent    = '🏆';
    titleEl.textContent  = '';
    winnerEl.textContent = w===1 ? '▲ Joueur 1 gagne!' : '▼ Joueur 2 gagne!';
    winnerEl.style.color = w===1 ? 'var(--p1l)' : 'var(--p2l)';
    msgEl.textContent    = `Conquête accomplie en ${S.turnN} tours.`;
    msgEl.style.color    = 'var(--dim)';
  }

  el('win-modal').classList.add('on');
  addLog(`=== ${w===1?'JOUEUR 1':(ai?'ORDINATEUR':'JOUEUR 2')} GAGNE — ${S.turnN} tours ===`, 'sys');
}

// Masque tous les écrans pour n'en afficher qu'un seul ensuite
function hideAll() {
  ['screen-menu','screen-rules','screen-setup','screen-game'].forEach(id => {
    el(id).style.display = 'none';
  });
}