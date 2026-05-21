export interface Gradient {
  id: string;
  css: string;
  textColor: "light" | "dark";
}

export const GRADIENTS: Gradient[] = [
  {
    id: "dusk",
    css: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
    textColor: "light",
  },
  {
    id: "ember",
    css: "linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 50%, #3f1d1d 100%)",
    textColor: "light",
  },
  {
    id: "mint",
    css: "linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 45%, #d6e7e0 100%)",
    textColor: "dark",
  },
  {
    id: "paper",
    css: "linear-gradient(160deg, #fafaf9 0%, #f5f5f4 50%, #eeebe6 100%)",
    textColor: "dark",
  },
  {
    id: "ink",
    css: "linear-gradient(135deg, #0c0a09 0%, #1c1917 60%, #292524 100%)",
    textColor: "light",
  },
];

export function pickGradient(seed: string): Gradient {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
