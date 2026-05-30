import { MessageSquarePlus, Sparkles } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

type AssistantPanelProps = {
  title: string;
  placeholder: string;
  suggestions: string[];
};

export function AssistantPanel({ title, placeholder, suggestions }: AssistantPanelProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#6E5BFF]">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>Contextual help and next-step guidance.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block">
          <span className="sr-only">{title}</span>
          <Input placeholder={placeholder} />
        </label>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button key={suggestion} variant="secondary" size="sm" type="button">
              <MessageSquarePlus aria-hidden="true" />
              {suggestion}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
