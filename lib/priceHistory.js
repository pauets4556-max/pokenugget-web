function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

const BASE_BY_RARITY = {
  "Común": 0.3,
  "Infrecuente": 0.6,
  "Rara": 1.5,
  "Rara Holo": 4,
  "Ultra Rara": 12,
  "Secreta": 35,
};

export function generatePriceHistory(cardId, rarity) {
  const base = BASE_BY_RARITY[rarity] || 1;
  let seed = hashSeed(cardId);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const days = 30;
  let price = base * (0.85 + rand() * 0.3);
  const history = [];
  for (let i = days - 1; i >= 0; i--) {
    const drift = (rand() - 0.5) * base * 0.08;
    price = Math.max(0.05, price + drift);
    const d = new Date();
    d.setDate(d.getDate() - i);
    history.push({
      day: d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      price: Math.round(price * 100) / 100,
    });
  }
  return history;
}
