// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

import { GoogleGenAI, Type } from "@google/genai";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    HeadingLevel,
    AlignmentType,
    Numbering,
    VerticalAlign,
    convertInchesToTwip,
    LevelFormat,
} from 'docx';
import saveAs from 'file-saver';


// --- DOM ELEMENTS ---
const loginPage = document.getElementById('login-page');
const appPage = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const controlPanel = document.getElementById('control-panel');
const generateBtn = document.getElementById('generate-btn');
const generateBtnContent = document.getElementById('generate-btn-content');

const outputContainer = document.getElementById('output-container');
const loader = document.getElementById('loader');
const outputError = document.getElementById('output-error');
const initialState = document.getElementById('initial-state');
const contentArea = document.getElementById('content-area');

const loginLogoContainer = document.getElementById('login-logo-container');
const headerLogoContainer = document.getElementById('header-logo-container');


// --- STATE ---
let isLoading = false;
let practicalPaper = null;
let cuttingList = null;
let checklist = null;

// --- ICONS & LOGOS ---
const tvetCdaccLogoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="h-full w-full">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color: #FBBF24; stop-opacity: 1" />
        <stop offset="100%" style="stop-color: #F97316; stop-opacity: 1" />
      </linearGradient>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color: #3B82F6; stop-opacity: 1" />
        <stop offset="100%" style="stop-color: #2563EB; stop-opacity: 1" />
      </linearGradient>
    </defs>
    <path d="M100,10 a90,90 0 1,0 0,180 a90,90 0 1,0 0,-180" fill="url(#grad2)"/>
    <path d="M100,15 a85,85 0 1,0 0,170 a85,85 0 1,0 0,-170" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M20,100 C20,144.18 55.82,180 100,180 C144.18,180 180,144.18 180,100" fill="none" stroke="url(#grad1)" stroke-width="10" stroke-linecap="round"/>
    <g transform="translate(100, 95) scale(0.6)">
      <path d="M 0,-60 L 50, -30 L 50,30 L 0,60 L -50,30 L -50,-30 Z" fill="#FFFFFF"/>
      <path d="M 0,-50 L 40,-25 V 25 L 0,50 L -40,25 V -25 Z" fill="url(#grad2)"/>
      <path d="M -30,-5 L 30,-5 Q 35,0 30,5 L -30,5 Q -35,0 -30,-5 Z" fill="#FFFFFF"/>
      <path d="M-20 -15 h40 v-5 h-40z M-20 -25 h40 v-5 h-40z" fill="#FFFFFF"/>
      <circle cx="0" cy="25" r="10" fill="url(#grad1)" />
    </g>
    <text x="100" y="165" font-family="Arial, sans-serif" font-size="10" fill="#FFFFFF" text-anchor="middle" font-weight="bold">for competence certification</text>
    <text x="100" y="55" font-family="Arial, sans-serif" font-size="12" fill="#FBBF24" text-anchor="middle" font-weight="bold">TVET/CDACC</text>
  </svg>
`;

loginLogoContainer.innerHTML = tvetCdaccLogoSvg;
headerLogoContainer.innerHTML = tvetCdaccLogoSvg;


// --- AUTHENTICATION ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username === 'admin' && password === 'admin@2025#') {
        loginPage.classList.add('hidden');
        appPage.classList.remove('hidden');
    } else {
        loginError.textContent = 'Invalid username or password. Please try again.';
        loginError.classList.remove('hidden');
    }
});

usernameInput.addEventListener('input', () => loginError.classList.add('hidden'));
passwordInput.addEventListener('input', () => loginError.classList.add('hidden'));


// --- UI UPDATE FUNCTIONS ---
const setLoading = (loading) => {
    isLoading = loading;
    const cuttingListBtn = document.querySelector('[data-action="generate-cutting-list"]');
    const checklistBtn = document.querySelector('[data-action="generate-checklist"]');

    if (isLoading) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        generateBtn.disabled = true;
        generateBtnContent.textContent = 'Generating...';
        if (cuttingListBtn) cuttingListBtn.disabled = true;
        if (checklistBtn) checklistBtn.disabled = true;
    } else {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        generateBtn.disabled = false;
        generateBtnContent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 mr-2 inline-block"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.455-2.455L12.45 18l1.197-.398a3.375 3.375 0 002.455-2.455L16.5 14.25l.398 1.197a3.375 3.375 0 002.455 2.455l1.197.398-1.197.398a3.375 3.375 0 00-2.455 2.455z"></path></svg> Generate Practical Paper`;
        if (cuttingListBtn) cuttingListBtn.disabled = false;
        if (checklistBtn) checklistBtn.disabled = false;
    }
};

const setError = (message) => {
    if (message) {
        outputError.innerHTML = `<p class="font-bold">Error:</p><p>${message}</p>`;
        outputError.classList.remove('hidden');
    } else {
        outputError.classList.add('hidden');
    }
};

const clearOutput = () => {
    contentArea.innerHTML = '';
    initialState.classList.remove('hidden');
    setError(null);
};


// --- GEMINI API SERVICE ---

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const systemInstruction = `You are an expert in curriculum design and technical assessment for vocational and technical institutions, specifically emulating the style of TVET CDACC (Technical and Vocational Education and Training Curriculum Development, Assessment and Certification Council) documents.
Your task is to generate high-quality assessment tools based on the user's request.
The output must be structured like a formal practical assessment paper.
The content must be highly relevant to the specified technical subject and module. The language should be formal and precise.
For tasks involving role-playing, as in hospitality or customer service scenarios, use the 'rolePlay' object. For direct, hands-on tasks like in carpentry or electrical work, the 'rolePlay' object can be omitted.`;

