import { GS } from './constants.js';

export function r6() { return Math.floor(Math.random() * 6) + 1; } // dés à 6 faces

export function sq(r, c) { return String.fromCharCode(65 + c) + (GS - r); } // transforme les coordonnées (r, c) en notation de type "A1", "B2" (comme l'échecs)