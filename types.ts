
export enum ToolType {
  CANDIDATE_PRACTICAL_PAPER = 'Candidate Practical Paper',
  CUTTING_LIST = 'Cutting List',
  CHECKLIST = 'Checklist',
}

export type KNQFLevel = 3 | 4 | 5 | 6;

export interface AssessmentTask {
  title: string; // e.g., "Make Guest Reservation." or a simple task description.
  rolePlay?: {
    title: string; // e.g., "Reservation by phone call."
    scenario: string; // The full scenario description.
  };
  subTasks: string[]; // Specific steps. For simple tasks, this can be empty.
}


interface AssessmentSection {
  sectionTitle: string;
  duration?: string;
  elementsCovered: string[];
  tasks: AssessmentTask[];
}

export interface CandidatePracticalPaper {
  courseTitle: string;
  paperTitle: string;
  paperCode: string;
  assessmentDate: string;
  candidateInstructions: string[];
  resourcesRequired?: {
    toolsAndEquipment: string[];
    materials: string[];
  };
  sections: AssessmentSection[];
}


export interface CuttingListItem {
    item: string;
    quantity: string;
    providedBy: string;
}

export interface CuttingList {
    title: string;
    items: CuttingListItem[];
}

// ** NEW COMPREHENSIVE CHECKLIST TYPES **

export interface PracticalChecklistItem {
    itemNumber: string;
    evaluationItem: string;
    subItems: string[];
    markingGuide?: string;
    maxMarks: number;
}

export interface ChecklistSection {
    sectionTitle: string;
    elementsCovered: string[];
    tasks: string[];
    checklistItems: PracticalChecklistItem[];
    totalMarks: number;
    notes?: string;
}

export interface OralAssessmentItem {
    questionNumber: string;
    question: string;
    expectedAnswer: string;
    maxMarks: number;
}

export interface Checklist {
    courseTitle: string;
    paperTitle: string;
    paperCode: string;
    assessmentDate: string;
    assessorInstructions: string[];
    projectBrief: string;
    sections: ChecklistSection[];
    oralAssessment?: {
        title: string;
        items: OralAssessmentItem[];
        totalMarks: number;
    };
    summary: {
        practicalTotal: number;
        oralTotal?: number;
        overallTotal: number;
        outcomeNote: string;
    };
}

export type AssessmentTool = CandidatePracticalPaper | CuttingList | Checklist;
