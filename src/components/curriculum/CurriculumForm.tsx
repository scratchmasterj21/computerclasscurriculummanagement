import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopicInput } from "./TopicInput";
import { CurriculumItem, Topic, Resource, ResourceType, GradeLevel } from "@/types/curriculum";
import { Plus, X } from "lucide-react";
import {
  getApproxLessonDateFromWeek,
  getWeekFromLessonDate,
  isDateInSchoolYear,
} from "@/utils/dateHelpers";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  unit: z.string(),
  objectives: z.array(z.string()),
  lessonDate: z.string().min(1, "Lesson date is required"),
  week: z.number().min(1).max(52),
  grade: z.number().min(1).max(6).refine((val): val is GradeLevel => val >= 1 && val <= 6, {
    message: "Grade must be between 1 and 6",
  }),
  topics: z.array(
    z.object({
      name: z.string().min(1, "Topic name is required"),
      description: z.string().optional(),
      duration: z.number().optional(),
      type: z.enum(["lecture", "lab", "assignment", "project", "other"]),
    })
  ).min(1, "At least one topic is required"),
  resources: z.array(
    z.object({
      name: z.string().min(1, "Resource name is required"),
      url: z.string().url("Must be a valid URL"),
      type: z.enum(["link", "document", "video", "other"]),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  unit: string;
  objectives: string[];
  topics: Topic[];
  resources: Resource[];
}

const TEMPLATE_STORAGE_KEY = "curriculum-lesson-templates";

interface CurriculumFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void | boolean | Promise<void | boolean>;
  initialData?: CurriculumItem;
  schoolYear: number;
  defaultGrade?: GradeLevel;
  defaultLessonDate?: string;
  defaultUnit?: string;
  defaultTemplateId?: string;
}

export function CurriculumForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  schoolYear,
  defaultGrade,
  defaultLessonDate,
  defaultUnit,
  defaultTemplateId,
}: CurriculumFormProps) {
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [objectivesText, setObjectivesText] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      unit: "",
      objectives: [],
      lessonDate: getApproxLessonDateFromWeek(1, schoolYear),
      week: 1,
      grade: 1,
      topics: [],
      resources: [],
    },
  });

  const topics = watch("topics");
  const resources = watch("resources");
  const lessonDate = watch("lessonDate");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      setTemplates(stored ? JSON.parse(stored) : []);
    } catch {
      setTemplates([]);
    }
  }, [open]);

  useEffect(() => {
    if (initialData) {
      setObjectivesText((initialData.objectives || []).join("\n"));
      reset({
        title: initialData.title,
        description: initialData.description,
        unit: initialData.unit || "",
        objectives: initialData.objectives || [],
        lessonDate:
          initialData.lessonDate || getApproxLessonDateFromWeek(initialData.week, schoolYear),
        week: initialData.week,
        grade: initialData.grade,
        topics: initialData.topics,
        resources: initialData.resources,
      });
    } else {
      setObjectivesText("");
      reset({
        title: "",
        description: "",
        unit: defaultUnit || "",
        objectives: [],
        lessonDate: defaultLessonDate || getApproxLessonDateFromWeek(1, schoolYear),
        week: defaultLessonDate ? getWeekFromLessonDate(defaultLessonDate, schoolYear) : 1,
        grade: defaultGrade || 1,
        topics: [],
        resources: [],
      });
    }
  }, [defaultGrade, defaultLessonDate, defaultUnit, initialData, open, reset, schoolYear]);

  useEffect(() => {
    if (!lessonDate) return;
    setValue("week", getWeekFromLessonDate(lessonDate, schoolYear), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [lessonDate, schoolYear, setValue]);

  const addTopic = () => {
    const newTopic: Topic = {
      name: "",
      type: "lecture",
    };
    setValue("topics", [...topics, newTopic]);
  };

  const updateTopic = (index: number, topic: Topic) => {
    const updated = [...topics];
    updated[index] = topic;
    setValue("topics", updated);
  };

  const removeTopic = (index: number) => {
    setValue("topics", topics.filter((_, i) => i !== index));
  };

  const addResource = () => {
    const newResource: Resource = {
      name: "",
      url: "",
      type: "link",
    };
    setValue("resources", [...resources, newResource]);
  };

  const updateResource = (index: number, resource: Resource) => {
    const updated = [...resources];
    updated[index] = resource;
    setValue("resources", updated);
  };

  const removeResource = (index: number) => {
    setValue("resources", resources.filter((_, i) => i !== index));
  };

  const onFormSubmit = async (data: FormValues) => {
    const result = await onSubmit(data);
    if (result === false) return;
    reset(data);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty && !window.confirm("Discard your unsaved lesson changes?")) {
      return;
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!open || !isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, open]);

  const saveAsTemplate = () => {
    const title = watch("title").trim();
    if (!title) return;

    const template: LessonTemplate = {
      id: crypto.randomUUID(),
      name: title,
      description: watch("description"),
      unit: watch("unit"),
      objectives: watch("objectives"),
      topics: watch("topics"),
      resources: watch("resources"),
    };
    const next = [...templates, template];
    setTemplates(next);
    setSelectedTemplateId(template.id);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
  };

  const applyTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) return;

    setValue("title", template.name, { shouldDirty: true });
    setValue("description", template.description, { shouldDirty: true });
    setValue("unit", template.unit, { shouldDirty: true });
    setValue("objectives", template.objectives, { shouldDirty: true });
    setObjectivesText(template.objectives.join("\n"));
    setValue("topics", template.topics, { shouldDirty: true });
    setValue("resources", template.resources, { shouldDirty: true });
  }, [setValue, templates]);

  useEffect(() => {
    if (open && defaultTemplateId && templates.some((template) => template.id === defaultTemplateId)) {
      applyTemplate(defaultTemplateId);
    }
  }, [applyTemplate, defaultTemplateId, open, templates]);

  const deleteSelectedTemplate = () => {
    if (!selectedTemplateId) return;
    const next = templates.filter((template) => template.id !== selectedTemplateId);
    setTemplates(next);
    setSelectedTemplateId("");
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Lesson" : "Add Lesson"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the lesson details below."
              : "Add the schedule, topics, and resources for this lesson."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="lesson-template">Lesson template</Label>
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger id="lesson-template">
                <SelectValue placeholder={templates.length ? "Choose a saved template" : "No templates saved"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={saveAsTemplate} disabled={!watch("title").trim()}>
            Save as Template
          </Button>
          <Button type="button" variant="ghost" onClick={deleteSelectedTemplate} disabled={!selectedTemplateId}>
            Delete Template
          </Button>
        </div>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g., Introduction to Programming"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="grade">Grade *</Label>
              <Select
                value={watch("grade").toString()}
                onValueChange={(value) => setValue("grade", parseInt(value) as GradeLevel)}
              >
                <SelectTrigger id="grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade && (
                <p className="text-sm text-destructive mt-1">
                  {errors.grade.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lessonDate">Lesson Date *</Label>
              <Input
                id="lessonDate"
                type="date"
                {...register("lessonDate")}
              />
              {errors.lessonDate && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lessonDate.message}
                </p>
              )}
              {!errors.lessonDate && lessonDate && !isDateInSchoolYear(lessonDate, schoolYear) && (
                <p className="text-sm text-amber-600 mt-1">
                  This date falls outside the {schoolYear}-{schoolYear + 1} school year.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="week">School Week</Label>
              <Input id="week" value={`Week ${watch("week")}`} readOnly className="bg-muted" />
              {errors.week && (
                <p className="text-sm text-destructive mt-1">
                  {errors.week.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Automatically calculated from the lesson date.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description of the curriculum item"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                {...register("unit")}
                placeholder="e.g., Digital Citizenship"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use the same unit name to group related lessons.
              </p>
            </div>
            <div>
              <Label htmlFor="objectives">Learning Objectives</Label>
              <Textarea
                id="objectives"
                value={objectivesText}
                onChange={(event) => {
                  setObjectivesText(event.target.value);
                  setValue(
                    "objectives",
                    event.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                    { shouldDirty: true }
                  );
                }}
                placeholder={"One objective per line\nStudents will be able to..."}
                rows={4}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Topics *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTopic}>
                <Plus className="h-4 w-4 mr-2" />
                Add Topic
              </Button>
            </div>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No topics added. Click "Add Topic" to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {topics.map((topic, index) => (
                  <TopicInput
                    key={index}
                    topic={topic}
                    onChange={(updated) => updateTopic(index, updated)}
                    onRemove={() => removeTopic(index)}
                  />
                ))}
              </div>
            )}
            {errors.topics && (
              <p className="text-sm text-destructive mt-1">
                {errors.topics.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Resources</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addResource}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </div>
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resources added. Click "Add Resource" to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {resources.map((resource, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row"
                  >
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label htmlFor={`resource-name-${index}`}>Name *</Label>
                        <Input
                          id={`resource-name-${index}`}
                          value={resource.name}
                          onChange={(e) =>
                            updateResource(index, {
                              ...resource,
                              name: e.target.value,
                            })
                          }
                          placeholder="Resource name"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`resource-url-${index}`}>URL *</Label>
                        <Input
                          id={`resource-url-${index}`}
                          type="url"
                          value={resource.url}
                          onChange={(e) =>
                            updateResource(index, {
                              ...resource,
                              url: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label htmlFor={`resource-type-${index}`}>Type *</Label>
                        <Select
                          value={resource.type}
                          onValueChange={(value: ResourceType) =>
                            updateResource(index, {
                              ...resource,
                              type: value,
                            })
                          }
                        >
                          <SelectTrigger id={`resource-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResource(index)}
                      className="mt-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