const getKnqfInstruction = (level) => {
  return `
    **CRITICAL INSTRUCTION: Adhere to Kenya National Qualifications Framework (KNQF) Level ${level}.**
    All generated content, including language complexity, task definition, and evaluation criteria, MUST strictly align with the specified KNQF level.
    - **If Level 3:** Language: Simple, direct English. Use basic verbs: list, name, identify, describe. Tasks: Straightforward, procedural, with clear step-by-step instructions. No ambiguity.
    - **If Level 4:** Language: Slightly more detailed English. Use verbs requiring some thought: explain, sketch, select, connect, demonstrate. Tasks: May involve guided reasoning or basic diagnostics. The candidate might have to select the right tool or sequence.
    - **If Level 5:** Language: Moderately technical. Use verbs for problem-solving: troubleshoot, justify, compare, differentiate, repair. Tasks: Require diagnosis of faults and application of principles to solve problems.
    - **If Level 6:** Language: Technical and analytical. Use verbs for higher-order thinking: design, evaluate, interpret, optimize, plan. Tasks: Involve autonomy, complex problem-solving, design, planning, and evaluation of outcomes.
    You are generating for **Level ${level}**. Ensure your entire output reflects this level of competence.
  `;
}

const schemas = {
  CANDIDATE_PRACTICAL_PAPER: {
    type: Type.OBJECT,
    properties: {
      courseTitle: { type: Type.STRING }, paperTitle: { type: Type.STRING }, paperCode: { type: Type.STRING }, assessmentDate: { type: Type.STRING },
      candidateInstructions: { type: Type.ARRAY, items: { type: Type.STRING } },
      resourcesRequired: {
          type: Type.OBJECT, nullable: true,
          properties: { toolsAndEquipment: { type: Type.ARRAY, items: { type: Type.STRING } }, materials: { type: Type.ARRAY, items: { type: Type.STRING } } }
      },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sectionTitle: { type: Type.STRING }, duration: { type: Type.STRING, nullable: true },
            elementsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
            tasks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        rolePlay: { type: Type.OBJECT, nullable: true, properties: { title: { type: Type.STRING }, scenario: { type: Type.STRING } }, required: ['title', 'scenario'] },
                        subTasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }, required: ['title', 'subTasks']
                }
            }
          }, required: ['sectionTitle', 'elementsCovered', 'tasks'],
        },
      },
    }, required: ['courseTitle', 'paperTitle', 'paperCode', 'assessmentDate', 'candidateInstructions', 'sections'],
  },
  CUTTING_LIST: {
    type: Type.OBJECT, properties: { title: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { item: { type: Type.STRING }, quantity: { type: Type.STRING }, providedBy: { type: Type.STRING } }, required: ['item', 'quantity', 'providedBy'] } } }, required: ['title', 'items']
  },
  CHECKLIST: {
    type: Type.OBJECT, properties: {
        courseTitle: { type: Type.STRING }, paperTitle: { type: Type.STRING }, paperCode: { type: Type.STRING }, assessmentDate: { type: Type.STRING },
        assessorInstructions: { type: Type.ARRAY, items: { type: Type.STRING } }, projectBrief: { type: Type.STRING },
        sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
            sectionTitle: { type: Type.STRING }, elementsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
            tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
            checklistItems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                itemNumber: { type: Type.STRING }, evaluationItem: { type: Type.STRING }, subItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                markingGuide: { type: Type.STRING, nullable: true }, maxMarks: { type: Type.NUMBER },
            }, required: ['itemNumber', 'evaluationItem', 'subItems', 'maxMarks']}},
            totalMarks: { type: Type.NUMBER }, notes: { type: Type.STRING, nullable: true }
        }, required: ['sectionTitle', 'elementsCovered', 'tasks', 'checklistItems', 'totalMarks']}},
        oralAssessment: { type: Type.OBJECT, nullable: true, properties: {
            title: { type: Type.STRING }, totalMarks: { type: Type.NUMBER },
            items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                questionNumber: { type: Type.STRING }, question: { type: Type.STRING }, expectedAnswer: { type: Type.STRING }, maxMarks: { type: Type.NUMBER }
            }, required: ['questionNumber', 'question', 'expectedAnswer', 'maxMarks']}}
        }, required: ['title', 'items', 'totalMarks']},
        summary: { type: Type.OBJECT, properties: {
            practicalTotal: { type: Type.NUMBER }, oralTotal: { type: Type.NUMBER, nullable: true }, overallTotal: { type: Type.NUMBER }, outcomeNote: { type: Type.STRING }
        }, required: ['practicalTotal', 'overallTotal', 'outcomeNote']}
    }, required: ['courseTitle', 'paperTitle', 'paperCode', 'assessmentDate', 'assessorInstructions', 'projectBrief', 'sections', 'summary']
  },
};

const callApi = async (prompt, schema) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            systemInstruction: systemInstruction
        },
    });
    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("The AI returned a response that was not valid JSON.");
    }
};

