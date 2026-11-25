import { FONT_PAIRINGS } from "./fonts.js";
import {
  type AccentStrategy,
  type BrandkitInput,
  PERSONALITIES,
  type Personality,
  type Roundness,
} from "./types.js";

export type QuestionType = "text" | "longtext" | "color" | "single" | "multi";

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface Question {
  id: keyof BrandAnswers;
  type: QuestionType;
  prompt: string;
  help?: string;
  required?: boolean;
  options?: QuestionOption[];
  /** For multi-select: maximum choices. */
  max?: number;
}

/** Raw answers as a form would collect them. */
export interface BrandAnswers {
  name: string;
  description?: string;
  audience?: string;
  personality?: Personality[];
  primary?: string;
  accent?: string;
  avoidColors?: string;
  roundness?: Roundness;
  accentStrategy?: AccentStrategy;
  fontPairing?: string;
}

const PERSONALITY_LABELS: Record<Personality, string> = {
  professional: "Professional and trustworthy",
  friendly: "Friendly and approachable",
  playful: "Playful and fun",
  calm: "Calm and reassuring",
  bold: "Bold and confident",
  technical: "Technical and precise",
  warm: "Warm and human",
  luxurious: "Premium and refined",
};

/**
 * The questions behind a brand kit, in order. UIs can render these directly;
 * every question except the name is optional and has a sensible default.
 */
export const BRAND_QUESTIONS: Question[] = [
  { id: "name", type: "text", prompt: "What is your brand or project called?", required: true },
  {
    id: "description",
    type: "longtext",
    prompt: "Describe what it does in a sentence or two.",
    help: "Used in the generated brand guide and DESIGN.md.",
  },
  { id: "audience", type: "text", prompt: "Who is it for?" },
  {
    id: "personality",
    type: "multi",
    prompt: "How should it feel? Pick up to three, most important first.",
    max: 3,
    options: PERSONALITIES.map((p) => ({ value: p, label: PERSONALITY_LABELS[p] })),
  },
  {
    id: "primary",
    type: "color",
    prompt: "Do you already have a main brand colour?",
    help: "Leave blank and we'll suggest one from the personality.",
  },
  { id: "accent", type: "color", prompt: "A second colour you'd like to use?" },
  {
    id: "roundness",
    type: "single",
    prompt: "What shape should buttons and cards have?",
    options: [
      { value: "sharp", label: "Sharp", hint: "Square corners, precise" },
      { value: "soft", label: "Soft", hint: "Slightly rounded" },
      { value: "round", label: "Round", hint: "Pill buttons, friendly" },
    ],
  },
  {
    id: "fontPairing",
    type: "single",
    prompt: "Pick a type style, or let us choose.",
    options: FONT_PAIRINGS.map((p) => ({ value: p.id, label: p.label })),
  },
];

/** Converts form answers to generator input, ignoring unknown or empty values. */
export function answersToInput(answers: BrandAnswers): BrandkitInput {
  const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const personality = (answers.personality ?? [])
    .filter((p): p is Personality => (PERSONALITIES as readonly string[]).includes(p))
    .slice(0, 3);

  const input: BrandkitInput = { name: answers.name.trim() };
  const description = clean(answers.description);
  if (description) input.description = description;
  if (personality.length) input.personality = personality;
  const primary = clean(answers.primary);
  if (primary) input.primary = primary;
  const accent = clean(answers.accent);
  if (accent) input.accent = accent;
  if (answers.roundness) input.roundness = answers.roundness;
  if (answers.accentStrategy) input.accentStrategy = answers.accentStrategy;
  if (answers.fontPairing) input.fontPairing = answers.fontPairing;
  return input;
}
