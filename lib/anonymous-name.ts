const ADJECTIVES = [
  "Velvet",
  "Silent",
  "Obsidian",
  "Hidden",
  "Nocturne",
  "Cipher",
  "Golden",
  "Ghost",
  "Static",
  "Private",
];

const NOUNS = [
  "Fox",
  "Signal",
  "Lantern",
  "Mirror",
  "Thread",
  "Mask",
  "Archive",
  "Circuit",
  "Ember",
  "Vault",
];

function pickRandomItem(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateAnonymousName() {
  const adjective = pickRandomItem(ADJECTIVES);
  const noun = pickRandomItem(NOUNS);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${adjective} ${noun} ${suffix}`;
}