const generatePracticalPaper = async (courseTitle, module, paperName, curriculumElements, paperDescription, knqfLevel) => {
    const knqfInstruction = getKnqfInstruction(knqfLevel);
    let electricalInstruction = '';
    if (courseTitle.toLowerCase().includes('electrical')) {
        electricalInstruction = `
      **CRITICAL INSTRUCTION FOR ELECTRICAL COURSES (Based on best-practice example):**
      This is an electrical installation paper. It is MANDATORY to structure it like a real-world practical exam, including a task where the candidate draws a WIRING diagram from a LAYOUT diagram description.

      **Follow this structure:**
      1.  **Multiple Sections:** Break the assessment into at least two or three sections.
      2.  **The Main Installation Task:** Create a final, comprehensive section that MUST contain the following sequence of sub-tasks:
          a. **Describe the LAYOUT Diagram:** Provide a clear, textual description of a circuit's physical layout.
          b. **Define the Circuit Logic:** State how the circuit must function.
          c. **Instruct to Draw WIRING Diagram:** Add a sub-task for the candidate to draw the wiring diagram.
          d. **Instruct for Physical Installation:** Add a sub-task for the hands-on installation.
          e. **Instruct for Testing:** Add a sub-task to perform standard tests.
      This multi-step, integrated task is non-negotiable for an electrical installation paper.
      `;
    }

    const userStructureInstruction = paperDescription
      ? `
        **CRITICAL: User has provided specific instructions on how to structure the paper. You MUST follow these instructions closely.**
        ---
        USER'S PAPER STRUCTURE DESCRIPTION:
        ${paperDescription}
        ---
      `
      : '';

    const prompt = `
      ${knqfInstruction}
      ${userStructureInstruction}
      ${electricalInstruction}
      Your task is to generate a "Candidate Practical Paper" emulating the formal style of a TVET CDACC assessment document.
      Generate it with the following details:
      Course Title: "${courseTitle}"
      Module Code/Info (use for generating paper code): "${module}"
      Paper Name (use this for 'paperTitle' in the JSON): "${paperName}"
      Curriculum Elements to be Assessed:
      ---
      ${curriculumElements}
      ---
      Based on these inputs, create a complete practical paper. Adhere strictly to the KNQF level and any special instructions. The 'paperTitle' and 'courseTitle' in the JSON must match the inputs exactly. Invent a plausible 'paperCode' and 'assessmentDate'.
    `;
      
    return await callApi(prompt, schemas.CANDIDATE_PRACTICAL_PAPER);
};

const generateCuttingList = async (paper, knqfLevel) => {
    const knqfInstruction = getKnqfInstruction(knqfLevel);
    const prompt = `
    ${knqfInstruction}
    Based on the practical assessment paper provided (designed for KNQF Level ${knqfLevel}), generate a comprehensive "Cutting List". This is a generic term for all resources required. Analyze all tasks to compile a complete list of items, quantity, and who provides it ('Centre' or 'Candidate').
    Here is the source Practical Assessment Paper document:
    ${JSON.stringify(paper, null, 2)}`;
    return await callApi(prompt, schemas.CUTTING_LIST);
};

const generateChecklist = async (paper, knqfLevel) => {
    const knqfInstruction = getKnqfInstruction(knqfLevel);
    let electricalChecklistInstruction = '';
    if (paper.courseTitle.toLowerCase().includes('electrical')) {
        electricalChecklistInstruction = `
      **CRITICAL INSTRUCTION FOR ELECTRICAL CHECKLIST:**
      The source paper includes a multi-part task (describe, draw, install, test). Your checklist MUST thoroughly evaluate this entire process with detailed checklist items for the diagram, installation, and tests.
      `;
    }

    const prompt = `
    ${knqfInstruction}
    ${electricalChecklistInstruction}
    Based on the provided "Candidate Practical Paper" JSON (designed for KNQF Level ${knqfLevel}), generate a complete "Marking Scheme and Observation Checklist".
    **Instructions:**
    1.  **Header & Instructions:** Replicate header details and generate assessor instructions.
    2.  **Project Brief:** Write a concise brief.
    3.  **Checklist Sections:** For each source section, create a corresponding checklist section with title, elements, tasks, and detailed 'checklistItems'. Break down complex tasks into 'evaluationItem' with 'subItems'.
    4.  **Marking:** Assign 'maxMarks' for each item, NOT exceeding 7 per item. Break down complex tasks to stay under this limit.
    5.  **Oral Assessment:** If implied, create an 'oralAssessment' section with diverse questions. The total marks for this section MUST be greater than 30. Weight marks based on complexity (1-5).
    6.  **Summary:** Create a final summary table with practical, oral (if any), and overall totals.
    The entire output must be a single, valid JSON object conforming to the schema.
    **Source Candidate Practical Paper:**
    ${JSON.stringify(paper, null, 2)}`;
    return await callApi(prompt, schemas.CHECKLIST);
};


// --- DOCX EXPORT SERVICE ---

