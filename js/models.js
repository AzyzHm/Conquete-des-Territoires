import { UNIT_STATS } from './constants.js';

export class Unit {

  constructor(type, owner, id) {
    this.type  = type;
    this.owner = owner;
    this.id    = id;

    this.row = -1; // pas de position avant d'être placé sur une cellule du plateau
    this.col = -1;

    const s = UNIT_STATS[type];
    this.force    = s.force;
    this.maxHp    = s.maxHp;
    this.hp       = s.maxHp; // les unités commencent avec tous leurs points de vie

    this.usedThisTurn = false; // pour suivre si cette unité a déjà été activée ce tour (pour empêcher les doubles actions)
    this.buffForce    = 0;
    this.nerfForce    = 0;
  }

  get totalForce() { return Math.max(0, this.force + this.buffForce - this.nerfForce); }


  // pourcentage de points de vie restants, utilisé pour la barre de vie et les couleurs associées
  get hpPct()      { return this.hp / this.maxHp; }

  get hpClass()    { return this.hpPct > .6 ? 'hi' : this.hpPct > .3 ? 'mid' : 'low'; }

  // réinitialise les propriétés de suivi des actions et des buffs/nerfs à chaque début de tour
  resetTurn() {
    this.usedThisTurn = false;
    this.buffForce    = 0;
    this.nerfForce    = 0;
  }
}

export class Cell {
  constructor(r, c, special) {
    this.row      = r;
    this.col      = c;
    this.owner    = 0;          // 0 : aucune unité, 1 : joueur 1, 2 : joueur 2
    this.units    = [];
    this.special  = special || null;
    this.revealed  = false;
    this.spawnUsed = false;
  }

  // ajoute une unité à cette cellule et met à jour les coordonnées de l'unité en conséquence
  add(u)      { u.row = this.row; u.col = this.col; this.units.push(u); }

  rem(u)      { this.units = this.units.filter(x => x.id !== u.id); }

  hasEnemy(p) { return this.units.some(u => u.owner !== p); }

  friendly(p) { return this.units.filter(u => u.owner === p); }

  enemies(p)  { return this.units.filter(u => u.owner !== p); }
}