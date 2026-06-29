/**
 * @typedef {Object} CurriculumMeta
 * @property {string} title
 * @property {string} source
 * @property {string} level
 * @property {number[]} forms
 * @property {string} [isbn]
 * @property {string} [purpose]
 * @property {string} [version]
 * @property {string} [generated]
 */

/**
 * @typedef {Object} CurriculumRecord
 * @property {string} id
 * @property {number} form
 * @property {string} topicNumber
 * @property {string} topic
 * @property {string} subtopicNumber
 * @property {string} subtopic
 * @property {string[]} specificCompetences
 * @property {string[]} learningActivities
 * @property {string} expectedStandard
 * @property {string[]} keywords
 * @property {string[]} suggestedAssessmentTypes
 */

/**
 * @typedef {Object} ChemistryCurriculumDataset
 * @property {CurriculumMeta} meta
 * @property {CurriculumRecord[]} curriculum
 */

export {}
