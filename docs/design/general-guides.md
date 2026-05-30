# Dativerso Frontend Vision & UX Guidelines

You are designing the frontend for Dativerse, a modern SaaS Data Platform focused on data ingestion, preparation, governance, enrichment, lineage and AI-assisted data management.

This is currently a technical MVP, but the frontend architecture and user experience must already be designed to support future AI-powered capabilities without requiring major redesigns.

## Product Vision

Dativerso is not a BI tool.

Dativerso is not an ETL dashboard.

Dativerso is a Data Platform where users upload, organize, enrich, prepare, govern and consume datasets.

Over time, AI agents will become first-class citizens inside the platform, assisting users with:

* dataset understanding
* automatic metadata generation
* schema interpretation
* data quality analysis
* enrichment suggestions
* business descriptions
* lineage explanation
* anomaly detection
* transformation recommendations
* natural language interactions

The frontend must be designed today to accommodate these future capabilities naturally.

---

# Design Principles

The interface must feel:

* modern
* clean
* enterprise-grade
* trustworthy
* scalable
* AI-ready

Reference products:

* Linear
* GitHub
* Vercel
* Stripe
* Supabase
* Datadog

Avoid inspiration from:

* traditional ERP systems
* legacy ETL tools
* cluttered BI dashboards
* old enterprise software

---

# Visual Identity

Use the Dativerso brand identity.

Primary theme:

* Light
* Clean
* Professional

Suggested palette:

Background:

* #FFFFFF
* #FAFBFC
* #F4F6F8

Primary accents:

* #6E5BFF
* #5F4CF0
* #5EC9FF

Text:

* #111827
* #6B7280
* #9CA3AF

Status colors:

* Success: #22C55E
* Warning: #F59E0B
* Error: #EF4444
* Info: #3B82F6

Use gradients subtly.

Avoid excessive visual effects.

Avoid neon aesthetics.

Avoid glassmorphism.

Prioritize readability and clarity.

---

# Navigation Philosophy

Users must always know:

1. Where they are.
2. What is happening.
3. What happened.
4. What they can do next.

Navigation must be effortless.

Mandatory:

* Persistent sidebar
* Breadcrumbs on every authenticated page
* Consistent page hierarchy
* Global search entry point
* Clear page titles
* Contextual actions

Never allow users to feel lost.

---

# Information Architecture

Current core modules:

* Dashboard
* Ingestions
* Datasets
* Catalog
* Data Sources
* Settings

Future modules:

* AI Assistant
* Data Quality
* Lineage
* Governance
* Semantic Layer
* Knowledge Catalog
* Agents

The navigation structure must be prepared for future expansion.

---

# Dashboard

The homepage should focus on operational awareness.

Display:

* Recent activity
* Dataset counts
* Ingestion status
* Pending actions
* Data quality indicators
* Recent datasets

Do not make the homepage chart-heavy.

The dashboard should answer:

"What requires my attention?"

---

# Ingestions

This is one of the most important workflows.

Users should be able to:

* Upload files
* Track processing
* View status
* Understand failures
* Retry operations

Provide timeline-based visualization.

Processing stages should be represented as a clear lifecycle.

Examples:

* File Received
* Validation
* Preparation
* Dataset Creation
* Ready

Technical details should be available but secondary.

Always prioritize human-readable explanations.

---

# Datasets

Datasets are first-class entities.

Dataset pages should eventually support:

* Overview
* Schema
* Sample Data
* Statistics
* Quality Metrics
* AI Generated Description
* Business Context
* Lineage
* Related Datasets

Design pages so these sections can be added later without redesigning the layout.

---

# AI Readiness

AI functionality will become a major part of the platform.

Reserve visual patterns for future AI features.

Examples:

* AI insights panels
* Suggested actions
* Dataset summaries
* Metadata generation
* Quality recommendations
* Conversational assistance

The UI should allow AI-generated content to appear naturally beside human-created content.

Do not hardcode layouts that assume only traditional forms and tables.

---

# Component Guidelines

Prefer reusable components.

Examples:

* DataTable
* EntityHeader
* StatusBadge
* Timeline
* MetadataPanel
* AIInsightCard
* EmptyState
* ErrorState
* LoadingState
* PageHeader
* Breadcrumbs

Keep components composable.

Avoid duplicated UI patterns.

---

# UX Rules

Mandatory:

* Responsive layout
* Keyboard accessibility
* Consistent spacing
* Consistent typography
* Clear loading states
* Clear empty states
* Clear error states

Never use emojis in the interface.

Never use decorative icons without purpose.

Never use visual noise.

Enterprise software should feel calm and focused.

---

# Engineering Rules

Use:

* React
* TypeScript
* Vite
* TanStack Query
* TanStack Table
* React Hook Form
* Zod
* Tailwind
* shadcn/ui

Architecture:

* Feature-based structure
* Shared UI library
* Service layer for API access
* Strong typing
* Reusable patterns

Do not invent backend endpoints.

Do not create mock business logic that does not exist.

Inspect the repository before proposing changes.

Always prefer extensibility over short-term convenience.

The frontend should be built as the foundation of a long-term SaaS data platform.
