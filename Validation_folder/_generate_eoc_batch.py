"""Generate EoC JSON specs for Physics, Chemistry, Biology, Geography from Validation_folder extracts."""
from __future__ import annotations

import json
from pathlib import Path

OUT = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\data\curriculum\ecz-eoc")

SPECS = [
    {
        "subjectCode": "4016",
        "subjectName": "Physics",
        "syllabusYear": 2024,
        "construct": "Applies Physics concepts and scientific skills in solving real life problems.",
        "filename": "physics-4016.json",
        "aliases": ["physics", "4016"],
        "elementsOfConstruct": [
            {
                "id": "EoC1",
                "description": "Classifies and applies Physical quantities and their measurements in handling of materials and objects",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc1-quantities",
                        "label": "Distinguishes basic/derived quantities, applies equilibrium, scalars/vectors, elementary astronomy and precise measurement",
                        "topicAliases": [
                            "Physical Quantities",
                            "Precision and Accuracy",
                            "Scalar and Vector Quantities",
                            "Equilibrium",
                            "The Universe",
                            "Structure and Composition of the Earth",
                            "Safety Rules (Laboratory Safety)",
                            "Apparatus in Physics",
                            "Fundamental Concepts of Physics",
                        ],
                        "unverifiedTopicAliases": [
                            "Waste Management",
                            "Application of Physics",
                            "Basic Principles of Scientific Investigations",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC2",
                "description": "Analyses and applies principles of mechanical systems to maximize the benefits of their performance of complex functions to enhance productivity",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc2-mechanics",
                        "label": "Applies mechanics concepts (motion, forces, energy, momentum, machines, pressure) to real-life problems",
                        "topicAliases": [
                            "Linear Motion",
                            "Forces",
                            "Circular Motion",
                            "Moment of a Force",
                            "Work, Energy, and Power",
                            "Linear Momentum",
                            "Simple Machines",
                            "Pressure",
                        ],
                        "unverifiedTopicAliases": [],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC3",
                "description": "Applies and interprets concepts of thermal properties of matter in order to predict material behaviour and design thermally efficient systems",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc3-thermal",
                        "label": "Applies kinetic theory, temperature, expansion, heat transfer and internal combustion concepts",
                        "topicAliases": [
                            "Simple Kinetic Theory of Matter",
                            "Measurement of Temperature",
                            "Expansion of Solids, Liquids and Gases",
                            "The Internal Combustion Engine",
                            "Heat Transfer",
                            "Measurement of Heat",
                        ],
                        "unverifiedTopicAliases": [],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC4",
                "description": "Interprets and applies properties of waves to predict natural phenomena and design appropriate technologies",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc4-waves",
                        "label": "Solves wave, sound, light, reflection/refraction and lens problems",
                        "topicAliases": [
                            "Longitudinal and Transverse Waves",
                            "Electromagnetic Spectrum",
                            "Sound",
                            "Light",
                            "Reflection of Light",
                            "Refraction of Light",
                            "Lenses",
                        ],
                        "unverifiedTopicAliases": [
                            "Rectilinear Propagation",
                            "Optical Instruments",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC5",
                "description": "Analyses and manipulates electric and magnetic properties of materials in order to design more reliable and efficient devices and machinery",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc5-em",
                        "label": "Applies static electricity, circuits, Ohm's law, magnetism and electrical energy transmission",
                        "topicAliases": [
                            "Static Electricity",
                            "Electric Circuits",
                            "Ohm's Law",
                            "Electrical Energy and Power",
                            "Magnetism",
                            "Electromagnetic Induction",
                            "Transformers",
                        ],
                        "unverifiedTopicAliases": [
                            "Electric Cells",
                            "Transmission of Electrical Energy",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC6",
                "description": "Applies electronic, communication, nuclear, and renewable energy principles to enhance connectivity, drive innovation, and support an environmentally safe and sustainable energy-efficient future",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc6-modern",
                        "label": "Applies electronics, nuclear physics, communication systems and renewable energy principles",
                        "topicAliases": [
                            "Electronics",
                            "Logic Gates",
                            "Capacitors",
                            "Nuclear Physics",
                            "Radioactivity",
                            "Renewable Energy",
                            "Communication Systems",
                        ],
                        "unverifiedTopicAliases": [
                            "Thermionic Emission",
                            "Electronic Waste",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
        ],
        "testDesign": {
            "components": [
                {
                    "type": "SBA",
                    "code": "4016/1",
                    "formLevel": "Form 2",
                    "numItems": 6,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 2: 6 tasks/100 marks over 1 year. All 6 EoC. Theory, practical, research/project. 30% overall with Form 3.",
                    "bloomRange": ["remembering", "creating"],
                },
                {
                    "type": "SBA",
                    "code": "4016/1",
                    "formLevel": "Form 3",
                    "numItems": 4,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 3: 3 tasks/50 + 1 research project/50. All 6 EoC. Combined Form 2+3 SBA = 200 marks (30%).",
                    "bloomRange": ["remembering", "creating"],
                },
                {
                    "type": "FINAL_EXAM",
                    "code": "4016/2",
                    "formLevel": "Form 4",
                    "numItems": 6,
                    "totalMarks": 80,
                    "structureNotes": "6 compulsory scenario items, one per EoC1-6. Marks: 10,14,14,14,14,14. Duration 2h30. 70% weighting.",
                    "bloomRange": ["remembering", "evaluating"],
                },
            ],
            "scenarioRequired": True,
            "minPartsPerScenarioItem": 2,
        },
        "scoringCriteria": {
            "rules": [
                "SBA: teachers develop scoring guides/rubrics per task; measure correctness plus scientific skills (observation, data interpretation, problem solving, communication, procedure use).",
                "Final Exam: ECZ-developed scoring guides outlining scientific skills, reasoning and expected knowledge.",
                "Show working steps, units and explanations on data-based questions.",
                "Diagrams must be large, neat, correctly labelled, drawn with sharp pencil; no shading/colouring unless instructed.",
                "Scientific terminology required; vague non-scientific statements do not earn full marks.",
                "Non-programmable calculators allowed; programmable calculators and phones forbidden.",
            ]
        },
        "exemplars": [
            {
                "eocId": "EoC1",
                "scenarioTheme": "Chemical plant liquid transport: classify base/derived quantities (mass, volume, density, temperature, thermal expansion); advise safe packaging/storage; calculate density",
                "parts": [
                    {"label": "(a)", "marks": 2, "bloomLevel": "understanding"},
                    {"label": "(b)", "marks": 4, "bloomLevel": "applying"},
                    {"label": "(c)", "marks": 2, "bloomLevel": "understanding"},
                    {"label": "(d)", "marks": 2, "bloomLevel": "applying"},
                ],
                "keyCompetences": ["analytical_thinking", "problem_solving"],
            }
        ],
    },
    {
        "subjectCode": "4014",
        "subjectName": "Chemistry",
        "syllabusYear": 2024,
        "construct": "Applies chemistry concepts and scientific skills in solving real life problems.",
        "filename": "chemistry-4014.json",
        "aliases": ["chemistry", "4014"],
        "elementsOfConstruct": [
            {
                "id": "EoC1",
                "description": "Classifies substances and interprets the physical and chemical changes of the substances for suitable application in life",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc1-classify",
                        "label": "Classifies substances by nature/properties and interprets physical and chemical changes",
                        "topicAliases": [
                            "Atomic Structure",
                            "Bonding and Structure",
                            "States of Matter",
                            "Acids, Bases, and Salts",
                            "Periodic table organization",
                            "Ionic bonding and ionic compounds",
                            "Covalent bonding and molecular compounds",
                            "Changes of state (melting, boiling, sublimation)",
                        ],
                        "unverifiedTopicAliases": [],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC2",
                "description": "Analyses and identifies chemical composition of substances for scientific decision making.",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc2-analysis",
                        "label": "Uses analytical procedures to identify chemical composition of solids, liquids or gases",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Titration and standardization",
                            "Oxidation and reduction concepts",
                            "pH scale and pH calculations",
                        ],
                        "note": "Skill-lens EoC focused on analytical identification methods; topic anchors provisional.",
                        "taskTypeAliases": [
                            "analysis",
                            "identification",
                            "qualitative analysis",
                            "titration",
                        ],
                    }
                ],
            },
            {
                "id": "EoC3",
                "description": "Evaluates industrial chemical processes and suggests alternative methods of production that are sustainable and environmentally safe",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc3-industrial",
                        "label": "Evaluates industrial process conditions and proposes sustainable alternatives",
                        "topicAliases": [
                            "Industrial Chemistry",
                            "Chemical Industry",
                        ],
                        "unverifiedTopicAliases": [
                            "Haber process",
                            "Contact process",
                            "Extraction of metals",
                            "Environmental chemistry",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC4",
                "description": "Applies Chemistry principles and mathematical operations to determine quantities of either reactants or products from quantitative (balanced) chemical equations in real-life situations or for solving problems",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc4-stoichiometry",
                        "label": "Applies stoichiometric ratios and mole calculations from balanced equations",
                        "topicAliases": [
                            "Stoichiometry and Calculations",
                            "Molar mass and mole concept",
                            "Balancing chemical equations",
                            "Mole calculations in chemical reactions",
                            "Limiting reagents",
                            "Percentage composition and empirical formulas",
                            "Yield calculations",
                        ],
                        "unverifiedTopicAliases": [],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC5",
                "description": "Investigates quantities involving industrial processes",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc5-yields",
                        "label": "Determines theoretical yields and develops more efficient ways of increasing yields",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Yield calculations",
                            "Industrial Chemistry",
                        ],
                        "note": "Skill-lens EoC on industrial yield investigation; content often overlaps EoC3/4.",
                        "taskTypeAliases": [
                            "yield investigation",
                            "industrial yield",
                            "process efficiency",
                        ],
                    }
                ],
            },
            {
                "id": "EoC6",
                "description": "Applies Chemistry principles in everyday life",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc6-everyday",
                        "label": "Designs solutions, products and services using chemistry knowledge for real-life situations",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Acids, Bases, and Salts",
                            "Buffers and buffer solutions",
                            "Oxidation and reduction concepts",
                        ],
                        "note": "Broad applied-chemistry EoC; provisional topic anchors.",
                        "taskTypeAliases": [
                            "everyday application",
                            "product design",
                            "real-life chemistry",
                        ],
                    }
                ],
            },
        ],
        "testDesign": {
            "components": [
                {
                    "type": "SBA",
                    "code": "4014/1",
                    "formLevel": "Form 2",
                    "numItems": 6,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 2: 6 tasks/100 marks. All 6 EoC. Tests, assignments, practical, research.",
                    "bloomRange": ["remembering", "creating"],
                },
                {
                    "type": "SBA",
                    "code": "4014/1",
                    "formLevel": "Form 3",
                    "numItems": 4,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 3: 3 tasks/50 + 1 research project/50. All 6 EoC. Combined SBA 200 marks (30%).",
                    "bloomRange": ["remembering", "creating"],
                },
                {
                    "type": "FINAL_EXAM",
                    "code": "4014/2",
                    "formLevel": "Form 4",
                    "numItems": 6,
                    "totalMarks": 80,
                    "structureNotes": "6 compulsory scenario items, one per EoC1-6. Marks: 13,13,13,14,13,14. Duration 2h30. 70%.",
                    "bloomRange": ["remembering", "evaluating"],
                },
            ],
            "scenarioRequired": True,
            "minPartsPerScenarioItem": 2,
        },
        "scoringCriteria": {
            "rules": [
                "SBA: teachers develop scoring guides/rubrics per task aligned to syllabus competences.",
                "Final Exam: ECZ-developed scoring guides for examiners.",
                "Semi-structured items may require words, numbers, symbols, phrases, definitions, comparisons and calculations.",
                "Open-ended responses must be complete sentences/paragraphs presented logically.",
                "Where working is required, correct numerical answers without working earn no marks.",
            ]
        },
        "exemplars": [
            {
                "eocId": "EoC1",
                "scenarioTheme": "Classifying substances and interpreting physical/chemical changes for suitable real-life application (per ECZ Chemistry exemplar EoC1)",
                "parts": [
                    {"label": "(a)", "marks": 5, "bloomLevel": "understanding"},
                    {"label": "(b)", "marks": 8, "bloomLevel": "analysing"},
                ],
                "keyCompetences": ["analytical_thinking", "problem_solving"],
            }
        ],
    },
    {
        "subjectCode": "4012",
        "subjectName": "Biology",
        "syllabusYear": 2024,
        "construct": "Applies biological principles to real world situations to understand and solve challenges affecting living organisms.",
        "filename": "biology-4012.json",
        "aliases": ["biology", "4012"],
        "elementsOfConstruct": [
            {
                "id": "EoC1",
                "description": "Analyses Systems of Classifying Organisms and Substances",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc1-classification",
                        "label": "Examines classification systems, identifies features used, evaluates importance of classifying organisms and substances",
                        "topicAliases": [
                            "Characteristics of Living Things",
                            "Levels of Biological Organisation",
                            "Basic Cell Structure",
                            "Types of Cells",
                            "Cell Specialisation",
                            "Nature of Biology",
                        ],
                        "unverifiedTopicAliases": [
                            "Classification of Organisms",
                            "Taxonomy",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC2",
                "description": "Investigates and Explains Biological Functions",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc2-functions",
                        "label": "Investigates how living things function and interact; analyses causes and effects of biological events",
                        "topicAliases": [
                            "Nutrition in Man",
                            "Plant Nutrients",
                            "Nutritional Deficiency Diseases and Disorders",
                            "Reproduction in Living Organisms",
                            "Reproduction and Development in Human Beings",
                            "Coordination and Response in Plants",
                            "Coordination and Response in Animals",
                            "Transport in Plants",
                            "Autotrophic Nutrition",
                            "Heterotrophic Nutrition",
                        ],
                        "unverifiedTopicAliases": [
                            "Photosynthesis",
                            "Respiration",
                            "Excretion",
                            "Circulation",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC3",
                "description": "Interprets and Explains Scientific Evidence",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc3-evidence",
                        "label": "Analyses data, interprets findings with scientific reasoning, evaluates evidence to support or reject ideas",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Experimental Design",
                            "Nature of Science Inquiry in Biology",
                            "Micrographs",
                            "Ecosystem",
                        ],
                        "note": "Skill-lens EoC on evidence interpretation; not a topic bucket.",
                        "taskTypeAliases": [
                            "data analysis",
                            "evidence evaluation",
                            "scientific reasoning",
                            "interpretation",
                        ],
                    }
                ],
            },
            {
                "id": "EoC4",
                "description": "Applies Scientific Skills to Real-life Situations",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc4-skills",
                        "label": "Uses scientific methods and practical skills to solve everyday problems and make informed decisions",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Experimental Design",
                            "Waste Management",
                            "The Soil - Composition and Fertility",
                            "Biotic and Abiotic Interactions",
                        ],
                        "note": "Skill-lens applied biology EoC.",
                        "taskTypeAliases": [
                            "investigation",
                            "practical skills",
                            "problem solving",
                            "scientific method",
                        ],
                    }
                ],
            },
            {
                "id": "EoC5",
                "description": "Demonstrates biological principles in real life situations",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc5-real-life",
                        "label": "Applies biological knowledge to everyday experiences and practical daily-life problems",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Ecosystem",
                            "Waste Management",
                            "Nutritional Deficiency Diseases and Disorders",
                        ],
                        "note": "SBA-emphasis EoC; Final Exam covers EoC1-4 only (EoC5 excluded from Form 4 paper).",
                        "taskTypeAliases": [
                            "everyday biology",
                            "real-life application",
                            "general practical",
                        ],
                    }
                ],
            },
        ],
        "testDesign": {
            "components": [
                {
                    "type": "SBA",
                    "code": "4012/1",
                    "formLevel": "Form 2",
                    "numItems": 5,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 2: 5 tasks/100 marks. All 5 EoC. Semi-structured and essay.",
                    "bloomRange": ["understanding", "creating"],
                },
                {
                    "type": "SBA",
                    "code": "4012/1",
                    "formLevel": "Form 3",
                    "numItems": 6,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 3: 6 tasks/100 including compulsory research project (50 marks, Terms 1-2). All 5 EoC.",
                    "bloomRange": ["understanding", "creating"],
                },
                {
                    "type": "FINAL_EXAM",
                    "code": "4012/2",
                    "formLevel": "Form 4",
                    "numItems": 4,
                    "totalMarks": 70,
                    "structureNotes": "4 compulsory scenario items on EoC1-4 only (EoC5 excluded). Marks: 10,20,20,20. Duration 1h30. 70% weighting.",
                    "bloomRange": ["understanding", "evaluating"],
                },
            ],
            "scenarioRequired": True,
            "minPartsPerScenarioItem": 2,
        },
        "scoringCriteria": {
            "rules": [
                "SBA: teachers develop scoring guides/rubrics; include experimental skills (follow instructions, observe, record, draw, infer, apply principles).",
                "Final Exam: ECZ scoring guides; semi-structured and essay items from scenarios.",
                "Unfamiliar materials may appear; candidates must apply scientific principles.",
                "Diagrams and observations scored for accuracy and labelling where required.",
            ]
        },
        "exemplars": [
            {
                "eocId": "EoC1",
                "scenarioTheme": "Classification of organisms/substances from scenario features; evaluate importance of classification systems",
                "parts": [
                    {"label": "(a)", "marks": 5, "bloomLevel": "understanding"},
                    {"label": "(b)", "marks": 5, "bloomLevel": "evaluating"},
                ],
                "keyCompetences": ["analytical_thinking", "critical_thinking"],
            }
        ],
    },
    {
        "subjectCode": "3014",
        "subjectName": "Geography",
        "syllabusYear": 2024,
        "construct": "Analyses spatial patterns, human-environmental interactions and applies geographical tools and techniques to interpret information and promote sustainable use of environmental resources.",
        "filename": "geography-3014.json",
        "aliases": ["geography", "3014"],
        "elementsOfConstruct": [
            {
                "id": "EoC1",
                "description": "Applies map reading skills to understand spatial relationships in real life",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc1-maps",
                        "label": "Interprets maps for geographical relations such as time and angle of elevation to navigate the physical world",
                        "topicAliases": [
                            "Maps and Diagrams",
                            "Map Symbols",
                            "Map Reading and Interpretation",
                            "Relief",
                            "Drainage Features",
                            "Land Use",
                            "Direction and Orientation",
                            "Measurement of Distance and Area",
                        ],
                        "unverifiedTopicAliases": [],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC2",
                "description": "Demonstrates understanding of earth's natural processes and their effects",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc2-earth",
                        "label": "Understands earth's natural processes and effects; identifies mitigation and adaptation strategies",
                        "topicAliases": [
                            "The Earth in the Solar System",
                            "Shape and Size of the Earth",
                            "Weather and Climate",
                            "Climate Change",
                            "Mitigation and Adaptation to Climate Change",
                            "The Earth's Atmosphere",
                        ],
                        "unverifiedTopicAliases": [
                            "Earth's Graticule",
                            "Movements of the Earth",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC3",
                "description": "Understands demographic dynamics and its relationship with the environment and humanity in order to identify strategies for sustainable development",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc3-population",
                        "label": "Understands population dynamics and connectivity to nature for sustainable development strategies",
                        "topicAliases": [
                            "Population Composition",
                            "Population Distribution in Zambia",
                            "Rapid Population Growth in Zambia",
                            "Migration",
                            "Settlements",
                            "Location of Settlements",
                            "Challenges in Settlements",
                            "Urbanisation",
                        ],
                        "unverifiedTopicAliases": [],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC4",
                "description": "Demonstrates understanding of resource utilisation and sustainability",
                "resolutionMode": "topic",
                "subSkills": [
                    {
                        "id": "eoc4-resources",
                        "label": "Understands natural resource use and applies sustainable practices for economic and social benefit",
                        "topicAliases": [
                            "Natural Resources",
                            "Population and Natural Resources",
                            "Sustainable Management of Natural",
                        ],
                        "unverifiedTopicAliases": [
                            "Resource Management",
                            "Economic Geography",
                        ],
                        "taskTypeAliases": [],
                    }
                ],
            },
            {
                "id": "EoC5",
                "description": "Conducts geographical inquiry using appropriate research methods",
                "resolutionMode": "taskType",
                "subSkills": [
                    {
                        "id": "eoc5-inquiry",
                        "label": "Carries out geographical inquiry and investigates human impact on the environment",
                        "topicAliases": [],
                        "unverifiedTopicAliases": [
                            "Fieldwork",
                            "Planning and Preparing for Field Work",
                            "Data Collection/ Fieldwork",
                            "Data processing",
                        ],
                        "note": "SBA-emphasis inquiry EoC; Final Exam covers EoC1-4 (sections A-D), EoC5 mainly SBA fieldwork/projects.",
                        "taskTypeAliases": [
                            "fieldwork",
                            "field project",
                            "case study",
                            "geographical inquiry",
                            "research",
                        ],
                    }
                ],
            },
        ],
        "testDesign": {
            "components": [
                {
                    "type": "SBA",
                    "code": "3014/1",
                    "formLevel": "Form 2",
                    "numItems": 5,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 2: 5 tasks/100. All 5 EoC. Assignments, field trips/case study, quizzes, discussions, tests.",
                    "bloomRange": ["understanding", "creating"],
                },
                {
                    "type": "SBA",
                    "code": "3014/1",
                    "formLevel": "Form 3",
                    "numItems": 5,
                    "totalMarks": 100,
                    "structureNotes": "SBA Form 3: 5 tasks/100. All 5 EoC. Combined SBA 200 marks (30%).",
                    "bloomRange": ["understanding", "creating"],
                },
                {
                    "type": "FINAL_EXAM",
                    "code": "3014/2",
                    "formLevel": "Form 4",
                    "numItems": 8,
                    "totalMarks": 100,
                    "structureNotes": "4 sections A-D (EoC1-4), 2 items each (8 total); candidates choose 1 per section (4 answered). Duration 2h. 70%. EoC5 SBA-focused.",
                    "bloomRange": ["understanding", "evaluating"],
                },
            ],
            "scenarioRequired": True,
            "minPartsPerScenarioItem": 2,
        },
        "scoringCriteria": {
            "rules": [
                "SBA: teacher-developed scoring tools for assignments, fieldwork, quizzes, presentations and tests.",
                "Final Exam: ECZ scoring; each chosen item based on its section EoC scenario/stimulus.",
                "Map-reading items require accurate use of scale, symbols, direction and measurement.",
                "Fieldwork/report tasks scored on research procedure and report structure.",
            ]
        },
        "exemplars": [
            {
                "eocId": "EoC1",
                "scenarioTheme": "Map reading literacy and spatial relationships in a real-life navigation/land-use scenario",
                "parts": [
                    {"label": "(a)", "marks": 10, "bloomLevel": "understanding"},
                    {"label": "(b)", "marks": 15, "bloomLevel": "applying"},
                ],
                "keyCompetences": ["analytical_thinking", "problem_solving"],
            }
        ],
    },
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in SPECS:
        filename = spec.pop("filename")
        aliases = spec.pop("aliases")
        path = OUT / filename
        path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", path.name, "aliases", aliases)


if __name__ == "__main__":
    main()
