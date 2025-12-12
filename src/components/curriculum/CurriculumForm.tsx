import { useState, useEffect } from "react";
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
import { CurriculumItem, Topic, Resource, TopicType, ResourceType, GradeLevel } from "@/types/curriculum";
import { Plus, X } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  week: z.number().min(1).max(52),
  grade: z.number().min(1).max(6),
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

interface CurriculumFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  initialData?: CurriculumItem;
}

export function CurriculumForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: CurriculumFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      week: 1,
      grade: 1,
      topics: [],
      resources: [],
    },
  });

  const topics = watch("topics");
  const resources = watch("resources");

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        week: initialData.week,
        grade: initialData.grade,
        topics: initialData.topics,
        resources: initialData.resources,
      });
    } else {
      reset({
        title: "",
        description: "",
        week: 1,
        grade: 1,
        topics: [],
        resources: [],
      });
    }
  }, [initialData, open, reset]);

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

  const onFormSubmit = (data: FormValues) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Curriculum Item" : "Add Curriculum Item"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the curriculum item details below."
              : "Fill in the details to add a new curriculum item."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="week">Week *</Label>
              <Select
                value={watch("week").toString()}
                onValueChange={(value) => setValue("week", parseInt(value))}
              >
                <SelectTrigger id="week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.week && (
                <p className="text-sm text-destructive mt-1">
                  {errors.week.message}
                </p>
              )}
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
                    className="flex gap-3 rounded-lg border p-4"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-3">
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
              onClick={() => onOpenChange(false)}
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

