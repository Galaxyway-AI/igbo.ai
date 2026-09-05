export const technologies = [
  {
    slug: 'igbopronounce',
    name: 'IgboPronounce',
    icon: 'ọ́',
    category: 'THE LANGUAGE FOUNDATION',
    description: 'An open resource for words, pronunciation, tone and dialect.',
    detail:
      'A structured pronunciation resource connecting original spellings, meanings, tone annotations, dialect variants and consented native-speaker recordings. IPA and phoneme representations will be reviewed with linguists.',
    status: 'Planned',
  },
  {
    slug: 'igbotone',
    name: 'IgboTone',
    icon: '◜',
    category: 'TONE & CONTEXT',
    description: 'Making tone and diacritics part of language intelligence.',
    detail:
      'Research into diacritic restoration, contextual disambiguation and tone-aware speech processing. Evaluation will distinguish orthographic correctness from natural spoken delivery.',
    status: 'Planned',
  },
  {
    slug: 'igbophonemizer',
    name: 'IgboPhonemizer',
    icon: '/ŋ/',
    category: 'TEXT TO SOUND',
    description: 'An Igbo-specific engine that connects text to phonemes.',
    detail:
      'A proposed grapheme-to-phoneme pipeline covering normalisation, diacritic restoration, context, tone and dialect rules. Original language text will always be preserved separately from transformed representations.',
    status: 'Planned',
  },
  {
    slug: 'igbospeech',
    name: 'IgboSpeech',
    icon: '≋',
    category: 'SPEECH TECHNOLOGY',
    description: 'Towards natural speech synthesis and speech recognition.',
    detail:
      'A future speech stack for TTS and ASR, including multiple speakers and dialect-aware delivery. Models will be compared against documented baselines before any quality claims are made.',
    status: 'Planned',
  },
  {
    slug: 'igbospeechbench',
    name: 'IgboSpeechBench',
    icon: '⌁',
    category: 'MEASURABLE QUALITY',
    description: 'Evaluating AI speech with the people who know Igbo best.',
    detail:
      'A proposed native-speaker evaluation benchmark for pronunciation, tone, intelligibility, naturalness, dialect authenticity, names, place names, proverbs and code-switching.',
    status: 'Planned',
  },
  {
    slug: 'igbolm',
    name: 'IgboLM',
    icon: 'ị',
    category: 'LANGUAGE INTELLIGENCE',
    description:
      'A future foundation for understanding and conversing in Igbo.',
    detail:
      'A longer-term language intelligence layer spanning generation, translation, grammar, idioms, proverbs, cultural context and conversational understanding.',
    status: 'Planned',
  },
];
export const phases = [
  {
    id: 'phase-0',
    title: 'Landscape & Research',
    status: 'In Progress',
    description:
      'Understand the foundations. Define the questions worth asking.',
    milestones: [
      'Initial Igbo AI technology landscape review — Completed',
      'Initial dataset and model inventory — Completed',
      'Initial licensing landscape review — Completed',
      'Identification of major technical gaps — Completed',
      'Potential collaborator and research partner mapping — In Progress',
      'Formal dataset provenance audit — Planned',
      'Academic and community consultation — Planned',
      'Initial benchmark specification — Planned',
    ],
  },
  {
    id: 'phase-1',
    title: 'Linguistic Foundation',
    status: 'Planned',
    description:
      'Build a carefully annotated foundation for pronunciation, tone and dialect.',
    milestones: [
      'Agree annotation guidelines',
      'Define consent and licensing requirements',
      'Design the pronunciation resource',
    ],
  },
  {
    id: 'phase-2',
    title: 'IgboSpeechBench',
    status: 'Planned',
    description:
      'Establish transparent baselines and native-speaker evaluation.',
    milestones: [
      'Publish a benchmark specification',
      'Design blind comparisons',
      'Evaluate baseline systems',
    ],
  },
  {
    id: 'phase-3',
    title: 'IgboSpeech TTS',
    status: 'Planned',
    description:
      'Test whether explicit linguistic supervision improves naturalness.',
    milestones: [
      'Train evidence-led prototypes',
      'Compare tone and phoneme supervision',
      'Publish limitations and findings',
    ],
  },
  {
    id: 'phase-4',
    title: 'Dialect Expansion',
    status: 'Planned',
    description:
      'Expand representation in collaboration with dialect communities.',
    milestones: [
      'Agree dialect review methodology',
      'Broaden speaker participation',
      'Evaluate variety-specific performance',
    ],
  },
  {
    id: 'phase-5',
    title: 'IgboSpeech ASR',
    status: 'Planned',
    description:
      'Explore recognition that respects the way people actually speak.',
    milestones: [
      'Establish transcription baselines',
      'Study names and code-switching',
      'Evaluate with native speakers',
    ],
  },
  {
    id: 'phase-6',
    title: 'Conversational Igbo AI',
    status: 'Planned',
    description:
      'Bring language understanding and speech into a shared experience.',
    milestones: [
      'Connect provider interfaces',
      'Study conversational quality',
      'Release evidence-dependent experiments',
    ],
  },
];
export const roles = [
  'Igbo linguist',
  'Dialect expert',
  'Native speaker',
  'ML / speech researcher',
  'NLP researcher',
  'Software engineer',
  'University / academic institution',
  'Research organisation',
  'Dataset owner',
  'Technology company',
  'Community organisation',
  'Funding / grant organisation',
  'Sponsor',
  'Open-source contributor',
  'Other',
];
export const collaboratorStatuses = [
  'New',
  'Reviewing',
  'Contacted',
  'Potential Collaborator',
  'Active Collaborator',
  'Partner',
  'Declined',
  'Archived',
] as const;
export const hypothesis =
  'Can explicit tone, phoneme and dialect supervision make an Igbo speech system measurably more native-sounding than existing character-based Igbo TTS and general-purpose AI voices?';
