/**
 * ECSEOL 2026 exemplar SBA tasks and exam scenarios (starter pack).
 * Source: docs/doc/ECSEOL Assessment Schemes_22_4_2026.pdf
 */

const INTEGER_RUBRIC = {
  criteria: [
    {
      name: 'Accuracy of Scale',
      excellent: 'All integers correct, equal spacing',
      good: 'Most integers correct, minor spacing errors',
      fair: 'Some integers correct, uneven spacing',
      needsImprovement: 'Many errors, no clear scale',
    },
    {
      name: 'Functionality',
      excellent: 'Moves smoothly and accurately',
      good: 'Moves but occasionally sticks',
      fair: 'Moves with difficulty',
      needsImprovement: 'Does not move',
    },
    {
      name: 'Demonstration',
      excellent: 'Correctly shows two integer operations',
      good: 'Shows one correctly',
      fair: 'Attempts but with errors',
      needsImprovement: 'No demonstration',
    },
  ],
}

module.exports.ECZ_EXEMPLARS = [
  {
    subjectCode: 'MATH1',
    subjectName: 'Mathematics I',
    form: 1,
    band: 'sba_task',
    title: 'Integer Number Line Model',
    taskType: 'Practical task',
    context:
      'A small shop owner in your community sells goods like sugar, rice, and cooking oil. He wants to track daily profits (positive) and losses (negative) using a reusable number line model.',
    task: 'Design and make a durable integer number line model from cardboard showing integers from -20 to +20 with a movable marker. Demonstrate addition and subtraction of integers.',
    materials: ['Cardboard', 'Glue', 'Scissors', 'Ruler', 'Pencil', 'Eraser', 'Protractor'],
    rubricJson: INTEGER_RUBRIC,
    demonstration:
      'Start at +10, move left 15 steps (10 + (-15) = -5). Start at -8, move right 12 steps (-8 + 12 = +4).',
  },
  {
    subjectCode: 'MATH1',
    subjectName: 'Mathematics I',
    form: 1,
    band: 'exam_scenario',
    title: 'Numbers and Operations — Mkushi School',
    context:
      'A local school in Mkushi ordered 254,800 exercise books for Form 1 learners. The science lab recorded temperatures: Monday morning -5°C, afternoon +8°C. The school bank account had -K15,000 before a PTA donation of K25,000.',
    task: null,
    examSubQuestionsJson: [
      {
        number: '(a)',
        commandTerm: 'State',
        question: 'Write 254,800 in words.',
        marks: 2,
        bloomsLevel: 'Remembering',
      },
      {
        number: '(b)',
        commandTerm: 'State',
        question: "Place value of digit '5' in 254,800.",
        marks: 1,
        bloomsLevel: 'Understanding',
      },
      {
        number: '(c)',
        commandTerm: 'Calculate',
        question: 'Round 254,800 to the nearest ten thousand.',
        marks: 2,
        bloomsLevel: 'Applying',
      },
      {
        number: '(d)',
        commandTerm: 'Calculate',
        question: 'Temperature change from -5°C to +8°C.',
        marks: 2,
        bloomsLevel: 'Applying',
      },
      {
        number: '(e)',
        commandTerm: 'Calculate',
        question: 'New balance after K25,000 donation.',
        marks: 3,
        bloomsLevel: 'Applying',
      },
    ],
  },
  {
    subjectCode: 'ENG',
    subjectName: 'English Language',
    form: 1,
    band: 'sba_task',
    title: 'Dialogue Recording — Greetings',
    taskType: 'Presentation',
    context:
      'A new learner joins your class from another province. You need to welcome them and introduce them to the class.',
    task: 'In pairs, record a 2-minute conversation demonstrating greetings, self-introduction, personal questions, and polite leave-taking.',
    materials: ['Audio or video recorder', 'Optional props'],
    rubricJson: {
      criteria: [
        {
          name: 'Greetings',
          excellent: 'Appropriate formal/informal',
          good: 'Mostly appropriate',
          fair: 'Some errors',
          needsImprovement: 'Inappropriate',
        },
        {
          name: 'Fluency',
          excellent: 'Natural, confident',
          good: 'Some pauses',
          fair: 'Hesitant',
          needsImprovement: 'Very hesitant',
        },
      ],
    },
    demonstration: 'Perform or submit recording with clear audio.',
  },
  {
    subjectCode: 'ENG',
    subjectName: 'English Language',
    form: 1,
    band: 'exam_scenario',
    title: 'Comprehension — Munali Secondary Canteen',
    context:
      'The canteen at Munali Secondary School in Lusaka is always busy during break. Mrs. Banda says it serves over 300 learners daily with affordable meals (bun K2, juice K3).',
    task: null,
    examSubQuestionsJson: [
      {
        number: '(a)',
        commandTerm: 'Identify',
        question: 'Where is the canteen located?',
        marks: 1,
        bloomsLevel: 'Remembering',
      },
      {
        number: '(b)',
        commandTerm: 'List',
        question: 'Three items sold at the canteen.',
        marks: 1,
        bloomsLevel: 'Remembering',
      },
      {
        number: '(g)',
        commandTerm: 'Describe',
        question: 'Write 50–60 words describing your school canteen.',
        marks: 4,
        bloomsLevel: 'Creating',
      },
    ],
  },
  {
    subjectCode: 'BIO',
    subjectName: 'Biology',
    form: 1,
    band: 'sba_task',
    title: 'Ecosystem Field Study',
    taskType: 'Fieldwork',
    context: 'An ecologist wants to document biodiversity near your school pond or garden.',
    task: 'Conduct a field study: identify 5+ organisms, draw and label, classify, create a food chain, write a 500-word report and present orally.',
    materials: ['Notebook', 'Pencil', 'Camera optional'],
    rubricJson: {
      criteria: [
        {
          name: 'Organisms identified',
          excellent: '7+ correct',
          good: '5–6 correct',
          fair: '3–4',
          needsImprovement: 'Less than 3',
        },
        {
          name: 'Food chain',
          excellent: 'Correct with arrows',
          good: 'Correct but simple',
          fair: 'Some errors',
          needsImprovement: 'Incorrect',
        },
      ],
    },
    demonstration: 'Oral presentation of findings to class.',
  },
  {
    subjectCode: 'GEO',
    subjectName: 'Geography',
    form: 1,
    band: 'sba_task',
    title: 'Weather Observation Diary',
    taskType: 'Fieldwork',
    context: 'A farmer in your area needs accurate weather data for planning farming activities.',
    task: 'Set up a simple weather station for two weeks. Record temperature, rainfall, wind, cloud cover. Produce summary table, bar graph, and recommendations.',
    materials: ['Thermometer', 'Rain gauge', 'Wind vane', 'Observation diary'],
    demonstration: 'Present weather analysis and farmer recommendations.',
  },
  {
    subjectCode: 'CIV',
    subjectName: 'Civic Education',
    form: 1,
    band: 'sba_task',
    title: 'School Governance Study',
    taskType: 'Project',
    context: 'Your school has a prefect body and clubs that support governance.',
    task: 'Interview headteacher, deputy, senior prefect, and club patron. Draw organogram, write 500-word report on school governance.',
    materials: ['Interview guide', 'Paper for organogram'],
    demonstration: 'Submit report with organogram.',
  },
  {
    subjectCode: 'MATH1',
    subjectName: 'Mathematics I',
    form: 2,
    band: 'exam_scenario',
    title: 'Simultaneous Equations — School Concert',
    context:
      'A teacher at David Kaunda Secondary School in Lusaka is organising a concert. Adult tickets K15, children K8. 250 tickets sold for K3,200 total.',
    task: null,
    examSubQuestionsJson: [
      {
        number: '(a)',
        commandTerm: 'State',
        question: 'Write two equations for tickets sold.',
        marks: 2,
        bloomsLevel: 'Applying',
      },
      {
        number: '(b)',
        commandTerm: 'Calculate',
        question: 'Solve for adult and children tickets.',
        marks: 5,
        bloomsLevel: 'Analysing',
      },
    ],
  },
]
