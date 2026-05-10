import { S } from './state.js';
import { el } from './ui.js';
import { initSetup } from './setup.js';
import { rollTurnDice } from './game.js';
import { confirmSetup, resetSetup } from './setup.js';
import { rollInitiative } from './initiative.js';

// Masque tous les écrans principaux (menu, règles, déploiement, jeu).
export function hideAll() {
  ['screen-menu','screen-rules','screen-setup','screen-game'].forEach(id => {
    el(id).style.display = 'none';
  });
}

// Affiche le menu principal, en masquant les autres écrans et en réinitialisant l'état de jeu.
export function showMenu() {
  el('win-modal').classList.remove('on');
  el('init-overlay').classList.remove('on');
  hideAll();
  el('screen-menu').style.display = 'flex';
  S.phase = 'over'; S.selUnit = null; S.reachable = [];
}

// Affiche l'écran des règles
export function showRules() { hideAll(); el('screen-rules').style.display = 'flex'; }

// Démarre la séquence de déploiement pour le mode de jeu sélectionné (PvP ou AI).
export function startSetup(mode) {
  S.gameMode = mode;
  hideAll();
  el('screen-setup').style.display = 'flex';
  initSetup();
}

// Rejouer une partie
export function restartSameMode() {
  el('win-modal').classList.remove('on');
  el('init-overlay').classList.remove('on');
  startSetup(S.gameMode);
}

window.showMenu        = showMenu;
window.showRules       = showRules;
window.startSetup      = startSetup;
window.restartSameMode = restartSameMode;
window.rollTurnDice    = rollTurnDice;
window.confirmSetup    = confirmSetup;
window.resetSetup      = resetSetup;
window.rollInitiative  = rollInitiative;

// Empêche le menu contextuel d'apparaître au clic droit sur le plateau de jeu.
el('game-grid').addEventListener('contextmenu', e => e.preventDefault());