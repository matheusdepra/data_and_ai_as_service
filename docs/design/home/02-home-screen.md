# 02-home-screen.md

# Home Screen Specification

Version: 1.0
Status: Draft

---

# Purpose

The Home screen is not a dashboard.

The Home screen is a launchpad.

Its primary goal is helping users start meaningful work as quickly as possible.

Users should immediately understand:

* What they can do
* What they were working on
* What Dativerso recommends next

The Home screen should never feel like an administration portal.

---

# User Goals

When arriving on the Home screen, users typically want to:

* Upload new data
* Continue existing work
* Open a workspace
* Explore available assets
* Follow AI recommendations

The Home screen must reduce decision friction.

---

# Layout Structure

```text
┌ Sidebar ───────────────┐┌──────────────────────────────────────┐
│                        ││ Header                              │
│                        │├──────────────────────────────────────┤
│                        ││ Hero Section                        │
│                        │├──────────────────────────────────────┤
│                        ││ Continue Working                    │
│                        │├──────────────────────────────────────┤
│                        ││ Recent Activity                     │
│                        │├──────────────────────────────────────┤
│                        ││ AI Suggestions                      │
│                        │└──────────────────────────────────────┘
└────────────────────────┘
```

---

# Header

## Breadcrumb

```text
Home
```

---

## Search

Placeholder:

```text
Search datasets, workspaces or ask Dativerso...
```

---

## Right Actions

```text
Notifications

Profile
```

---

# Hero Section

## Purpose

This is the most important area on the screen.

Users should immediately understand what Dativerso helps them build.

---

## Title

```text
What would you like to build today?
```

---

## Subtitle

```text
Build datasets, analytics assets and dashboards with AI assistance.
```

---

## Primary Actions

Display as large action cards.

### Upload Dataset

Description:

```text
Import CSV, Excel, JSON or Parquet files.
```

---

### Create Workspace

Description:

```text
Start a new AI-guided workspace.
```

---

### Explore Catalog

Description:

```text
Browse datasets, assets and dashboards.
```

---

## Visual Guidelines

* Large cards
* Strong spacing
* Easy click targets
* No dense information

---

# Continue Working

## Purpose

Allow users to quickly return to active work.

---

## Section Title

```text
Continue Working
```

---

## Content

Display recently active workspaces.

Each card contains:

```text
Workspace Name

Short Description

Last Updated

Open Workspace
```

---

## Example

```text
Customer Analytics

Cross customer, orders and payments data.

Updated 2 hours ago

Open Workspace
```

---

```text
Fleet Monitoring

Monitor vehicle operational metrics.

Updated yesterday

Open Workspace
```

---

## Maximum Items

```text
5
```

---

# Recent Activity

## Purpose

Provide awareness of recent actions.

---

## Section Title

```text
Recent Activity
```

---

## Format

Timeline layout.

---

## Example Events

```text
Dataset uploaded

customers.csv

10 minutes ago
```

---

```text
Workspace created

Customer Analytics

1 hour ago
```

---

```text
Dashboard generated

Sales Overview

Yesterday
```

---

## Maximum Items

```text
10
```

---

# AI Suggestions

## Purpose

Surface opportunities discovered by Dativerso.

This section introduces proactive AI assistance.

---

## Section Title

```text
Suggested Next Steps
```

---

## Examples

### Relationship Suggestion

```text
Potential relationship found

Customer Dataset
↔
Orders Dataset

94% confidence
```

---

### Workspace Suggestion

```text
Suggested workspace

Customer Analytics

Based on recently uploaded datasets
```

---

### Asset Suggestion

```text
Potential asset

Customer 360

Estimated confidence: 89%
```

---

## Actions

Suggestions may contain:

```text
Review

Open

Dismiss
```

---

# Right Side Panel (Optional Future Enhancement)

Future versions may contain a compact AI assistant panel.

Examples:

```text
What can I build with my latest datasets?

Show recently uploaded files

Suggest a new workspace
```

Not required for MVP.

---

# Empty State

If the user has no datasets or workspaces:

---

## Message

```text
Welcome to Dativerso
```

---

## Description

```text
Upload your first dataset and let Dativerso help you build insights, datasets and dashboards.
```

---

## Primary Action

```text
Upload Dataset
```

---

# Design Rules

## Prioritize

* Simplicity
* Discoverability
* Clear actions
* AI recommendations

---

## Avoid

Do not display:

```text
Total Rows

Storage Usage

Bucket Size

Files Processed

Infrastructure Metrics

Pipeline Statistics

Database Metrics
```

These metrics provide little value to business users.

---

# Success Criteria

A user should be able to:

1. Understand the platform purpose within 5 seconds
2. Start a new activity within 10 seconds
3. Return to active work within 5 seconds
4. Discover AI recommendations naturally

The Home screen should feel like the entry point to an AI-powered data workspace, not a traditional data platform.