const FONT_FAMILY = "Calibri";
const PURPLE_COLOR = "4c1d95";
const ALL_BORDERS = { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } };
const createNumbering = () => ({
    config: [
        { reference: "ordered-list", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } }] },
        { reference: "bullet-list", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } }] },
        { reference: "sub-bullet-list", levels: [{ level: 0, format: LevelFormat.BULLET, text: "o", style: { paragraph: { indent: { left: convertInchesToTwip(0.75), hanging: convertInchesToTwip(0.25) } } } }] },
    ],
});
const createDocHeader = (paper) => new Paragraph({ children: [ new TextRun({ text: paper.courseTitle.toUpperCase(), bold: true }), new TextRun({ text: `\n${paper.paperCode}`, break: 1 }), new TextRun({ text: `\n${paper.paperTitle}`, break: 1, bold: true }), new TextRun({ text: `\n${paper.assessmentDate}`, break: 1 })], style: "header", spacing: { after: 200 } });
const createDocTitle = (title) => new Paragraph({ text: title.toUpperCase(), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 300 } });
const createSubheading = (text) => new Paragraph({ text: text, heading: HeadingLevel.HEADING_3, style: "subheading", spacing: { after: 200, before: 300 } });
const sanitizeFilename = (filename) => filename.replace(/[\/\\?%*:|"<>]/g, '-');
const STYLES = { paragraphStyles: [ { id: "header", name: "Header", run: { size: 20, fontFamily: FONT_FAMILY } }, { id: "subheading", name: "Subheading", run: { size: 24, bold: true, color: PURPLE_COLOR, fontFamily: FONT_FAMILY } } ] };
const createBaseDocument = (children) => new Document({ numbering: createNumbering(), styles: STYLES, sections: [{ children: children }] });

const exportPracticalPaperToDocx = async (paper) => {
    const children = [ createDocHeader(paper), createDocTitle("Practical Assessment"), createSubheading("INSTRUCTIONS TO THE CANDIDATE:"), ...paper.candidateInstructions.map(instr => new Paragraph({ text: instr, numbering: { reference: "ordered-list", level: 0 } })) ];
    if (paper.resourcesRequired) {
        children.push(createSubheading("RESOURCES REQUIRED:"));
        children.push(new Paragraph({ text: "Tools and Equipment:", run: { bold: true }, spacing: { before: 200 } }));
        children.push(...paper.resourcesRequired.toolsAndEquipment.map(item => new Paragraph({ text: item, numbering: { reference: "bullet-list", level: 0 } })));
        children.push(new Paragraph({ text: "Materials:", run: { bold: true }, spacing: { before: 200 } }));
        children.push(...paper.resourcesRequired.materials.map(item => new Paragraph({ text: item, numbering: { reference: "bullet-list", level: 0 } })));
    }
    paper.sections.forEach((section, index) => {
        children.push(new Paragraph({ text: `${index + 1}. ${section.sectionTitle.toUpperCase()}`, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        children.push(new Paragraph({ text: "Elements Covered", run: { bold: true }, spacing: { before: 200 } }));
        children.push(...section.elementsCovered.map(el => new Paragraph({ text: el, numbering: { reference: "bullet-list", level: 0 } })));
        children.push(new Paragraph({ text: "Tasks", run: { bold: true }, spacing: { before: 200 } }));
        section.tasks.forEach(task => {
            children.push(new Paragraph({ text: task.title, run: { bold: true }, spacing: { before: 150 } }));
            if (task.rolePlay) children.push(new Paragraph({ children: [new TextRun({ text: task.rolePlay.title, bold: true }), new TextRun({ text: `\n${task.rolePlay.scenario}`, break: 1, italics: true })], style: "IntenseQuote" }));
            if (task.subTasks && task.subTasks.length > 0) children.push(...task.subTasks.map(st => new Paragraph({ text: st, numbering: { reference: "ordered-list", level: 0 } })));
        });
    });
    const doc = createBaseDocument(children);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${sanitizeFilename(paper.paperCode)}-Practical-Paper.docx`);
};

const exportCuttingListToDocx = async (list, paper) => {
    const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [ new TableRow({ children: ["Item", "Qty", "Provided by"].map(text => new TableCell({ children: [new Paragraph({ text, run: { bold: true } })] })), tableHeader: true }), ...list.items.map(item => new TableRow({ children: [ new TableCell({ children: [new Paragraph(item.item)] }), new TableCell({ children: [new Paragraph(item.quantity)] }), new TableCell({ children: [new Paragraph(item.providedBy)] }) ] })) ] });
    const children = [ createDocHeader(paper), createDocTitle("Cutting List"), createSubheading(list.title), table ];
    const doc = createBaseDocument(children);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${sanitizeFilename(paper.paperCode)}-Cutting-List.docx`);
};

const createSimpleTable = (rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map(row => new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: row[0], run: { bold: true } })], width: { size: 25, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph(row[1] || "")], width: { size: 25, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph({ text: row[2], run: { bold: true } })], width: { size: 25, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph(row[3] || "")], width: { size: 25, type: WidthType.PERCENTAGE } }) ] })), borders: ALL_BORDERS });

