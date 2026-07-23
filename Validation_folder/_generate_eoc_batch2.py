"""Generate EoC specs for English, Literature, Civic, History, Mathematics II."""
from __future__ import annotations
import json
from pathlib import Path

OUT = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\data\curriculum\ecz-eoc")

SPECS = [
  {
    "filename": "english-language-1021.json",
    "subjectCode": "1021",
    "subjectName": "English Language",
    "syllabusYear": 2024,
    "construct": "Demonstrates proficient and competent use of the four language skills (speaking, listening, reading and writing) in real life situations adapting to audience and purpose in order to communicate effectively and support life-long learning.",
    "elementsOfConstruct": [
      {
        "id": "EoC1",
        "description": "Interprets and understands spoken information",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc1-listening",
          "label": "Identifies main ideas and supporting details; analyses speaker purpose, tone and intent; follows instructions and responds appropriately",
          "topicAliases": ["COMPREHENSION", "Listening Comprehension", "DIRECTIONS", "INSTRUCTIONS", "PHONE CONVERSATIONS", "PUBLIC SPEAKING"],
          "unverifiedTopicAliases": ["GREETINGS", "REQUESTS", "INTRODUCTIONS"],
          "taskTypeAliases": [],
          "note": "Primarily assessed in SBA (speaking/listening). Final Exam covers EoC3 and EoC4 only."
        }]
      },
      {
        "id": "EoC2",
        "description": "Produces ideas, thoughts and opinions through spoken language",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc2-speaking",
          "label": "Organises thoughts logically; speaks clearly; uses appropriate vocabulary, expressions and tone",
          "topicAliases": ["PUBLIC SPEAKING", "DRAMA", "LANGUAGE IN SOCIAL SETTINGS", "MAKING AN OFFER", "INVITATIONS", "APOLOGIES AND COMPLIMENTS"],
          "unverifiedTopicAliases": ["DEBATE", "ROLE PLAY"],
          "taskTypeAliases": [],
          "note": "SBA-focused (role plays, debates, discussions). Not in Final Exam paper."
        }]
      },
      {
        "id": "EoC3",
        "description": "Reads, Interprets and summarises continuous and non-continuous texts",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc3-reading",
          "label": "Reads and understands texts; uses words accurately for audience/purpose; summarises main ideas and key points",
          "topicAliases": ["COMPREHENSION", "INTRODUCTION TO SUMMARY", "NOTE SUMMARY", "TABULATION", "SHORT MESSAGES", "ADVERTISEMENTS", "ABBREVIATIONS", "FIGURATIVE LANGUAGE", "POETRY"],
          "unverifiedTopicAliases": ["Reading Comprehension", "Summary"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC4",
        "description": "Demonstrates masterly of written language conventions",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc4-writing",
          "label": "Spells accurately; applies grammar and punctuation; produces coherent purposeful written texts",
          "topicAliases": [
            "BASIC WRITING SKILLS", "NARRATIVE WRITING", "DESCRIPTIVE WRITING", "LETTER WRITING",
            "EXPOSITORY WRITING", "PERSUASIVE WRITING", "DIARY WRITING", "PARTS OF SPEECH",
            "TENSES", "NOUNS", "ARTICLES", "ADJECTIVES", "VERBS", "AGREEMENT", "ADVERBS",
            "PREPOSITIONS", "PHRASAL VERBS", "QUESTION TAGS", "CONDITION", "THE GERUND AND PRESENT PARTICIPLE"
          ],
          "unverifiedTopicAliases": ["Composition", "Report Writing", "Speech Writing", "Curriculum Vitae"],
          "taskTypeAliases": []
        }]
      }
    ],
    "testDesign": {
      "components": [
        {"type": "SBA", "code": "1021/1", "formLevel": "Form 2", "numItems": 6, "totalMarks": 100,
         "structureNotes": "SBA Form 2: 6 tasks/100. All 4 EoC (listening, speaking, reading, writing). Role plays, debates, discussions, assignments. PDF table shows paper code 1012/1 (likely typo; subject code is 1021).",
         "bloomRange": ["remembering", "creating"]},
        {"type": "SBA", "code": "1021/1", "formLevel": "Form 3", "numItems": 6, "totalMarks": 100,
         "structureNotes": "SBA Form 3: 6 tasks/100. All 4 EoC. Combined SBA 200 marks (30%).",
         "bloomRange": ["remembering", "creating"]},
        {"type": "FINAL_EXAM", "code": "1021/2", "formLevel": "Form 4", "numItems": 4, "totalMarks": 100,
         "structureNotes": "3 sections: A Structure EoC4 (20); B Comprehension(30)+Summary(20) EoC3; C Composition EoC4 (30, choose 1 of 2). EoC1-2 SBA only. Duration 2h30. 70%.",
         "bloomRange": ["remembering", "creating"]}
      ],
      "scenarioRequired": True,
      "minPartsPerScenarioItem": 2
    },
    "scoringCriteria": {"rules": [
      "SBA scored at school using Scoring Rubric/Guides in SBA Guidelines for Literature and Languages.",
      "Final Exam marked centrally by ECZ after examiner coordination meeting.",
      "Section A (Structure): marks for applying grammatical rules in context.",
      "Section B: marks in brackets per task; summary judged as a whole against rubric.",
      "Section C (Composition): impression marking and error analysis (sentence variety, vocabulary, punctuation, paragraphing, error frequency).",
      "British English expected; American English allowed only if used consistently.",
      "Candidates must sit both components to be graded."
    ]},
    "exemplars": [{
      "eocId": "EoC4",
      "scenarioTheme": "Weekend narrative stem testing structure/grammar in context (crack of dawn scenario) for Section A language conventions",
      "parts": [
        {"label": "(a)", "marks": 5, "bloomLevel": "applying"},
        {"label": "(b)", "marks": 5, "bloomLevel": "analysing"}
      ],
      "keyCompetences": ["communication", "critical_thinking"]
    }]
  },
  {
    "filename": "literature-in-english-1025.json",
    "subjectCode": "1025",
    "subjectName": "Literature in English",
    "syllabusYear": 2024,
    "construct": "Demonstrates literary skills and creativity, communicates effectively through competent use of language in real life situations and appreciates diverse cultures.",
    "elementsOfConstruct": [
      {
        "id": "EoC1",
        "description": "Acquires literary skills and uses them in everyday life",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc1-literary-skills",
          "label": "Acquires theoretical and practical literary skills; analyses and produces literary works; uses literary skills in daily interactions and entrepreneurship",
          "topicAliases": ["Literary Devices", "Literary Terminologies", "History of Zambian Literature", "Zambian Literature"],
          "unverifiedTopicAliases": ["Figurative Language", "Creative Writing"],
          "taskTypeAliases": [],
          "note": "Section A of Final Exam focuses on literary terminologies/devices and/or history of Zambian literature."
        }]
      },
      {
        "id": "EoC2",
        "description": "Analyses and applies the elements of the literary genre of poetry",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc2-poetry",
          "label": "Analyses poetry elements in prescribed texts; appreciates poetry's role in society; explores critical thinking and self-awareness",
          "topicAliases": ["Poetry", "POETRY", "Prescribed Poetry"],
          "unverifiedTopicAliases": [],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC3",
        "description": "Analyses and applies the elements of the literary genre of drama",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc3-drama",
          "label": "Analyses drama elements in prescribed texts; appreciates drama in everyday life; explores traditions, heritage and cultures",
          "topicAliases": ["Drama", "DRAMA", "Prescribed Drama", "Play"],
          "unverifiedTopicAliases": [],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC4",
        "description": "Analyses and applies elements of the literary genre of prose",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc4-prose",
          "label": "Analyses prose elements in prescribed texts; appreciates prose's national role; encourages creation of literary works",
          "topicAliases": ["Prose", "Novel", "Short Story", "Prescribed Prose"],
          "unverifiedTopicAliases": ["Fiction", "Non-fiction"],
          "taskTypeAliases": []
        }]
      }
    ],
    "testDesign": {
      "components": [
        {"type": "SBA", "code": "1025/1", "formLevel": "Form 2", "numItems": 8, "totalMarks": 100,
         "structureNotes": "SBA Form 2: 8 tasks/100 over 1 year. All 4 EoC. Semi-structured subjective tasks.",
         "bloomRange": ["remembering", "creating"]},
        {"type": "SBA", "code": "1025/1", "formLevel": "Form 3", "numItems": 7, "totalMarks": 100,
         "structureNotes": "SBA Form 3: 7 tasks/100. Combined SBA 200 (30%).",
         "bloomRange": ["remembering", "creating"]},
        {"type": "FINAL_EXAM", "code": "1025/2", "formLevel": "Form 4", "numItems": 5, "totalMarks": 100,
         "structureNotes": "Section A literary terms/history (20); Section B 4 extracts poetry+drama (40); Section C essays on 5 prescribed prose texts, answer 2×20 (40). Duration 2h45. 70%.",
         "bloomRange": ["remembering", "creating"]}
      ],
      "scenarioRequired": True,
      "minPartsPerScenarioItem": 2
    },
    "scoringCriteria": {"rules": [
      "SBA marked at school; Form 2+3 raw marks submitted to ECZ (30% of final).",
      "Section A: marks per task in brackets.",
      "Section B contextual items: concise responses; section total 40.",
      "Section C essays: 20 marks each; at least one Zambian-authored text among prescribed set.",
      "Candidates must complete SBA and Final Exam to be graded."
    ]},
    "exemplars": [{
      "eocId": "EoC2",
      "scenarioTheme": "Contextual poetry extract analysis: devices, meaning, societal role (Section B style)",
      "parts": [
        {"label": "(a)", "marks": 4, "bloomLevel": "understanding"},
        {"label": "(b)", "marks": 4, "bloomLevel": "analysing"},
        {"label": "(c)", "marks": 4, "bloomLevel": "evaluating"},
        {"label": "(d)", "marks": 4, "bloomLevel": "applying"},
        {"label": "(e)", "marks": 4, "bloomLevel": "creating"}
      ],
      "keyCompetences": ["critical_thinking", "analytical_thinking", "creativity_and_innovation"]
    }]
  },
  {
    "filename": "civic-education-3011.json",
    "subjectCode": "3011",
    "subjectName": "Civic Education",
    "syllabusYear": 2024,
    "construct": "Demonstrates understanding of social, economic and political development in fostering national development and upholding human dignity",
    "elementsOfConstruct": [
      {
        "id": "EoC1",
        "description": "Demonstrates patriotism and good citizenry",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc1-citizenship",
          "label": "Demonstrates principles of patriotism, promotes social justice and good governance in real life situations",
          "topicAliases": ["Citizenship", "Rights, Duties and Responsibilities", "Characteristics of Good and Bad Governance", "The Concept of Governance", "Zambia's Symbols of National Identity", "Political Party", "Political Party Systems"],
          "unverifiedTopicAliases": ["Factors that hinder good citizenship", "Special Groups", "Patriotism"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC2",
        "description": "Utilises resources to foster personal and national development",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc2-resources",
          "label": "Exhibit good planning skills and manages resources to foster personal, community and national development",
          "topicAliases": ["The concept Economic and Social Development", "Types of Business Units", "Spending", "The Concept of Risk Management", "Local Government in Zambia", "Central Government"],
          "unverifiedTopicAliases": ["Entrepreneurship", "Budgeting", "National Development"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC3",
        "description": "Resolves conflict and Collaborates with others in local, regional and international affairs to promote national development.",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc3-conflict",
          "label": "Resolves real life conflicts for a peaceful society; collaborates with local, regional and international stakeholders",
          "topicAliases": ["House of Chiefs", "Electoral Commission of Zambia (ECZ)", "Electoral Systems", "The Zambian Constitution", "Importance of Constitution"],
          "unverifiedTopicAliases": ["Conflict Resolution", "International Organisations", "Peace Building", "Elections"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC4",
        "description": "Exhibits principles, good morals and values in day to day life",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc4-values",
          "label": "Integrates cultural understanding and personal responsibility to promote integrity, combat corruption, foster self-control, strengthen family and legal relationships",
          "topicAliases": ["Zambia's Political Development"],
          "unverifiedTopicAliases": ["Corruption", "Integrity", "Family", "Human Rights", "Morals and Values"],
          "taskTypeAliases": []
        }]
      }
    ],
    "testDesign": {
      "components": [
        {"type": "SBA", "code": "3011/1", "formLevel": "Form 2", "numItems": 5, "totalMarks": 100,
         "structureNotes": "SBA Form 2: 5 tasks/100. All 4 EoC. Tests, debates, projects, presentations, role play. Project spans Form 2-3.",
         "bloomRange": ["understanding", "creating"]},
        {"type": "SBA", "code": "3011/1", "formLevel": "Form 3", "numItems": 5, "totalMarks": 100,
         "structureNotes": "SBA Form 3: 5 tasks/100. Combined SBA 200 (30%).",
         "bloomRange": ["understanding", "creating"]},
        {"type": "FINAL_EXAM", "code": "3011/2", "formLevel": "Form 4", "numItems": 6, "totalMarks": 100,
         "structureNotes": "Section A: EoC1+2 (2 items each, answer 1 per EoC). Section B: EoC3+4 (1 item each, all compulsory). Scenario-based. Duration 2h30. 70%.",
         "bloomRange": ["understanding", "evaluating"]}
      ],
      "scenarioRequired": True,
      "minPartsPerScenarioItem": 2
    },
    "scoringCriteria": {"rules": [
      "SBA marked out of 100 per year; raw marks submitted to ECZ.",
      "Final Exam: scenario-based items; more marks for analysis and evaluation.",
      "Candidates must analyse presented scenarios appropriately to score.",
      "Both SBA and Final Exam required for grading."
    ]},
    "exemplars": [{
      "eocId": "EoC1",
      "scenarioTheme": "Patriotism and good citizenship scenario with multi-part tasks (~15 marks chosen task style)",
      "parts": [
        {"label": "(a)", "marks": 6, "bloomLevel": "understanding"},
        {"label": "(b)", "marks": 4, "bloomLevel": "applying"},
        {"label": "(c)", "marks": 5, "bloomLevel": "evaluating"}
      ],
      "keyCompetences": ["critical_thinking", "collaboration", "problem_solving"]
    }]
  },
  {
    "filename": "history-3013.json",
    "subjectCode": "3013",
    "subjectName": "History",
    "syllabusYear": 2024,
    "construct": "Demonstrates understanding of how historical(past) events and current trends shape the future.",
    "elementsOfConstruct": [
      {
        "id": "EoC1",
        "description": "Demonstrates understanding of ideologies of Evolution and early civilisation",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc1-evolution",
          "label": "Evaluates understanding of Evolution and early civilisation; demonstrates society's core values, beliefs, morals and principles",
          "topicAliases": ["Views on the Origins of Man", "The Way of Life in Stone Age", "Stone Age Sites in Zambia", "Development of Iron Technology and Farming", "Early Bantu Settlement in Africa", "Bantu Migrations into Zambia"],
          "unverifiedTopicAliases": ["Evolution", "Early Civilisation", "Periods of Time"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC2",
        "description": "Appreciates historical sites and traditional practices",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc2-heritage",
          "label": "Assesses knowledge of Zambia's historical sites and cultural roots",
          "topicAliases": ["Importance of Heritage Sites", "Local History", "Sources of History", "Traditional"],
          "unverifiedTopicAliases": ["Historical Sites", "Cultural Practices", "Heritage"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC3",
        "description": "Exhibits good morals, principles and national values",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc3-values",
          "label": "Demonstrates core values, beliefs, morals and customs",
          "topicAliases": ["DecentralisedSocieties in PreColonial Zambia", "Centralised Societies in Pre-Colonial Zambia"],
          "unverifiedTopicAliases": ["National Values", "Customs", "Morals"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC4",
        "description": "Promotes national patriotism and citizenship through historical events while fostering collaboration with local, regional and international communities",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc4-patriotism",
          "label": "Engages communities in historical and patriotic activities to enhance good citizenry and collaborative understanding of national issues",
          "topicAliases": ["Development of Slavery and Slave Trade", "Europe and the benefits from Slave trade", "Slave Trade and Black Friday"],
          "unverifiedTopicAliases": ["Colonialism", "Independence", "Nationalism", "Patriotism"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC5",
        "description": "Analyses emerging global issues and their sustainability",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc5-global",
          "label": "Demonstrates understanding of contemporary issues and their effects to the environment",
          "topicAliases": [],
          "unverifiedTopicAliases": ["Globalisation", "Climate Change", "Contemporary Issues", "Sustainability", "International Relations"],
          "taskTypeAliases": [],
          "note": "Limited structured form1-4 topic coverage; provisional aliases pending syllabus cross-check."
        }]
      }
    ],
    "testDesign": {
      "components": [
        {"type": "SBA", "code": "3013/1", "formLevel": "Form 2", "numItems": 5, "totalMarks": 100,
         "structureNotes": "SBA Form 2: 5 tasks/100. All 5 EoC. Tests, debates, projects, presentations, role play.",
         "bloomRange": ["remembering", "creating"]},
        {"type": "SBA", "code": "3013/1", "formLevel": "Form 3", "numItems": 5, "totalMarks": 100,
         "structureNotes": "SBA Form 3: 5 tasks/100. Combined SBA 200 (30%).",
         "bloomRange": ["remembering", "creating"]},
        {"type": "FINAL_EXAM", "code": "3013/2", "formLevel": "Form 4", "numItems": 5, "totalMarks": 100,
         "structureNotes": "Section A: 3 compulsory items from EoC1-3 (20 each). Section B: 4 items from EoC4-5, answer 2 (20 each). Duration 2h30. 70%.",
         "bloomRange": ["remembering", "creating"]}
      ],
      "scenarioRequired": True,
      "minPartsPerScenarioItem": 2
    },
    "scoringCriteria": {"rules": [
      "SBA: 100 marks per form; raw marks to ECZ.",
      "Final Exam items typically 20 marks each based on real-life historical scenarios.",
      "Accept any other correct response where indicated in marking schemes.",
      "Both components required for grading."
    ]},
    "exemplars": [{
      "eocId": "EoC4",
      "scenarioTheme": "Community conflict resolution as city mayor linking historical citizenship/patriotism competences",
      "parts": [
        {"label": "(a)", "marks": 5, "bloomLevel": "understanding"},
        {"label": "(b)", "marks": 5, "bloomLevel": "analysing"},
        {"label": "(c)", "marks": 10, "bloomLevel": "evaluating"}
      ],
      "keyCompetences": ["critical_thinking", "collaboration", "problem_solving"]
    }]
  },
  {
    "filename": "mathematics-ii-2025.json",
    "subjectCode": "2025",
    "subjectName": "Mathematics II",
    "syllabusYear": 2025,
    "construct": "Demonstrates spatial reasoning, logical, critical and analytical thinking in solving real life problems.",
    "elementsOfConstruct": [
      {
        "id": "EoC1",
        "description": "Interprets and computes relationships of numbers within and across different number systems",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc1-numbers",
          "label": "Manipulate numbers using different properties to solve real life problems; creates patterns and puzzles of different types of numbers",
          "topicAliases": ["Numbers", "Real Numbers", "Classification of Numbers", "Combined Operations on Real Numbers", "Integers", "Indices", "Index Notation", "Approximations and Estimation"],
          "unverifiedTopicAliases": ["Number Systems", "Number Patterns"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC2",
        "description": "Models real life situations to solve problems and make informed decisions",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc2-algebra",
          "label": "Use algebra to express and solve real life problems",
          "topicAliases": ["Algebra", "Algebraic Expressions", "Basic Processes of Algebra", "Simultaneous Equations", "Quadratic Equations", "Quadratic Functions", "Linear Programming", "Relations", "Functions"],
          "unverifiedTopicAliases": ["Matrices", "Vectors"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC3",
        "description": "Computes measures and applies spatial relationships to solve real life problems",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc3-geometry",
          "label": "Applies measures and geometry in life contexts; derives theorems and formulae; obtains the value of pi practically",
          "topicAliases": ["Two Dimensional Shapes", "Three Dimensional Shapes", "Polygons", "Pythagoras Theorem", "Trigonometry", "Geometrical Constructions", "Loci in Two Dimensions", "Similar Figures", "Congruent Figures"],
          "unverifiedTopicAliases": ["Mensuration", "Pi"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC4",
        "description": "Interprets and computes functions to solve real life situations in order to make informed decisions",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc4-functions",
          "label": "Interprets functions, rates of change and summation of quantities in life contexts",
          "topicAliases": ["Functions", "Cartesian Plane", "Straight lines on the Cartesian Plane", "Distance-time Graphs", "Velocity-time Graphs"],
          "unverifiedTopicAliases": ["Rates of Change", "Calculus", "Summation"],
          "taskTypeAliases": []
        }]
      },
      {
        "id": "EoC5",
        "description": "Presents and analyses data to make informed decisions",
        "resolutionMode": "topic",
        "subSkills": [{
          "id": "eoc5-data",
          "label": "Presents and Interprets data in a variety of real-life contexts",
          "topicAliases": ["Statistics", "Statistical Presentations and Measures of central tendency", "Cumulative Frequency and Measures of Dispersion", "Probability", "Introduction to Probability"],
          "unverifiedTopicAliases": [],
          "taskTypeAliases": []
        }]
      }
    ],
    "testDesign": {
      "components": [
        {"type": "SBA", "code": "2025/1", "formLevel": "Form 2", "numItems": 6, "totalMarks": 100,
         "structureNotes": "SBA Form 2: 6 tasks/100. All 5 EoC. 12 tasks across Form 2+3 total.",
         "bloomRange": ["understanding", "creating"]},
        {"type": "SBA", "code": "2025/1", "formLevel": "Form 3", "numItems": 6, "totalMarks": 100,
         "structureNotes": "SBA Form 3: 6 tasks/100. Combined SBA 200 (30%).",
         "bloomRange": ["understanding", "creating"]},
        {"type": "FINAL_EXAM", "code": "2025/2", "formLevel": "Form 4", "numItems": 6, "totalMarks": 100,
         "structureNotes": "Section A: 2 compulsory; Section B: 4 items answer 3. Each item 20 marks (answer 5 of 6 = 100). All 5 EoC. Duration 2h30. 70%. (PDF summary table incorrectly shows 200 total marks; body text specifies 100.)",
         "bloomRange": ["understanding", "evaluating"]}
      ],
      "scenarioRequired": True,
      "minPartsPerScenarioItem": 3
    },
    "scoringCriteria": {"rules": [
      "Calculation items: method marks for stages + accuracy mark for correct final answer.",
      "Marks for correct diagrams/graphs and measurement accuracy.",
      "Projects/practicals scored per SBA Guidelines rubrics.",
      "Omission of essential working loses marks.",
      "Silent non-programmable scientific calculators allowed."
    ]},
    "exemplars": [{
      "eocId": "EoC1",
      "scenarioTheme": "Real-number relationships and patterns in a Zambian real-life numerical scenario (Maths II exemplar EoC1)",
      "parts": [
        {"label": "(a)", "marks": 5, "bloomLevel": "applying"},
        {"label": "(b)", "marks": 5, "bloomLevel": "analysing"},
        {"label": "(c)", "marks": 5, "bloomLevel": "applying"},
        {"label": "(d)", "marks": 5, "bloomLevel": "evaluating"}
      ],
      "keyCompetences": ["analytical_thinking", "problem_solving", "critical_thinking"]
    }]
  },
]


def main():
  OUT.mkdir(parents=True, exist_ok=True)
  for spec in SPECS:
    filename = spec.pop("filename")
    path = OUT / filename
    path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", path.name)


if __name__ == "__main__":
  main()
