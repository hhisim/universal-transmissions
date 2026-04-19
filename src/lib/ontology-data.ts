export interface OntologyLetter {
  summary: string;
  key: string[];
  symbolic: string[];
  cross: string[];
  essence: string;
}

import DATA from '../data/ontology-raw.json';
export const ontology: Record<string, OntologyLetter> = DATA as Record<string, OntologyLetter>;