const exportChecklistToDocx = async (checklist) => {
    const children = [ createDocHeader(checklist), createDocTitle("Marking and Observation Checklist"), createSubheading("INSTRUCTIONS TO THE ASSESSOR:"), ...checklist.assessorInstructions.map(instr => new Paragraph({ text: instr, numbering: { reference: "ordered-list", level: 0 } })), createSubheading("1. CANDIDATE & ASSESSOR DETAILS"), createSimpleTable([["Candidate Name:", "", "CDACC Reg. No.:", ""], ["Assessor Name:", "", "Assessor ID Number:", ""]]), createSubheading("2. PROJECT BRIEF"), new Paragraph(checklist.projectBrief) ];
    checklist.sections.forEach((section, index) => {
        children.push(createSubheading(`${index + 3}. ${section.sectionTitle.toUpperCase()}`));
        children.push(new Paragraph({ text: "Element covered", run: { bold: true } }));
        children.push(...section.elementsCovered.map(el => new Paragraph({ text: el, numbering: { reference: "ordered-list", level: 0 } })));
        children.push(new Paragraph({ text: "Tasks", run: { bold: true }, spacing: { before: 200 } }));
        children.push(...section.tasks.map(task => new Paragraph({ text: task, numbering: { reference: "ordered-list", level: 0 } })));
        children.push(new Paragraph({ text: "Practical Checklist", run: { bold: true }, spacing: { before: 200 } }));
        const checklistTableRows = [
            new TableRow({ children: ["No.", "Items of Evaluation", "Max Marks", "Awarded", "Comment"].map(text => new TableCell({ children: [new Paragraph({ text, run: { bold: true } })] })), tableHeader: true }),
            ...section.checklistItems.map(item => new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: item.itemNumber, alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.TOP }), new TableCell({ children: [ new Paragraph({ text: item.evaluationItem, run: { bold: true } }), ...(item.subItems || []).map(sub => new Paragraph({ text: sub, numbering: { reference: "sub-bullet-list", level: 0 } })), ...(item.markingGuide ? [new Paragraph({ text: item.markingGuide, run: { italics: true } })] : []) ], verticalAlign: VerticalAlign.TOP }), new TableCell({ children: [new Paragraph({ text: item.maxMarks.toString(), alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.TOP }), new TableCell({ children: [new Paragraph("")] }), new TableCell({ children: [new Paragraph("")] }) ] })),
            new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: `Total Section ${index + 1}`, run: { bold: true }, alignment: AlignmentType.RIGHT })], columnSpan: 2 }), new TableCell({ children: [new Paragraph({ text: section.totalMarks.toString(), run: { bold: true }, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph("")] }), new TableCell({ children: [new Paragraph("")] }) ] }),
        ];
        children.push(new Table({ rows: checklistTableRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: ALL_BORDERS }));
        if (section.notes) children.push(new Paragraph({ children: [new TextRun({ text: "NB: ", bold: true }), new TextRun(section.notes)] }));
    });
    if (checklist.oralAssessment) {
        children.push(createSubheading(`${checklist.sections.length + 3}. ${checklist.oralAssessment.title.toUpperCase()}`));
        const oralTableRows = [
             new TableRow({ children: ["No.", "Questions", "Expected Answer", "Max Marks", "Awarded"].map(text => new TableCell({ children: [new Paragraph({ text, run: { bold: true } })] })), tableHeader: true }),
            ...checklist.oralAssessment.items.map(item => new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: item.questionNumber, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph(item.question)] }), new TableCell({ children: [new Paragraph(item.expectedAnswer)] }), new TableCell({ children: [new Paragraph({ text: item.maxMarks.toString(), alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph("")] }) ] })),
             new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: `Total Oral Assessment`, run: { bold: true }, alignment: AlignmentType.RIGHT })], columnSpan: 3 }), new TableCell({ children: [new Paragraph({ text: checklist.oralAssessment.totalMarks.toString(), run: { bold: true }, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph("")] }) ] }),
        ];
        children.push(new Table({ rows: oralTableRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: ALL_BORDERS }));
    }
    children.push(createSubheading(`SUMMARY OF ASSESSMENT`));
    const summaryRows = [ new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'PRACTICAL ASSESSMENT', run: { bold: true } })], columnSpan: 4 })], tableHeader: true }), new TableRow({ children: ['S/N', 'SECTION', 'Total Marks', 'Marks Awarded'].map(text => new TableCell({ children: [new Paragraph({ text, run: { bold: true } })] })), tableHeader: true }), ...checklist.sections.map((sec, i) => new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: `${i + 1}.`, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph(`Assessment ${i + 1}`)] }), new TableCell({ children: [new Paragraph({ text: sec.totalMarks.toString(), alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph('')] }) ] })), new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: 'Total', run: { bold: true }, alignment: AlignmentType.RIGHT })], columnSpan: 2 }), new TableCell({ children: [new Paragraph({ text: checklist.summary.practicalTotal.toString(), run: { bold: true }, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph('')] }) ] }) ];
    if (checklist.oralAssessment && checklist.summary.oralTotal) {
        summaryRows.push(new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: 'ORAL ASSESSMENT', run: { bold: true } })], columnSpan: 4 })], tableHeader: true }));
        summaryRows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: '1.', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph('Oral Assessment')] }), new TableCell({ children: [new Paragraph({ text: checklist.summary.oralTotal.toString(), alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph('')] }) ] }));
    }
    children.push(new Table({ rows: summaryRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: ALL_BORDERS }));
    children.push(createSubheading(`ASSESSMENT OUTCOME`));
    children.push(new Paragraph('[  ] Competent'));
    children.push(new Paragraph('[  ] Not yet Competent'));
    children.push(new Paragraph({ text: '(Please tick as appropriate)', run: { italics: true } }));
    children.push(new Paragraph(checklist.summary.outcomeNote));
    const doc = createBaseDocument(children);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${sanitizeFilename(checklist.paperCode)}-Checklist.docx`);
};


// --- RENDERING LOGIC ---
const renderActionButtons = () => `
    <div class="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-6 print:hidden">
        <button data-action="generate-cutting-list" class="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-md shadow-md hover:from-emerald-600 hover:to-teal-600 disabled:!bg-gray-400 disabled:cursor-not-allowed transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Generate Cutting List
        </button>
        <button data-action="generate-checklist" class="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-md shadow-md hover:from-indigo-600 hover:to-violet-600 disabled:!bg-gray-400 disabled:cursor-not-allowed transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Generate Marking Checklist
        </button>
    </div>
`;

const renderDocumentHeader = (paper, docType) => `
    <div class="mb-8 font-serif">
        <div class="flex justify-between items-start mb-4">
            <div class="text-left text-sm">
                <p class="font-bold">${paper.courseTitle.toUpperCase()}</p>
                <p>${paper.paperCode}</p>
                <p class="font-bold">${paper.paperTitle}</p>
                <p>${paper.assessmentDate}</p>
            </div>
            <div class="text-right text-xs font-semibold text-gray-600">© 2025 TVET CDACC</div>
        </div>
        <div class="my-6 flex flex-col items-center space-y-2 text-center">
            <div class="h-20 w-20 md:h-24 md:w-24">${tvetCdaccLogoSvg}</div>
            <p class="font-bold text-sm md:text-base">TVET CURRICULUM DEVELOPMENT, ASSESSMENT AND CERTIFICATION COUNCIL (TVET CDACC)</p>
        </div>
        <h2 class="text-xl font-bold text-center mt-6 text-gray-800">${docType.toUpperCase()}</h2>
        <div class="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mt-2 mb-4 rounded-full"></div>
    </div>
