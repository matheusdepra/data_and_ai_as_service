# 06-dataset-copilot.md

# Dataset Copilot Specification

Version: 1.0

Status: Draft

---

# Purpose

The Dataset Copilot transforms a static dataset into an interactive conversation.

Users should be able to understand, explore and improve a dataset using natural language.

This screen is focused on understanding.

It is not intended for creating dashboards, building data products or combining multiple datasets.

Those activities belong to the Workspace experience.

---

# Position in Journey

```text
Home
↓
Upload Dataset
↓
AI Analysis
↓
Processing
↓
Dataset Overview
↓
Dataset Copilot
↓
Workspace
```

---

# Core UX Principle

Dataset Copilot answers:

```text
What is this dataset?

What does this column mean?

What quality issues exist?

What relationships were found?

What business concepts are present?

How can this dataset be improved?
```

---

# Explicit Non-Goals

Dataset Copilot should not become a generic assistant.

Avoid turning it into:

```text
Dashboard Builder

Data Product Builder

ETL Designer

Workspace Creator

General ChatGPT
```

Those capabilities belong to Workspace.

---

# Layout Structure

```text
┌──────────────────────────────────────────────┬─────────────┐
│                                               │             │
│ Dataset Header                                │ Context     │
│                                               │ Panel       │
├───────────────────────────────────────────────┤             │
│                                               │             │
│ Quick Actions                                 │             │
│                                               │             │
├───────────────────────────────────────────────┤             │
│                                               │             │
│ Conversation                                  │             │
│                                               │             │
│                                               │             │
│                                               │             │
│                                               │             │
├───────────────────────────────────────────────┤             │
│                                               │             │
│ Chat Input                                    │             │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

---

# Header

## Dataset Name

Example:

```text
Customer Master Copilot
```

---

## Subtitle

```text
Chat with your dataset and unlock insights.
```

---

## Actions

```text
Share

Export Chat
```

---

# Quick Actions

## Purpose

Reduce prompt engineering.

Users should not need to invent questions.

---

## Examples

### Understand Dataset

```text
What is this dataset about?
```

---

### Find Quality Issues

```text
Identify quality problems.
```

---

### Generate Glossary

```text
Create business glossary.
```

---

### Find Relationships

```text
Show related datasets.
```

---

### Suggest Outputs

```text
Recommend analytical outputs.
```

---

### Describe Columns

```text
Explain column meanings.
```

---

# Conversation Area

## Purpose

Main working area.

The conversation is the primary interface.

---

## Assistant Messages

Responses should be rich and contextual.

Not plain text only.

---

## Allowed Response Types

### Explanation Card

Example:

```text
Dataset Summary

Business Context

Recommended Usage

Relationships
```

---

### Glossary Table

Example:

```text
Term

Definition

Data Type

Example
```

---

### Quality Assessment

Example:

```text
Quality Score

Issues Found

Suggested Improvements
```

---

### Relationship Analysis

Example:

```text
Related Datasets

Confidence

Relationship Keys
```

---

### Metadata Suggestions

Example:

```text
Title

Domain

Description

Tags
```

---

# Conversation Actions

Each AI response may contain:

```text
Like

Dislike

Copy

Save
```

---

# Saveable Knowledge

Important discoveries can be persisted.

Examples:

```text
Business Glossary

Dataset Description

Business Terms

Metadata Improvements
```

---

## Save Actions

Example:

```text
Save to Dataset

Save to Catalog
```

---

# Context Panel

## Purpose

Maintain dataset awareness during conversation.

The user should never lose context.

---

# Dataset Summary

Display:

```text
Dataset Name

Status

Rows

Columns

Size

Quality Score

Last Updated
```

---

# Relationships

Display:

```text
Detected Relationships

Confidence

Related Datasets
```

---

## Action

```text
View All
```

---

# Suggested Outputs

Purpose:

Show inspiration.

Not execution.

---

Examples:

```text
Customer 360

Commercial Analytics

CRM Gold Layer
```

---

## Actions

```text
Open Suggestion

View All
```

---

# Chat Input

Placeholder:

```text
Ask anything about this dataset...
```

---

# Suggested Prompts

Generated dynamically.

Examples:

```text
What are the most important columns?

What quality issues exist?

What datasets can be related?

Explain this dataset to a business user.

Create a business glossary.

Suggest metadata improvements.
```

---

# AI Boundaries

The assistant should remain scoped to the current dataset.

When the user asks:

```text
Create a Customer 360.
```

The assistant should respond:

```text
This requires combining multiple datasets.

Would you like to open a Workspace?
```

---

When the user asks:

```text
Build a dashboard.
```

The assistant should respond:

```text
Dashboards are created through Workspaces.

Open Workspace?
```

---

# Empty State

For first access.

Message:

```text
Ask your first question about this dataset.
```

Suggestions:

```text
What is this dataset about?

Explain the columns.

Find quality issues.

Generate a glossary.
```

---

# Export Chat

Supported formats:

```text
PDF

Markdown

HTML
```

---

# Share Chat

Create a shareable conversation snapshot.

Use cases:

```text
Business Review

Data Steward Review

Governance Approval
```

---

# Explicitly Avoid

Do not display:

```text
SQL

dbt Models

Cloud Run

BigQuery

Bronze

Silver

Gold Processing Logic
```

These concepts belong to advanced views or Workspace experiences.

---

# Success Criteria

Users should be able to:

1. Understand a dataset without technical knowledge
2. Discover relationships
3. Improve metadata
4. Identify quality issues
5. Create business documentation
6. Build confidence before moving to Workspace

The Dataset Copilot should feel like talking to a data analyst that knows everything about a single dataset.
