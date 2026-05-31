import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Bot,
  Info,
  MessageSquarePlus,
  PanelRightClose,
  PanelRightOpen,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { OverviewCopilotContext, OverviewCopilotMessage, SuggestedOutput } from "../types";

type OverviewCopilotRailProps = {
  context: OverviewCopilotContext;
  draft: string;
  open: boolean;
  isThinking: boolean;
  prompts: string[];
  onDraftChange: (value: string) => void;
  onOpen: () => void;
  onSubmit: (question: string) => void;
};

export function OverviewCopilotRail({
  context,
  draft,
  open,
  isThinking,
  prompts,
  onDraftChange,
  onOpen,
  onSubmit,
}: OverviewCopilotRailProps) {
  return (
    <div className="space-y-6">
      <Card className="sticky top-20">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F1FF] text-[#6E5BFF]">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">Dataset Copilot</CardTitle>
                  <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5F4CF0]">
                    Beta
                  </span>
                </div>
                <CardDescription className="mt-1">Your AI assistant for this dataset.</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" type="button" aria-label="Open copilot drawer" onClick={onOpen}>
              {open ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block">
            <span className="sr-only">Ask anything about this dataset</span>
            <Input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onFocus={onOpen}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit(draft);
                }
              }}
              placeholder="Ask anything about this dataset..."
              className="h-11"
            />
          </label>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#111827]">Try these</p>
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="secondary"
                  className="w-full justify-start"
                  type="button"
                  onClick={() => onSubmit(prompt)}
                  disabled={isThinking}
                >
                  <MessageSquarePlus aria-hidden="true" />
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <KnowledgeCard context={context} />
      <SuggestedOutputsCard outputs={context.suggestedOutputs} />
    </div>
  );
}

type OverviewCopilotDrawerProps = {
  context: OverviewCopilotContext;
  draft: string;
  open: boolean;
  isThinking: boolean;
  messages: OverviewCopilotMessage[];
  prompts: string[];
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: (question: string) => void;
};

export function OverviewCopilotDrawer({
  context,
  draft,
  open,
  isThinking,
  messages,
  prompts,
  onClose,
  onDraftChange,
  onSubmit,
}: OverviewCopilotDrawerProps) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isThinking, open]);

  return (
    <>
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-[#111827]/20 transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-[#E5E7EB] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-[#E5E7EB] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3F1FF] text-[#6E5BFF]">
                <Bot aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-[#111827]">{context.datasetName} Copilot</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Stay inside the overview while clarifying quality, terms, relationships and next steps.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" type="button" aria-label="Close copilot drawer" onClick={onClose}>
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "ml-auto bg-[#6E5BFF] text-white"
                  : "border border-[#E5E7EB] bg-[#FAFBFC] text-[#111827]",
              )}
            >
              {message.role === "assistant" ? (
                <div className="space-y-3">
                  {message.title ? <p className="text-sm font-semibold">{message.title}</p> : null}
                  <p className="text-sm leading-7 text-[#4B5563]">{message.body}</p>
                  {message.bullets?.length ? (
                    <ul className="space-y-2">
                      {message.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm text-[#111827]">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6E5BFF]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-7 text-white">{message.body}</p>
              )}
            </article>
          ))}

          {isThinking ? (
            <div className="max-w-[92%] rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3 text-sm text-[#6B7280]">
              Dativerso is preparing a dataset-aware answer...
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#E5E7EB] px-6 py-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] p-4">
              <div className="flex items-center gap-2">
                <Info aria-hidden="true" className="h-4 w-4 text-[#6E5BFF]" />
                <p className="text-sm font-semibold text-[#111827]">Current context</p>
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">
                {context.classification} • {context.rows} rows • {context.columns} columns • Quality {context.qualityScore}
              </p>
            </div>

            <label className="block">
              <span className="sr-only">Chat with this dataset</span>
              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="Ask about business context, quality issues or next outputs..."
                className="min-h-28"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {prompts.slice(0, 3).map((prompt) => (
                <Button key={prompt} variant="secondary" size="sm" type="button" onClick={() => onSubmit(prompt)} disabled={isThinking}>
                  <MessageSquarePlus aria-hidden="true" />
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" type="button" onClick={onClose}>
                Close
              </Button>
              <Button type="button" onClick={() => onSubmit(draft)} disabled={isThinking || !draft.trim()}>
                Ask Copilot
                <SendHorizonal aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function KnowledgeCard({ context }: { context: OverviewCopilotContext }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Dataset Knowledge</CardTitle>
            <CardDescription>AI suggested information about this dataset.</CardDescription>
          </div>
          <Info aria-hidden="true" className="h-4 w-4 text-[#98A2B3]" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <KnowledgeLine label="Title" value={context.datasetName} />
        <KnowledgeLine label="Business Area" value={context.businessArea} />
        <KnowledgeLine label="Domain" value={context.domain} />
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[#6B7280]">Description</p>
          <p className="mt-2 text-sm leading-6 text-[#111827]">{context.understanding}</p>
        </div>
        <Button variant="secondary" className="w-full" type="button">
          Refine all with Copilot
          <ArrowRight aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

function SuggestedOutputsCard({ outputs }: { outputs: SuggestedOutput[] }) {
  return (
    <Card className="bg-[linear-gradient(180deg,#FBFAFF_0%,#FFFFFF_100%)]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Suggested Outputs</CardTitle>
            <CardDescription>Likely next assets to create from this dataset.</CardDescription>
          </div>
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-xs font-semibold text-[#5F4CF0]">{outputs.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {outputs.map((output) => (
          <div key={output.name} className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{output.name}</p>
                <p className="mt-1 text-sm leading-6 text-[#6B7280]">{output.description}</p>
              </div>
              <span className="rounded-full bg-[#ECFDF3] px-2 py-0.5 text-xs font-semibold text-[#15803D]">{output.confidence}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function KnowledgeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
