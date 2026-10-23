import { getRandomBytes } from '../crypto/random';

const WORDS = [
  'anchor', 'apex', 'apple', 'arch', 'arrow', 'atlas', 'beacon', 'breeze', 'bridge', 'cabin',
  'canyon', 'cedar', 'cliff', 'cloud', 'clover', 'cobalt', 'copper', 'coral', 'crag', 'crystal',
  'delta', 'drift', 'dune', 'eagle', 'echo', 'ember', 'falcon', 'fawn', 'fern', 'flare',
  'flint', 'forest', 'fossil', 'frost', 'galaxy', 'garden', 'glade', 'granite', 'harbor', 'haven',
  'hawk', 'hazel', 'helix', 'horizon', 'island', 'jasper', 'jungle', 'knight', 'lagoon', 'lark',
  'laurel', 'lumen', 'lunar', 'magnet', 'mantle', 'meadow', 'meteor', 'mist', 'monarch', 'mosaic',
  'nebula', 'nexus', 'north', 'oasis', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'origin',
  'palace', 'pearl', 'phoenix', 'pine', 'planet', 'prism', 'pulse', 'quartz', 'radar', 'raven',
  'ridge', 'river', 'robin', 'rocket', 'sable', 'sage', 'sail', 'shadow', 'shield', 'sierra',
  'silver', 'solar', 'spark', 'spire', 'summit', 'terra', 'timber', 'topaz', 'trail', 'urban',
  'valley', 'velvet', 'vessel', 'walnut', 'willow', 'zenith', 'zephyr'
];

export function generatePassphrase(wordCount: number = 4): string {
  const count = Math.max(3, Math.min(6, wordCount));
  const randomBytes = getRandomBytes(count);
  const chosenWords: string[] = [];

  for (let i = 0; i < count; i++) {
    const idx = randomBytes[i] % WORDS.length;
    chosenWords.push(WORDS[idx]);
  }

  return chosenWords.join('-');
}