`;

const renderPracticalPaper = (paper) => {
    const paperHtml = `
        <div class="space-y-6 relative bg-white p-6 md:p-8 rounded-lg border border-gray-200" data-doc-type="practical-paper">
            <button data-action="download-docx" class="absolute top-4 right-16 bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-full transition z-10 print:hidden" title="Download Practical Paper as .docx">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>
            </button>
            <button data-action="copy-json" class="absolute top-4 right-4 bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-full transition z-10 print:hidden" title="Copy JSON to Clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"></path></svg>
            </button>
            ${renderDocumentHeader(paper, 'Practical Assessment')}
            <div class="space-y-2"><h4 class="text-md font-bold text-purple-800">INSTRUCTIONS TO THE CANDIDATE:</h4><ol class="list-decimal list-inside space-y-1 text-gray-700 text-sm">${paper.candidateInstructions.map(instr => `<li>${instr}</li>`).join('')}</ol></div>
            ${paper.resourcesRequired ? `
                <div class="space-y-4 p-4 bg-gray-50 rounded-md text-sm">
                    <h4 class="text-md font-bold text-purple-800">RESOURCES REQUIRED:</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><h5 class="font-semibold text-gray-700">Tools and Equipment:</h5><ul class="list-disc list-inside space-y-1 text-gray-700 mt-2">${paper.resourcesRequired.toolsAndEquipment.map(item => `<li>${item}</li>`).join('')}</ul></div>
                        <div><h5 class="font-semibold text-gray-700">Materials:</h5><ul class="list-disc list-inside space-y-1 text-gray-700 mt-2">${paper.resourcesRequired.materials.map(item => `<li>${item}</li>`).join('')}</ul></div>
                    </div>
                </div>` : ''
            }
            <div class="space-y-6">
                ${paper.sections.map((section, index) => `
                    <div class="pt-4"><h4 class="text-lg font-bold text-gray-800 border-b-2 border-purple-200 pb-2 mb-4">${index + 1}. ${section.sectionTitle.toUpperCase()}</h4>
                    <div class="space-y-6 pl-2 text-sm">
                        <div><h5 class="font-semibold text-purple-700 mb-2">Elements Covered</h5><ul class="list-disc list-inside text-gray-700 ml-4">${section.elementsCovered.map(el => `<li>${el}</li>`).join('')}</ul></div>
                        <div><h5 class="font-semibold text-purple-700 mb-3">Tasks</h5><div class="space-y-4">
                            ${section.tasks.map(task => `
                                <div class="text-gray-800"><p class="font-medium">${task.title}</p>
                                ${task.rolePlay ? `<div class="my-2 p-3 bg-blue-50 border-l-4 border-blue-300 text-blue-800 rounded-r-lg"><p class="font-bold">${task.rolePlay.title}</p><p class="italic mt-1">${task.rolePlay.scenario}</p></div>` : ''}
                                ${task.subTasks && task.subTasks.length > 0 ? `<ol class="list-decimal list-inside space-y-1 mt-2 ml-5">${task.subTasks.map(sub => `<li class="whitespace-pre-wrap">${sub}</li>`).join('')}</ol>` : ''}
                                </div>`).join('')}
                        </div></div>
                    </div></div>`).join('')}
            </div>
        </div>
        ${renderActionButtons()}
    `;
    return paperHtml;
};

const renderCuttingList = (list) => {
    return `
        <div class="relative bg-white p-6 md:p-8 rounded-lg border border-gray-200" data-doc-type="cutting-list">
             <button data-action="download-docx" class="absolute top-4 right-16 bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-full transition z-10 print:hidden" title="Download Cutting List as .docx">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>
            </button>
            <button data-action="copy-json" class="absolute top-4 right-4 bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-full transition z-10 print:hidden" title="Copy JSON to Clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"></path></svg>
            </button>
            ${renderDocumentHeader(practicalPaper, 'Cutting List')}
            <h3 class="text-lg font-bold text-purple-800 mb-4">${list.title}</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100"><tr>
                        <th class="p-3 font-semibold text-sm text-gray-600 border border-gray-200">Item</th>
                        <th class="p-3 font-semibold text-sm text-gray-600 border border-gray-200">Qty</th>
                        <th class="p-3 font-semibold text-sm text-gray-600 border border-gray-200">Provided by</th>
                    </tr></thead>
                    <tbody>${list.items.map(item => `
                        <tr class="hover:bg-gray-50">
                            <td class="p-3 text-gray-700 border border-gray-200 text-sm">${item.item}</td>
                            <td class="p-3 text-gray-700 border border-gray-200 text-sm">${item.quantity}</td>
                            <td class="p-3 text-gray-700 border border-gray-200 text-sm">${item.providedBy}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const renderChecklist = (list) => {
    const checklistItemRow = (item) => `
        <tr>
            <td class="border border-gray-400 p-2 text-center align-top">${item.itemNumber}</td>
            <td class="border border-gray-400 p-2 align-top">
                <p class="font-semibold">${item.evaluationItem}</p>
                ${item.subItems && item.subItems.length > 0 ? `<ul class="list-none pl-4 text-gray-600">${item.subItems.map(sub => `<li>${sub}</li>`).join('')}</ul>` : ''}
                ${item.markingGuide ? `<p class="text-xs italic text-gray-500 mt-1">${item.markingGuide}</p>` : ''}
            </td>
            <td class="border border-gray-400 p-2 text-center align-top">${item.maxMarks}</td>
            <td class="border border-gray-400 p-2 align-top"></td>
            <td class="border border-gray-400 p-2 align-top"></td>
        </tr>
    `;

    return `
        <div class="space-y-6 relative bg-white p-6 md:p-8 rounded-lg border border-gray-200 font-serif" data-doc-type="checklist">
             <button data-action="download-docx" class="absolute top-4 right-16 bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-full transition z-10 print:hidden" title="Download Checklist as .docx">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>
            </button>
            <button data-action="copy-json" class="absolute top-4 right-4 bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-full transition z-10 print:hidden" title="Copy JSON to Clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"></path></svg>
            </button>
            ${renderDocumentHeader(list, 'Marking and Observation Checklist')}
            <div class="space-y-2 text-sm">
                <h4 class="text-md font-bold text-purple-800">INSTRUCTIONS TO THE ASSESSOR:</h4>
                <ol class="list-decimal list-inside space-y-1 text-gray-700">${list.assessorInstructions.map(instr => `<li>${instr}</li>`).join('')}</ol>
            </div>
            <div>
                <h4 class="text-md font-bold text-purple-800 mb-2">1. CANDIDATE & ASSESSOR DETAILS</h4>
                <table class="w-full border-collapse border border-gray-400 text-sm"><tbody>
                    <tr><td class="border border-gray-400 p-2 font-semibold">Candidate Name:</td><td class="border border-gray-400 p-2 w-1/4"></td><td class="border border-gray-400 p-2 font-semibold">CDACC Reg. No.:</td><td class="border border-gray-400 p-2 w-1/4"></td></tr>
                    <tr><td class="border border-gray-400 p-2 font-semibold">Assessor Name:</td><td class="border border-gray-400 p-2"></td><td class="border border-gray-400 p-2 font-semibold">Assessor ID Number:</td><td class="border border-gray-400 p-2"></td></tr>
                </tbody></table>
            </div>
            <div><h4 class="text-md font-bold text-purple-800 mb-2">2. PROJECT BRIEF</h4><p class="text-gray-700 text-sm">${list.projectBrief}</p></div>
            ${list.sections.map((section, index) => `
                <div class="pt-4 space-y-4">
                    <h4 class="text-lg font-bold text-purple-800">${index + 3}. ${section.sectionTitle.toUpperCase()}</h4>
                    <div class="text-sm space-y-2"><h5 class="font-semibold text-gray-700">Element covered</h5><ol class="list-decimal list-inside ml-4 text-gray-600">${section.elementsCovered.map(el => `<li>${el}</li>`).join('')}</ol></div>
                    <div class="text-sm space-y-2"><h5 class="font-semibold text-gray-700">Tasks</h5><ol class="list-decimal list-inside ml-4 text-gray-600">${section.tasks.map(task => `<li>${task}</li>`).join('')}</ol></div>
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-2">Practical Checklist</h5>
                        <table class="w-full border-collapse border border-gray-400 text-sm">
                            <thead class="bg-gray-100"><tr>
                                <th class="border border-gray-400 p-2 w-12">No.</th><th class="border border-gray-400 p-2">Items of Evaluation</th><th class="border border-gray-400 p-2 w-24">Max Marks</th><th class="border border-gray-400 p-2 w-24">Awarded</th><th class="border border-gray-400 p-2 w-40">Comment</th>
                            </tr></thead>
                            <tbody>
                                ${section.checklistItems.map(item => checklistItemRow(item)).join('')}
                                <tr class="font-bold bg-gray-100"><td colspan="2" class="border border-gray-400 p-2 text-right">Total Section ${index + 1}</td><td class="border border-gray-400 p-2 text-center">${section.totalMarks}</td><td class="border border-gray-400 p-2"></td><td class="border border-gray-400 p-2"></td></tr>
                            </tbody>
                        </table>
                        ${section.notes ? `<p class="text-sm font-semibold mt-2">NB: ${section.notes}</p>` : ''}
                    </div>
                </div>`).join('')
            }
            ${list.oralAssessment ? `
                <div class="pt-4 space-y-4">
                    <h4 class="text-lg font-bold text-purple-800">${list.sections.length + 3}. ${list.oralAssessment.title.toUpperCase()}</h4>
                    <table class="w-full border-collapse border border-gray-400 text-sm">
                        <thead class="bg-gray-100"><tr>
                            <th class="border border-gray-400 p-2 w-12">No.</th><th class="border border-gray-400 p-2">Questions</th><th class="border border-gray-400 p-2">Expected Answer</th><th class="border border-gray-400 p-2 w-24">Max Marks</th><th class="border border-gray-400 p-2 w-24">Awarded</th>
                        </tr></thead>
                        <tbody>
                            ${list.oralAssessment.items.map(item => `<tr><td class="border border-gray-400 p-2 text-center align-top">${item.questionNumber}</td><td class="border border-gray-400 p-2 align-top">${item.question}</td><td class="border border-gray-400 p-2 align-top text-gray-600">${item.expectedAnswer}</td><td class="border border-gray-400 p-2 text-center align-top">${item.maxMarks}</td><td class="border border-gray-400 p-2 align-top"></td></tr>`).join('')}
                            <tr class="font-bold bg-gray-100"><td colspan="3" class="border border-gray-400 p-2 text-right">Total Oral Assessment</td><td class="border border-gray-400 p-2 text-center">${list.oralAssessment.totalMarks}</td><td class="border border-gray-400 p-2"></td></tr>
                        </tbody>
                    </table>
                </div>` : ''
            }
            <div class="pt-4 space-y-4"><h4 class="text-lg font-bold text-purple-800">SUMMARY OF ASSESSMENT</h4>
                 <table class="w-full border-collapse border border-gray-400 text-sm">
                    <thead class="bg-gray-100 font-bold"><tr><th colspan="4" class="border border-gray-400 p-2">PRACTICAL ASSESSMENT</th></tr><tr><th class="border border-gray-400 p-2">S/N</th><th class="border border-gray-400 p-2">SECTION</th><th class="border border-gray-400 p-2">Total Marks</th><th class="border border-gray-400 p-2">Marks Awarded</th></tr></thead>
                    <tbody>
                        ${list.sections.map((sec, i) => `<tr><td class="border border-gray-400 p-2 text-center">${i + 1}.</td><td class="border border-gray-400 p-2">Assessment ${i + 1}</td><td class="border border-gray-400 p-2 text-center">${sec.totalMarks}</td><td class="border border-gray-400 p-2"></td></tr>`).join('')}
                        <tr class="font-bold bg-gray-100"><td colspan="2" class="border border-gray-400 p-2 text-right">Total</td><td class="border border-gray-400 p-2 text-center">${list.summary.practicalTotal}</td><td class="border border-gray-400 p-2"></td></tr>
                    </tbody>
                    ${list.oralAssessment && list.summary.oralTotal ? `
                        <thead class="bg-gray-100 font-bold"><tr><th colspan="4" class="border border-gray-400 p-2">ORAL ASSESSMENT</th></tr></thead>
                        <tbody><tr><td class="border border-gray-400 p-2 text-center">1.</td><td class="border border-gray-400 p-2">Oral Assessment</td><td class="border border-gray-400 p-2 text-center">${list.summary.oralTotal}</td><td class="border border-gray-400 p-2"></td></tr></tbody>
                    ` : ''}
                </table>
            </div>
             <div class="mt-8 p-4 border border-gray-400 text-sm space-y-4">
                <h4 class="text-md font-bold text-purple-800">ASSESSMENT OUTCOME</h4>
                <p>The candidate was found to be:</p>
                <div class="flex items-center space-x-8"><div class="flex items-center space-x-2"><div class="w-8 h-8 border border-gray-600"></div><span>Competent</span></div><div class="flex items-center space-x-2"><div class="w-8 h-8 border border-gray-600"></div><span>Not yet Competent</span></div></div>
                <p class="italic">(Please tick as appropriate)</p>
                <p>${list.summary.outcomeNote}</p>
            </div>
        </div>
    `;
};


// --- EVENT HANDLERS ---
const handleGeneratePaper = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    initialState.classList.add('hidden');
    contentArea.innerHTML = '';
    
    practicalPaper = null;
    cuttingList = null;
    checklist = null;

    try {
        const courseTitle = document.getElementById('courseTitle').value;
        const module = document.getElementById('module').value;
        const paperName = document.getElementById('paperName').value;
        const curriculumElements = document.getElementById('curriculumElements').value;
        const paperDescription = document.getElementById('paperDescription').value;
        const knqfLevel = parseInt(document.getElementById('knqfLevel').value, 10);
        
        const paper = await generatePracticalPaper(courseTitle, module, paperName, curriculumElements, paperDescription, knqfLevel);
        practicalPaper = paper;
        contentArea.innerHTML = renderPracticalPaper(practicalPaper);

    } catch (err) {
        console.error(err);
        setError('An error occurred while generating the practical paper. Please try again.');
        clearOutput();
    } finally {
        setLoading(false);
    }
};

const handleGenerateCuttingList = async () => {
    if (!practicalPaper) return;
    setLoading(true);
    setError(null);
    try {
        const knqfLevel = parseInt(document.getElementById('knqfLevel').value, 10);
        const list = await generateCuttingList(practicalPaper, knqfLevel);
        cuttingList = list;
        // Append to content area
        contentArea.insertAdjacentHTML('beforeend', renderCuttingList(cuttingList));

    } catch (err) {
        console.error(err);
        setError('An error occurred while generating the cutting list. Please try again.');
    } finally {
        setLoading(false);
    }
};

const handleGenerateChecklist = async () => {
    if (!practicalPaper) return;
    setLoading(true);
    setError(null);
    try {
        const knqfLevel = parseInt(document.getElementById('knqfLevel').value, 10);
        const list = await generateChecklist(practicalPaper, knqfLevel);
        checklist = list;
        // Append to content area
        contentArea.insertAdjacentHTML('beforeend', renderChecklist(checklist));

    } catch (err) {
        console.error(err);
        setError('An error occurred while generating the checklist. Please try again.');
    } finally {
        setLoading(false);
    }
};

// --- EVENT LISTENERS ---
controlPanel.addEventListener('submit', handleGeneratePaper);

// Event delegation for dynamically created buttons
outputContainer.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const docContainer = button.closest('[data-doc-type]');
    const docType = docContainer?.dataset.docType;

    if (action === 'generate-cutting-list') {
        handleGenerateCuttingList();
    } else if (action === 'generate-checklist') {
        handleGenerateChecklist();
    } else if (action === 'copy-json') {
        let dataToCopy;
        if (docType === 'practical-paper') dataToCopy = practicalPaper;
        else if (docType === 'cutting-list') dataToCopy = cuttingList;
        else if (docType === 'checklist') dataToCopy = checklist;
        
        if (dataToCopy) {
            await navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
            const originalIcon = button.innerHTML;
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5 text-green-500"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>`;
            setTimeout(() => button.innerHTML = originalIcon, 2000);
        }
    } else if (action === 'download-docx') {
        if (docType === 'practical-paper' && practicalPaper) {
            await exportPracticalPaperToDocx(practicalPaper);
        } else if (docType === 'cutting-list' && cuttingList && practicalPaper) {
            await exportCuttingListToDocx(cuttingList, practicalPaper);
        } else if (docType === 'checklist' && checklist) {
            await exportChecklistToDocx(checklist);
        }
    }
});