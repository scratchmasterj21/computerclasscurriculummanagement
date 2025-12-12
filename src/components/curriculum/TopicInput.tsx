import { Topic, TopicType } from "@/types/curriculum";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TopicInputProps {
  topic: Topic;
  onChange: (topic: Topic) => void;
  onRemove: () => void;
}

export function TopicInput({ topic, onChange, onRemove }: TopicInputProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div>
            <Label htmlFor={`topic-name-${topic.name}`}>Topic Name *</Label>
            <Input
              id={`topic-name-${topic.name}`}
              value={topic.name}
              onChange={(e) => onChange({ ...topic, name: e.target.value })}
              placeholder="e.g., Variables and Data Types"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`topic-type-${topic.name}`}>Type *</Label>
              <Select
                value={topic.type}
                onValueChange={(value: TopicType) =>
                  onChange({ ...topic, type: value })
                }
              >
                <SelectTrigger id={`topic-type-${topic.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`topic-duration-${topic.name}`}>
                Duration (minutes)
              </Label>
              <Input
                id={`topic-duration-${topic.name}`}
                type="number"
                min="0"
                value={topic.duration || ""}
                onChange={(e) =>
                  onChange({
                    ...topic,
                    duration: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 60"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`topic-desc-${topic.name}`}>Description</Label>
            <Input
              id={`topic-desc-${topic.name}`}
              value={topic.description || ""}
              onChange={(e) =>
                onChange({ ...topic, description: e.target.value })
              }
              placeholder="Optional description"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

