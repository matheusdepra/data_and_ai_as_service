# 98-ui-architecture.md

# Dativerso UI Architecture

Version: 1.0

Status: Foundation

---

# Purpose

This document defines the shared UI architecture for the entire Dativerso frontend.

The objective is to maximize component reuse and visual consistency.

All screens must be assembled from reusable components.

Avoid screen-specific implementations whenever possible.

---

# Design Philosophy

Dativerso should feel closer to:

* Linear
* Vercel
* Stripe Dashboard
* Notion
* Perplexity

Than:

* Bootstrap Admin Templates
* AdminLTE
* Generic CRUD Systems
* Traditional Enterprise Applications

---

# Design Characteristics

```text
Minimal

Clean

Spacious

Professional

AI-First

Data-Centric
```

---

# Layout Rules

## Page Width

```text
Max Width: 1600px
```

---

## Sidebar

```text
Width: 260px
```

Collapsed:

```text
Width: 72px
```

---

## Content Padding

```text
32px
```

---

## Section Gap

```text
24px
```

---

## Card Gap

```text
16px
```

---

# Shared Components

## AppShell

Purpose:

Global application layout.

Contains:

* Sidebar
* Top Navigation
* Main Content

Used by:

All authenticated pages.

---

## Sidebar

Purpose:

Primary navigation.

Sections:

```text
Home

Workspaces

Catalog

Sources
```

---

## PageHeader

Purpose:

Top area of every page.

Contains:

```text
Title

Description

Actions

Breadcrumbs
```

---

## Breadcrumbs

Required on all pages except:

```text
Login
Home
```

Example:

```text
Catalog
/
Customer Assets
/
Customer Analytics
```

---

## SectionHeader

Purpose:

Reusable section title component.

Contains:

```text
Title

Description

Action
```

---

## AssistantPanel

Purpose:

Shared AI interaction panel.

Used by:

```text
Dataset Copilot

Catalog Copilot

Dashboard Analyst

Workspace Assistant
```

Props:

```ts
title
placeholder
suggestions
```

---

## AssetCard

Purpose:

Universal asset representation.

Used for:

```text
Dataset

Dashboard

Business Asset

Glossary
```

Displays:

```text
Name

Type

Description

Trust Score

Last Updated
```

---

## MetricCard

Purpose:

Display KPI values.

Displays:

```text
Label

Value

Trend

Comparison
```

---

## InsightCard

Purpose:

Display AI-generated findings.

Displays:

```text
Title

Summary

Impact

Confidence
```

---

## StatusBadge

Purpose:

Display status consistently.

Values:

```text
Ready

Draft

Processing

Failed

Needs Attention

Published
```

---

## EmptyState

Purpose:

Handle empty screens.

Contains:

```text
Title

Description

Action
```

---

## LoadingState

Purpose:

Skeleton loading.

Must exist for:

```text
Tables

Cards

Charts

AI Panels
```

---

## ErrorState

Purpose:

Error handling.

Contains:

```text
Message

Reason

Retry Action
```

---

# Data Components

## DataTable

Based on:

TanStack Table

Features:

```text
Sorting

Filtering

Pagination

Column Visibility

Export
```

---

## DataPreviewTable

Purpose:

Dataset previews.

Used in:

```text
Dataset Overview

Workspace

Canvas Preview
```

---

# Visualization Components

## LineChartCard

## BarChartCard

## DonutChartCard

## AreaChartCard

All charts must share:

```text
Header

Description

Actions

Export
```

---

# Workspace Components

## DatasetNode

Canvas dataset block.

Displays:

```text
Dataset Name

Rows

Columns

Confidence
```

---

## RelationshipEdge

Displays:

```text
Relationship Key

Confidence

Type
```

---

## OutputNode

Displays:

```text
Output Name

Status

Confidence
```

---

# Styling Rules

Use:

```text
TailwindCSS

shadcn/ui
```

---

Avoid:

```text
Custom CSS

Inline Styles

CSS Modules

styled-components
```

unless strictly necessary.

---

# Component Composition Rule

Always prefer:

```text
AppShell
 └── PageHeader
 └── SectionHeader
 └── AssetCard
```

Never create duplicated implementations.

---

# Forbidden Patterns

Do not create:

```text
CatalogAssetCard

DashboardAssetCard

WorkspaceAssetCard
```

if AssetCard already exists.

---

Do not create:

```text
CatalogCopilot

DashboardCopilot

DatasetCopilotPanel
```

if AssistantPanel already exists.

---

# Success Criteria

A user navigating from:

```text
Home
↓
Catalog
↓
Dataset
↓
Workspace
↓
Dashboard
```

should feel like they are using one coherent product, not multiple independent applications.
