export type TopicType = "lecture" | "lab" | "assignment" | "project" | "other";
export type ResourceType = "link" | "document" | "video" | "other";

export interface Topic {
  name: string;
  description?: string;
  duration?: number; // minutes
  type: TopicType;
}

export interface Resource {
  name: string;
  url: string;
  type: ResourceType;
}

export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface CurriculumItem {
  id: string;
  title: string;
  description: string;
  week: number; // 1-52
  grade: GradeLevel; // 1-6
  topics: Topic[];
  resources: Resource[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface CurriculumItemInput {
  title: string;
  description: string;
  week: number;
  grade: GradeLevel;
  topics: Topic[];
  resources: Resource[];
}

