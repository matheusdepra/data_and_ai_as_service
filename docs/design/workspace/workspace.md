# 07-workspace-chat.md

# Workspace Specification

Version: 1.0

Status: Draft

---

# Purpose

Workspace is the primary value creation environment in Dativerso.

Users interact with data through conversation.

The goal is not to explore datasets.

The goal is to create business assets.

Examples:

* Analytical datasets
* Business views
* Metrics
* Dashboards
* Reports
* Semantic models

Workspace is where ideas become assets.

---

# Position in Journey

```text
Dataset Overview
↓
Dataset Copilot
↓
Workspace
↓
Asset
↓
Dashboard
```

---

# Core UX Principle

Users should think:

```text
I want to build something.
```

Not:

```text
I need to configure a pipeline.
```

---

# Primary Responsibilities

Workspace allows users to:

```text
Combine datasets

Create business assets

Generate analytical views

Explore relationships

Create dashboards

Build reusable outputs
```

Using natural language.

---

# Layout Structure

```text
┌──────────────────────────────────────────────┬─────────────┐
│                                               │             │
│ Workspace Header                              │ Context     │
│                                               │ Panel       │
├───────────────────────────────────────────────┤             │
│                                               │             │
│ Conversation                                  │             │
│                                               │             │
│                                               │             │
│                                               │             │
│                                               │             │
├───────────────────────────────────────────────┤             │
│                                               │             │
│ Workspace Input                               │             │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

---

# Header

## Workspace Name

Example:

```text
Customer Analytics
```

---

## Metadata

Example:

```text
Workspace

Created Today
```

---

## Actions

```text
Share

New

History
```

---

# Conversation Area

## Purpose

Primary working surface.

Everything begins through conversation.

---

# Example Flow

User:

```text
Cross customer data with orders.
```

---

Assistant:

```text
Possible relationship found.

Customer Dataset

Orders Dataset

Join Confidence

94%
```

---

Assistant generates:

```text
Potential Output

Customer Order Analytics
```

---

User:

```text
Show me the result.
```

---

Assistant generates preview.

---

User:

```text
Looks good.
```

---

Assistant:

```text
Create Dataset

Save Draft

Modify
```

---

# Supported Response Types

## Relationship Discovery

Show:

```text
Dataset A

Dataset B

Relationship Key

Confidence
```

---

## Asset Proposal

Show:

```text
Asset Name

Description

Sources

Confidence
```

---

## Data Preview

Show:

```text
Columns

Sample Data

Expected Metrics
```

---

## Dashboard Preview

Future capability.

Show:

```text
Charts

KPIs

Filters
```

---

## Quality Analysis

Show:

```text
Completeness

Coverage

Potential Risks
```

---

# Available Datasets Panel

## Purpose

Display workspace context.

Datasets available to the AI.

---

## Display

```text
Dataset Name

Rows

Columns

Status
```

---

## Actions

```text
Add Dataset

Remove Dataset
```

---

# Generated Assets Panel

## Purpose

Track assets created inside the workspace.

---

## Asset Types

```text
Dataset

Dashboard

Report

Semantic Layer
```

---

## Asset Status

```text
Draft

Ready

Published
```

---

# Suggested Ideas

## Purpose

Inspire users.

Not mandatory.

---

## Examples

```text
Customer 360

Sales Performance

Customer Segmentation

Churn Prediction
```

---

## Actions

```text
Use Idea

Dismiss
```

---

# Workspace Input

Placeholder:

```text
Describe what you want to build...
```

---

# Suggested Prompts

Examples:

```text
Cross customers with orders

Create a customer 360

Build a sales dashboard

Find customer segments

Generate a churn analysis

Create a business glossary
```

---

# Asset Creation Flow

The assistant should always follow:

```text
Understand Request
↓
Find Datasets
↓
Explain Reasoning
↓
Generate Preview
↓
Request Approval
↓
Create Asset
```

Never:

```text
Create Immediately
```

---

# Explainability Requirement

Before creating assets the assistant must explain:

```text
Why datasets were selected

Relationships used

Confidence

Expected output
```

---

# Save Draft

Users may save unfinished work.

Status:

```text
Draft
```

---

# Share Workspace

Workspace snapshots can be shared.

Use cases:

```text
Business Review

Data Governance

Team Collaboration
```

---

# Explicitly Avoid

Do not expose:

```text
SQL by default

dbt models

ETL flows

Cloud resources

Infrastructure components
```

These may exist in advanced views but should never be the primary experience.

---

# Success Criteria

Users should be able to:

1. Describe a business problem
2. Receive AI guidance
3. Preview a solution
4. Approve creation
5. Generate assets without technical knowledge

Workspace should feel like collaborating with an experienced data analyst rather than operating a data platform.
