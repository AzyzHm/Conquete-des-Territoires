import { GS, UNIT_STATS } from './constants.js';
import { S, stat, nextUid } from './state.js';
import { Unit } from './models.js';
import { r6, sq } from './utils.js';
import { addLog, istrip, pName } from './ui.js';

// résout le combat entre l'attaquant `atk` et le défenseur `def`, en tenant compte des bonus de la case, et retourne 'win', 'hit' ou 'miss' selon le résultat du combat.
export function resolveCombat(atk, def, atkCell, defCell) {
  const ad = r6(), dd = r6();

  const ab = (atkCell.special==='bonus' && atkCell.revealed) ? 1 : 0;
  const db = (defCell.special==='bonus' && defCell.revealed) ? 1 : 0;

  const atkTot = atk.totalForce + ad + ab;
  const defTot = def.totalForce + dd + db;

  stat('bat');

  const nerfNote = atk.nerfForce > 0 ? ` [malus -${atk.nerfForce}]` : '';
  addLog(
    `⚔ ${UNIT_STATS[atk.type].name}(${atkTot})${nerfNote} vs ${UNIT_STATS[def.type].name}(${defTot}) — dés ${ad}/${dd}`,
    atk.owner===1 ? 'p1' : 'p2'
  );

  if (atkTot > defTot) {
    const raw = Math.max(1, atkTot - defTot);
    const cap = Math.max(1, Math.ceil(def.maxHp / 2) - 1);
    const dmg = Math.min(raw, cap);
    def.hp = Math.max(0, def.hp - dmg);
    addLog(`Touché! ${UNIT_STATS[def.type].name} perd ${dmg} HP (reste ${def.hp}).`, 'dmg');
    if (def.hp === 0) { killUnit(def); return 'win'; }
    return 'hit';
  }

  addLog(
    atk.nerfForce > 0
      ? `Attaque repoussée (malus dé -${atk.nerfForce}).`
      : 'Attaque repoussée.',
    atk.owner===1 ? 'p2' : 'p1'
  );
  return 'miss';
}

// gère le déplacement d'une unité `u` vers une nouvelle position (`toR`, `toC`), en mettant à jour les cellules concernées, et en appliquant les effets de la cellule d'arrivée (bonus, piège, capture de territoire, etc.)
export function land(u, toR, toC) {
  S.grid[u.row][u.col].rem(u);
  S.grid[toR][toC].add(u);
  const dest = S.grid[toR][toC];

  if (dest.special && !dest.revealed) {
    dest.revealed = true;
    const lbl = {
      bonus:   '★ Bonus',
      trap:    '⚠ Piège',
      spawn:   '✦ Portail Allié',
      counter: '☠ Portail Ennemi',
    }[dest.special] || dest.special;
    addLog(
      `${lbl} révélé en ${sq(toR, toC)}!`,
      (dest.special==='trap' || dest.special==='counter') ? 'dmg' : 'cap'
    );
  }

  if (dest.special === 'trap') {
    u.hp = Math.max(0, u.hp - 1);
    addLog(`Piège! ${UNIT_STATS[u.type].name} HP→${u.hp}`, 'dmg');
    if (u.hp === 0) { killUnit(u); return; }
    istrip('Piège! −1 HP.', 'bad');
  }

  if (dest.special === 'spawn' && !dest.spawnUsed) {
    dest.spawnUsed = true;
    spawnUnit(u.type, u.owner);
  }

  if (dest.special === 'counter' && !dest.spawnUsed) {
    dest.spawnUsed = true;
    const enemy = u.owner === 1 ? 2 : 1;
    spawnUnit(u.type, enemy);
    addLog(`☠ Portail Ennemi! Un ${UNIT_STATS[u.type].name} spawn pour ${pName(enemy)}!`, 'dmg');
    istrip(`☠ Portail Ennemi! L'ennemi reçoit un ${UNIT_STATS[u.type].name}!`, 'bad');
  }

  if (!dest.hasEnemy(u.owner) && dest.owner !== u.owner) {
    dest.owner = u.owner;
    if (u.owner === 1) stat('c1'); else stat('c2');
    addLog(`${sq(toR, toC)} capturée par ${pName(u.owner)}.`, u.owner===1 ? 'cap' : 'p2');
  }
}

// élimine une unité `u` du plateau et de la liste des unités, en mettant à jour les cellules concernées et le journal de combat.
export function killUnit(u) {
  if (u.row >= 0 && u.row < GS && u.col >= 0 && u.col < GS)
    S.grid[u.row][u.col].rem(u);

  const i = S.units.indexOf(u);
  if (i !== -1) S.units.splice(i, 1);

  addLog(`${UNIT_STATS[u.type].name} de ${pName(u.owner)} éliminé!`, 'dmg');
}

// gère le spawn d'une nouvelle unité de type `type` pour le joueur `beneficiary`, en la plaçant sur la première case libre de sa zone de départ, et en mettant à jour le journal de combat. Si aucune case n'est libre, affiche un message d'erreur dans le journal.
export function spawnUnit(type, beneficiary) {
  const homeRows = beneficiary === 1 ? [7, 6] : [0, 1];
  for (const row of homeRows) {
    for (let col = 0; col < GS; col++) {
      const cell = S.grid[row][col];
      if (!cell.units.length) {
        const nu = new Unit(type, beneficiary, nextUid());
        S.units.push(nu);
        cell.add(nu);
        cell.owner = beneficiary;
        addLog(`✦ ${UNIT_STATS[type].name} spawné en ${sq(row, col)} pour ${pName(beneficiary)}!`, beneficiary===1 ? 'cap' : 'p2');
        istrip(`✦ Portail! Nouveau ${UNIT_STATS[type].name} à la base!`, 'good');
        return;
      }
    }
  }
  addLog(`Portail: aucune case libre à la base de ${pName(beneficiary)}.`, 'dmg');
}