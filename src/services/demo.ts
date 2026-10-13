import type { Comment } from '../lib/filters';

const users = ['ana_ruiz', 'bruno.g', 'caro_lopez', 'diego88', 'eva.mt', 'fran_cis', 'gaby_h', 'hugo.p', 'ines_v', 'jorge_k', 'karla.s', 'luis_m'];
const texts = [
  'Quiero ganar! @amiga1 @amiga2',
  'Participo @amigo1',
  'Me encanta 😍',
  '@uno @dos @tres vamos!',
  'Yo yo yo',
  '@amiga1 mira esto',
];

export function demoComments(): Comment[] {
  const out: Comment[] = [];
  let id = 0;
  for (let round = 0; round < 3; round++) {
    users.forEach((u, i) => {
      if (round > 0 && i % 3 !== 0) return;
      out.push({ id: String(id++), username: u, text: texts[(i + round) % texts.length] });
    });
  }
  return out;
}
