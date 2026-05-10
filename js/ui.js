import { GS, UNIT_STATS, WIN } from './constants.js';
import { cellClick } from './game.js';
import { S } from './state.js';

export function el(id) { return document.getElementById(id); }

// rendre à nouveau tout le plateau et les panneaux latéraux (territory counts, unit lists, stats)
export function renderAll()  { renderGrid(); renderPanels(); }

// rend le plateau de jeu en fonction de l'état actuel : les unités présentes, les cases spéciales révélées, la case sélectionnée, et les cases atteignables pour l'unité sélectionnée
export function renderGrid() {
  const g = el('game-grid');
  g.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = S.grid[r][c];
      const div  = document.createElement('div');
      div.className = 'cell';

      if (cell.owner===1) div.classList.add('op1');
      else if (cell.owner===2) div.classList.add('op2');

      if (cell.revealed) {
        if (cell.special==='bonus')   div.classList.add('cbon');
        if (cell.special==='trap')    div.classList.add('ctrp');
        if (cell.special==='spawn')   div.classList.add('cspawn');
        if (cell.special==='counter') div.classList.add('cctr');
      }

      if (S.selUnit && cell.units.includes(S.selUnit)) div.classList.add('csel');

      const rc = S.reachable.find(x => x.r===r && x.c===c);
      if (rc) {
        div.classList.add('rch');
        if (rc.foe) div.classList.add('foe');
        const h = document.createElement('div'); h.className='chint2';
        h.textContent = rc.foe ? 'ATK' : 'MV'; div.appendChild(h);
      }

      const strip = document.createElement('div'); strip.className='cstrip'; div.appendChild(strip);

      if (cell.units.length) {
        const stk = document.createElement('div'); stk.className='ustk';
        cell.units.forEach(u => {
          const wrap = document.createElement('div'); wrap.style.position='relative';

          const tok = document.createElement('div'); tok.className=`utok p${u.owner}`;
          if (u===S.selUnit) tok.classList.add('sel');
          tok.textContent = u.type;
          tok.title = `${UNIT_STATS[u.type].name} HP:${u.hp}/${u.maxHp} Force:${u.totalForce}`;

          const hb = document.createElement('div'); hb.className='tok-hp';
          const hf = document.createElement('div'); hf.className=`tok-hp-fill ${u.hpClass}`;
          hf.style.width = (u.hpPct*100) + '%'; hb.appendChild(hf);

          wrap.appendChild(tok); wrap.appendChild(hb); stk.appendChild(wrap);
        });
        div.appendChild(stk);
      }

      div.dataset.r = r; div.dataset.c = c;
      div.addEventListener('click',       e => { e.preventDefault(); cellClick(r,c,'L'); });
      div.addEventListener('contextmenu', e => { e.preventDefault(); cellClick(r,c,'R'); });

      g.appendChild(div);
    }
  }
}

// mise à jour de la partie centrale des panneaux latéraux : compte des territoires contrôlés, listes d'unités vivantes, et statistiques de la partie
export function renderPanels() {
  let t1=0, t2=0;
  for (let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if (S.grid[r][c].owner===1) t1++; else if (S.grid[r][c].owner===2) t2++;
  }

  const p1p = Math.min(100, (t1/WIN)*100);
  const p2p = Math.min(100, (t2/WIN)*100);

  el('left-t').textContent  = t1;  el('right-t').textContent  = t2;
  el('left-bar').style.width  = p1p+'%'; el('right-bar').style.width  = p2p+'%';
  el('left-pct').textContent  = Math.round(p1p)+'%'; el('right-pct').textContent = Math.round(p2p)+'%';

  renderUList(1,'left-ul'); renderUList(2,'right-ul');

  el('st-t').textContent  = S.stats.turns;
  el('st-c1').textContent = S.stats.c1;
  el('st-c2').textContent = S.stats.c2;
  el('st-b').textContent  = S.stats.bat;
}

// rend la liste des unités vivantes du joueur `p` dans le conteneur d'id `id`, avec leurs points de vie, buffs/nerfs en cours, et une barre de vie colorée
export function renderUList(p, id) {
  const container = el(id); container.innerHTML='';
  const us = S.units.filter(u => u.owner===p);

  if (!us.length) {
    container.innerHTML='<div style="font-size:.66rem;color:var(--dim);font-style:italic">Aucune unité</div>';
    return;
  }

  us.forEach(u => {
    const row  = document.createElement('div'); row.className='urow';
    const b    = document.createElement('div'); b.className=`ub p${p}`; b.textContent=u.type;
    const info = document.createElement('div'); info.style.flex='1';

    let extra = '';
    if (u.buffForce>0) extra += ` <span style="color:var(--ok)">+${u.buffForce}F</span>`;
    if (u.nerfForce>0) extra += ` <span style="color:#ffaa44">-${u.nerfForce}F</span>`;
    info.innerHTML = `<span style="color:var(--txt)">${UNIT_STATS[u.type].name}</span>${extra}`;

    const hpT  = document.createElement('div');
    hpT.style.cssText = 'font-size:.58rem;color:var(--dim);white-space:nowrap;';
    hpT.textContent   = `${u.hp}/${u.maxHp}`;

    const hbar = document.createElement('div'); hbar.className='hp-bar';
    const hf   = document.createElement('div');
    hf.className  = `hp-fill ${u.hpClass}`;
    hf.style.width = (u.hpPct*100) + '%'; hbar.appendChild(hf);

    row.appendChild(b); row.appendChild(info); row.appendChild(hpT); row.appendChild(hbar);
    container.appendChild(row);
  });
}

export function istrip(txt, type='') {
  const e = el('istrip'); e.textContent=txt; e.className='istrip'+(type?' '+type:'');
}

export function setPhase(txt) { el('turn-phase').textContent=txt; }

// mise à jour de la bannière supérieure pour afficher le numéro du tour et le joueur actif, avec une flèche pointant vers lui, et une classe CSS pour colorer le nom du joueur
export function setBanner() {
  el('turn-num').textContent = S.turnN;
  const e = el('turn-pname');
  e.textContent = S.currentP===1 ? '▲ JOUEUR 1' : (S.gameMode==='ai' ? '▼ ORDINATEUR' : '▼ JOUEUR 2');
  e.className   = 'tplayer p' + S.currentP;
}

// mettre à jour le journal de combat
export function addLog(msg, type='') {
  const lb = el('logbox');
  const d  = document.createElement('div'); d.className='le '+type; d.textContent=msg;
  lb.appendChild(d); lb.scrollTop=lb.scrollHeight;
}

export function pName(p) { return p===1 ? 'Joueur 1' : (S.gameMode==='ai' ? "l'IA" : 'Joueur 2'); }

export function resetDiceUI() {
  el('die1').textContent='—'; el('die2').textContent='—';
  el('die1-buff').textContent=''; el('die2-buff').textContent='';
}