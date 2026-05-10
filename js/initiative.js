import { S } from './state.js';
import { r6 } from './utils.js';
import { el } from './ui.js';
import { initGame } from './game.js';

// Afficher le Modal d'initiative
export function showInitiativeOverlay() {
  const isAI = S.gameMode==='ai';
  el('init-lbl1').textContent   = 'Joueur 1';
  el('init-lbl2').textContent   = isAI ? 'Ordinateur' : 'Joueur 2';
  el('init-d1').textContent     = '—';
  el('init-d2').textContent     = '—';
  el('init-d1').className       = 'init-die p1c';
  el('init-d2').className       = 'init-die p2c';
  el('init-result').textContent = '';
  el('init-result').className   = 'init-result';
  el('btn-init-roll').disabled  = false;
  el('init-overlay').classList.add('on');
}

// Exécuter le lancer de dés pour l'initiative
export function rollInitiative() {
  el('btn-init-roll').disabled = true;
  const d1 = el('init-d1'), d2 = el('init-d2');

  d1.classList.add('rolling');
  d2.classList.add('rolling');
  setTimeout(() => { d1.classList.remove('rolling'); d2.classList.remove('rolling'); }, 450);

  setTimeout(() => {
    const roll1 = r6();
    const roll2 = r6();
    d1.textContent = roll1;
    d2.textContent = roll2;

    const resEl  = el('init-result');
    const isAI   = S.gameMode==='ai';
    const p2Name = isAI ? "l'Ordinateur" : 'Joueur 2';

    if (roll1 === roll2) {
      resEl.textContent = `Égalité ! (${roll1} = ${roll2}) — on relance…`;
      resEl.className   = 'init-result tie';
      setTimeout(rollInitiative, 1100);
      return;
    }

    const firstPlayer = roll1 > roll2 ? 1 : 2;
    const winnerName  = firstPlayer === 1 ? 'Joueur 1' : p2Name;

    d1.className = `init-die ${firstPlayer===1 ? 'win' : 'p1c'}`;
    d2.className = `init-die ${firstPlayer===2 ? 'win' : 'p2c'}`;

    resEl.textContent = `${winnerName} commence ! (${roll1} vs ${roll2})`;
    resEl.className   = 'init-result decided';

    setTimeout(() => {
      el('init-overlay').classList.remove('on');
      initGame(firstPlayer);
    }, 1300);
  }, 550);
}