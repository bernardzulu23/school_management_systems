/**
 * Barrel for ECZ EoC reusable modules (validator / generator / registry / topics).
 * Existing ecz-practice and ecz-exam-questions routes are NOT fully cut over yet —
 * call generateEczQuestion / validateQuestion from new paths and side-by-side checks.
 */
export {
  BloomLevel,
  ComponentType,
  ResolutionMode,
  EczSubjectSpec,
  GeneratedQuestion,
  type EczSubjectSpecT,
  type GeneratedQuestionT,
  type ElementOfConstructT,
  type SubSkillT,
} from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
export {
  loadEocSpec,
  loadAllEocSpecs,
  getEocSpecDataDir,
  __clearEocSpecCache,
} from '@/lib/ecz/eoc/load-eoc-spec'
export {
  resolveEoc,
  resolveTopicToEoc,
  requiresTaskType,
  validateStructure,
  validateSemantics,
  validateQuestion,
  type ValidationIssue,
  type ValidationResult,
  type ResolveEocResult,
} from '@/lib/ecz/eoc/question-validator'
export { generateEczQuestion, UnknownTopicError } from '@/lib/ecz/eoc/ecz-question-generator'
export {
  ECZ_SUBJECT_REGISTRY,
  findSubjectRegistryEntry,
  listSubjectsWithEocSpec,
  listSubjectsMissingEocSpec,
  buildSpecFileAliasMap,
  type EczSubjectRegistryEntry,
} from '@/lib/ecz/eoc/subjectRegistry'
export {
  loadSyllabusTopics,
  getSyllabusIngestDir,
  type SyllabusTopicIndex,
} from '@/lib/ecz/eoc/syllabusTopicIndex'
export {
  crosswalkSpec,
  buildCorpusIndex,
  matchAliasToCorpus,
  scoreTopicAgainstSubSkill,
  normalizeTopicKey,
  cleanSyllabusTopic,
  canonicalizeCorpusTopic,
  isUsableTopic,
  topicsFromUnitTitle,
  type CrosswalkChange,
  type CrosswalkResult,
} from '@/lib/ecz/eoc/crosswalkTopicAliases'
export { writeEczValidationLog } from '@/lib/ecz/eoc/writeValidationLog'
export { runValidationSideBySide } from '@/lib/ecz/eoc/runValidationSideBySide'
export {
  mapScenarioToGeneratedQuestion,
  mapPracticeQuestionToGeneratedQuestion,
  mapQuizQuestionToGeneratedQuestion,
} from '@/lib/ecz/eoc/mapExistingGeneration'
