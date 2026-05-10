import { ROSTER, UNIT_STATS } from './constants.js';
import { S } from './state.js';
import { el } from './ui.js';
import { showInitiativeOverlay } from './initiative.js';
import { aiRandom } from './ai.js';

// réinitialise les variables d'état liées au déploiement des unités.
export function initSetup() {
  S.setupPlayer      = 1;
  S.setupPlacements  = { 1:[], 2:[] };
  S.selectedTrayType = null;
  S.trayRemaining    = { 1:{S:2,C:2,T:1}, 2:{S:2,C:2,T:1} };
  renderSetupScreen();
}

// Affiche l'écran de déploiement pour le joueur courant
export function renderSetupScreen() {
  const p    = S.setupPlayer;
  const isP1 = p === 1;
  el('setup-title').textContent = `Déploiement — ${isP1 ? 'Joueur 1' : (S.gameMode==='ai' ? 'Ordinateur' : 'Joueur 2')}`;
  el('setup-sub').textContent   = isP1
    ? 'Placez vos 5 unités dans les rangées du bas (surlignées en bleu)'
    : 'Placez vos 5 unités dans les rangées du haut (surlignées en rouge)';
  renderTray(); renderSetupGrid(); updateConfirmBtn();
}

// rend le panneau de sélection des unités, en affichant le nombre d'unités restantes de chaque type à placer, et en indiquant visuellement quelle unité est actuellement sélectionnée pour placement.
export function renderTray() {
  const tray = el('piece-tray'); tray.innerHTML='';
  const rem  = S.trayRemaining[S.setupPlayer];
  ['S','C','T'].forEach(type => {
    const count = rem[type];
    const item  = document.createElement('div');
    item.className = 'tray-item'
      + (count===0 ? ' depleted' : '')
      + (S.selectedTrayType===type ? ' selected' : '');
    item.innerHTML = `<div class="tray-badge ${type}">${type}</div>
      <div class="tray-info"><strong>${UNIT_STATS[type].name}</strong><br>F${UNIT_STATS[type].force} HP${UNIT_STATS[type].maxHp}</div>
      <div class="tray-count">×${count}</div>`;
    if (count > 0) item.onclick = () => selectType(type);
    tray.appendChild(item);
  });
}

// rend la grille de déploiement, en affichant les unités déjà placées pour le joueur courant et son adversaire, en indiquant les zones de placement autorisées, et en ajoutant des gestionnaires d'événements pour permettre au joueur de placer ou retirer des unités.
export function renderSetupGrid() {
  const sg    = el('setup-grid'); sg.innerHTML='';
  const p     = S.setupPlayer;
  const isP1  = p === 1;
  const pl    = S.setupPlacements[p];
  const other = S.setupPlacements[p===1 ? 2 : 1];
  const zone  = { min: isP1 ? 6 : 0, max: isP1 ? 7 : 1 };
  const zoneClass = isP1 ? 'zone-p1' : 'zone-p2';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const div    = document.createElement('div'); div.className='sg-cell';
      const inZone = r >= zone.min && r <= zone.max;
      const ex     = pl.find(p => p.r===r && p.c===c);
      const oth    = other.find(p => p.r===r && p.c===c);

      if (inZone) {
        div.classList.add(zoneClass);
        if (S.selectedTrayType && !ex) div.classList.add('can-place');
      } else if (!ex && !oth) {
        div.classList.add('locked');
      }

      if (ex) {
        const tok = document.createElement('div'); tok.className=`sg-tok p${p}`;
        tok.textContent = ex.type; tok.title = 'Cliquer pour retirer';
        tok.onclick = e => { e.stopPropagation(); removeUnit(r, c); };
        div.appendChild(tok);
      }

      if (oth) {
        const tok = document.createElement('div'); tok.className=`sg-tok p${p===1?2:1}`;
        tok.textContent = oth.type; tok.style.opacity='.4'; div.appendChild(tok);
      }

      div.addEventListener('contextmenu', e => e.preventDefault());

      if (inZone && !ex && S.selectedTrayType) {
        div.onclick = () => placeUnit(r, c);
      } else if (inZone && !ex) {
        div.onclick = () => { el('setup-info').textContent = 'Sélectionnez d\'abord une pièce dans le panneau gauche.'; };
      }

      sg.appendChild(div);
    }
  }

  const placed = pl.length;
  el('setup-info').textContent = S.selectedTrayType
    ? `${UNIT_STATS[S.selectedTrayType].name} sélectionné — cliquez une case. (${placed}/${ROSTER.length})`
    : `${placed}/${ROSTER.length} unités placées.${placed===ROSTER.length ? ' Prêt à confirmer!' : ''}`;
}

// Sélectionne ou désélectionne un type d'unité pour placement.
export function selectType(type) {
  S.selectedTrayType = S.selectedTrayType === type ? null : type;
  renderTray(); renderSetupGrid();
}

// Place une unité du type actuellement sélectionné à la position (r, c) dans la grille de déploiement, en vérifiant que le placement est valide (zone autorisée, unités restantes du type sélectionné).
export function placeUnit(r, c) {
  if (!S.selectedTrayType) return;
  const rem = S.trayRemaining[S.setupPlayer];
  if (!rem[S.selectedTrayType]) return;
  S.setupPlacements[S.setupPlayer].push({ type: S.selectedTrayType, r, c });
  rem[S.selectedTrayType]--;
  if (!rem[S.selectedTrayType]) S.selectedTrayType = null;
  renderTray(); renderSetupGrid(); updateConfirmBtn();
}

// Retire une unité déjà placée
export function removeUnit(r, c) {
  const pl = S.setupPlacements[S.setupPlayer];
  const i  = pl.findIndex(p => p.r===r && p.c===c);
  if (i === -1) return;
  S.trayRemaining[S.setupPlayer][pl[i].type]++;
  pl.splice(i, 1);
  renderTray(); renderSetupGrid(); updateConfirmBtn();
}

// réinitialise tous les placements.
export function resetSetup() {
  S.trayRemaining[S.setupPlayer] = { S:2, C:2, T:1 };
  S.setupPlacements[S.setupPlayer] = [];
  S.selectedTrayType = null;
  renderTray(); renderSetupGrid(); updateConfirmBtn();
}

// Activer la bouton de confirmation une fois que le joueur a placé toutes ses unités, et le désactiver sinon.
export function updateConfirmBtn() {
  el('btn-setup-confirm').disabled = S.setupPlacements[S.setupPlayer].length < ROSTER.length;
}

// Vérifie que le joueur a placé toutes ses unités, puis passe à l'étape suivante : soit le déploiement du second joueur en PvP, soit le lancement de l'initiative en AI.
export function confirmSetup() {
  if (S.setupPlacements[S.setupPlayer].length < ROSTER.length) return;

  if (S.gameMode==='pvp' && S.setupPlayer===1) {
    S.setupPlayer      = 2;
    S.selectedTrayType = null;
    S.trayRemaining[2] = { S:2, C:2, T:1 };
    S.setupPlacements[2] = [];
    renderSetupScreen();
    return;
  }

  if (S.gameMode==='ai') aiRandom();
  showInitiativeOverlay();
}