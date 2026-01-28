export const MUTATIONS = [
  {
    id: 'wt',
    name: 'WT',
    gene: 'control',
    summary: 'Wild-type baseline recording preview.',
    parameters: {},
    preview: '/data/wt.json'
  },
  {
    id: 'e999k',
    name: 'e999k',
    gene: 'SCN1A',
    summary: 'Mutation e999k preview dataset.',
    parameters: { note: 'example variant' },
    preview: '/data/e999k.json'
  },
  {
    id: 'mut1',
    name: 'V402M',
    gene: 'SCN1A',
    summary: 'A point mutation causing a depolarizing shift in activation and slowed inactivation.',
    parameters: {
      gNa: 1.0,
      shift_mV: 5,
      tau_inact_mult: 1.4
    },
    files: ['examples/V402M.hoc', 'examples/V402M.py'],
    simulatedResults: [0, 0.2, 0.5, 0.8, 0.6, 0.3, 0.1]
  },
  {
    id: 'mut2',
    name: 'TTX-R',
    gene: 'SCN5A',
    summary: 'Reduces peak sodium current; slower recovery from inactivation.',
    parameters: {
      gNa: 0.6,
      recovery_ms: 8
    },
    files: ['examples/TTX-R.hoc'],
    simulatedResults: [0, 0.1, 0.15, 0.2, 0.18, 0.12, 0.05]
  },
  {
    id: 'mut3',
    name: 'L92P',
    gene: 'KCNQ2',
    summary: 'Loss-of-function mutation in potassium channel leading to reduced IK conductance.',
    parameters: { gK: 0.4 },
    files: ['examples/L92P.py'],
    simulatedResults: [0, 0.4, 0.7, 1.0, 0.9, 0.5, 0.2]
  }
]

export function getAllMutations(){
  return MUTATIONS.map(({ id, name, gene, summary }) => ({ id, name, gene, summary }))
}

export function getMutationById(id){
  return MUTATIONS.find(m => m.id === id) || null
}
