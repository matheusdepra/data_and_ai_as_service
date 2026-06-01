import { useEffect, useRef } from "react";
import {
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { OverviewCopilotContext, OverviewCopilotMessage } from "../types";

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
    <Card className="overflow-hidden border-[#E5E7EB] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <CardHeader className="space-y-4 bg-[linear-gradient(180deg,#FBFAFF_0%,#FFFFFF_100%)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3F1FF] text-[#6E5BFF] shadow-sm">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-[2rem] leading-none">Dataset Copilot</CardTitle>
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5F4CF0]">
                  Beta
                </span>
              </div>
              <CardDescription className="mt-2 text-sm leading-6">
                Your AI assistant for this dataset. Ask about meaning, quality, relationships and next outputs without leaving the page.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" type="button" aria-label="Open copilot drawer" onClick={onOpen}>
            {open ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
          </Button>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">{context.datasetName}</p>
              <p className="mt-1 text-sm text-[#6B7280]">
                {context.classification} • {context.rows} rows • Quality {context.qualityScore}
              </p>
            </div>
            <Info aria-hidden="true" className="h-4 w-4 text-[#98A2B3]" />
          </div>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">{context.understanding}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <label className="block">
          <span className="sr-only">Ask anything about this dataset</span>
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onFocus={onOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                onSubmit(draft);
              }
            }}
            placeholder="Ask anything about this dataset..."
            className="min-h-32 resize-none"
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#6B7280]">Use `Cmd/Ctrl + Enter` to send.</p>
          <Button type="button" onClick={() => onSubmit(draft)} disabled={isThinking || !draft.trim()}>
            Ask Copilot
            <MessageSquarePlus aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-2 border-t border-[#EEF2F7] pt-4">
          <p className="text-sm font-semibold text-[#111827]">Try these</p>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <Button
                key={prompt}
                variant="secondary"
                className="w-full justify-start whitespace-normal text-left"
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
  const hasUserMessages = messages.some((message) => message.role === "user");
  const visibleMessages = hasUserMessages ? messages.filter((message) => !message.id.startsWith("assistant-welcome-")) : messages;

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
              </div>
            </div>
            <Button variant="ghost" size="icon" type="button" aria-label="Close copilot drawer" onClick={onClose}>
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {visibleMessages.map((message) => (
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
                  <CopilotRichText value={message.body} />
                  {message.bullets?.length ? (
                    <ul className="space-y-2 border-t border-[#E5E7EB] pt-3">
                      {message.bullets.map((bullet) => (
                        <li key={bullet} className="text-xs leading-5 text-[#6B7280]">
                          <span className="font-medium text-[#111827]">Source:</span> <span>{bullet}</span>
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

            <label className="block">
              <span className="sr-only">Chat with this dataset</span>
              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    onSubmit(draft);
                  }
                }}
                placeholder="Ask about business context, quality issues or next outputs..."
                className="min-h-28"
              />
            </label>

            {!hasUserMessages ? (
              <div className="flex flex-wrap gap-2">
                {prompts.slice(0, 3).map((prompt) => (
                  <Button key={prompt} variant="secondary" size="sm" type="button" onClick={() => onSubmit(prompt)} disabled={isThinking}>
                    <MessageSquarePlus aria-hidden="true" />
                    {prompt}
                  </Button>
                ))}
              </div>
            ) : null}

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

function CopilotRichText({ value }: { value: string }) {
  const blocks = parseMarkdownBlocks(value);

  return (
    <div className="space-y-3 text-sm leading-7 text-[#4B5563]">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item) => (
                <li key={item}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
              <table className="w-full border-separate border-spacing-0 text-left text-xs">
                <thead className="bg-[#FAFBFC] text-[#6B7280]">
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header} className="border-b border-[#E5E7EB] px-3 py-2 font-semibold">
                        {renderInlineMarkdown(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="odd:bg-white even:bg-[#FAFBFC]">
                      {block.headers.map((_, cellIndex) => (
                        <td key={cellIndex} className="border-b border-[#EEF2F7] px-3 py-2 text-[#111827]">
                          {renderInlineMarkdown(row[cellIndex] || "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const lines = value.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const [headerLine, , ...rowLines] = tableLines;
      blocks.push({
        type: "table",
        headers: splitTableRow(headerLine),
        rows: rowLines.map(splitTableRow),
      });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function isTableStart(lines: string[], index: number) {
  return Boolean(lines[index]?.trim().startsWith("|") && lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/));
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInlineMarkdown(value: string): React.ReactNode[] {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#111827]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-[#111827]">
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
