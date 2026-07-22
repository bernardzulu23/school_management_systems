/**
 * Barrel for ECZ EoC sidecar modules (validator / generator / logging).
 * Existing ecz-practice and ecz-exam-questions routes are NOT cut over yet.
 */
export {
  BloomLevel,
  ComponentType,
  EczSubjectSpec,
  GeneratedQuestion,
  type EczSubjectSpecT,
  type GeneratedQuestionT,
} from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
export { loadEocSpec, getEocSpecDataDir, __clearEocSpecCache } from '@/lib/ecz/eoc/load-eoc-spec'
export {
  resolveTopicToEoc,
  validateStructure,
  validateSemantics,
  validateQuestion,
} from '@/lib/ecz/eoc/question-validator'
export { generateEczQuestion } from '@/lib/ecz/eoc/ecz-question-generator'
export { writeEczValidationLog } from '@/lib/ecz/eoc/writeValidationLog'
export { runValidationSideBySide } from '@/lib/ecz/eoc/runValidationSideBySide'
export {
  mapScenarioToGeneratedQuestion,
  mapPracticeQuestionToGeneratedQuestion,
} from '@/lib/ecz/eoc/mapExistingGeneration'
