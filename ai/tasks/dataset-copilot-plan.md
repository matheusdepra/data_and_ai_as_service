# Task: Dataset Copilot Integration

Checklist for implementing the Dataset Copilot backend agent, ad-hoc query capabilities, rich card formatting, and frontend page integration.

## Checklist

- [x] **Phase 1: Backend Setup & Prompting**
  - [x] Add `dataset_copilot` prompt template to `InMemoryPromptRepository`
  - [x] Enable semantic preview/apply tools for `dataset_copilot` prompt key in `ToolService`
  - [x] Update route validation or wiring in `deps.py`

- [x] **Phase 2: Rich Card Metadata Parsing**
  - [x] Implement post-processing of LLM response in `ChatService` to parse `"rich_metadata"` JSON blocks
  - [x] Populate response metadata with extracted visual structures (glossary, relationships, quality)
  - [x] Strip raw JSON block from final user-facing reply text

- [x] **Phase 3: Ad-Hoc Exploratory Query Tool**
  - [x] Wire `GoogleBigQueryRepository` into `ToolService`
  - [x] Implement `run_overview_query` tool in `ToolService`
  - [x] Add strict SQL checks (only `SELECT`, only active dataset's table, limit rows & bytes)

- [x] **Phase 4: Frontend API Integration**
  - [x] Add `sendDatasetCopilotMessage` method in `web/src/ui/lib/api.ts`
  - [x] Update `getDatasetCopilotData` in `dataset-copilot-service.ts` to fetch dynamic overview data
  - [x] Update hooks to use real data instead of static mock

- [x] **Phase 5: Frontend Interactive Page**
  - [x] Add interactive state and chat loop in `DatasetCopilotPage.tsx`
  - [x] Bind quick actions and suggested prompts
  - [x] Handle action buttons (Save to Dataset, Save to Catalog) to trigger semantic updates and refresh local state

- [x] **Phase 6: Verification & Testing**
  - [x] Compile and verify python services: `pytest`
  - [x] Build frontend app: `npm run build`
  - [x] Manually verify end-to-end chat flow
