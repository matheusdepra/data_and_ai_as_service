# 04-processing-screen.md

# Dataset Processing Specification

Version: 1.0

Status: Draft

---

# Purpose

The Processing Screen communicates progress, discoveries and confidence while Dativerso transforms a raw file into a business-ready dataset.

This screen serves three purposes:

1. Build trust
2. Show progress
3. Surface discoveries early

Users should never feel that the platform is simply "loading".

Users should feel:

> Dativerso is actively understanding my data.

---

# Position in Journey

```text id="wk8g54"
Upload Dataset
↓
Analyzing Dataset
↓
Dataset Processing
↓
Dataset Overview
```

---

# Core UX Principle

Do not show technical execution details.

Avoid:

```text id="m0xw30"
Cloud Run

BigQuery

Bronze

Silver

Gold

ETL

Pipeline

Job Execution

Storage Operations
```

Instead show:

```text id="hnvknz"
Understanding

Classification

Relationships

Business Context

Dataset Creation
```

---

# Page Layout

```text id="x54vci"
┌─────────────────────────────────────────────┬─────────────┐
│                                             │             │
│ Dataset Header                              │ Right Panel │
│                                             │             │
├─────────────────────────────────────────────┤             │
│                                             │             │
│ AI Working Banner                           │             │
│                                             │             │
├─────────────────────────────────────────────┤             │
│                                             │             │
│ Processing Summary Cards                    │             │
│                                             │             │
├─────────────────────────────────────────────┤             │
│                                             │             │
│ Processing Timeline                         │             │
│                                             │             │
├─────────────────────────────────────────────┤             │
│                                             │             │
│ Next Steps                                  │             │
│                                             │             │
└─────────────────────────────────────────────┴─────────────┘
```

---

# Header

## Dataset Icon

Display file type.

Example:

```text id="zsgp24"
CSV
Excel
JSON
Parquet
```

---

## Dataset Name

Example:

```text id="sy4fwo"
Customer Master
```

---

## Ingestion ID

Example:

```text id="c8c4cm"
ING-2026-05-29-001
```

---

## Started Time

Example:

```text id="k0w7nv"
Started 2 minutes ago
```

---

## Processing Badge

Visible on top right.

Example:

```text id="h4nrzr"
Processing
```

Animated indicator.

---

# AI Working Banner

## Purpose

Reassure users that Dativerso is actively generating intelligence.

---

## Title

```text id="30d7hb"
Dativerso AI is working for you
```

---

## Description

```text id="l9twxs"
Analyzing your data, understanding its context and preparing it for the catalog.
```

---

## AI Confidence

Display current confidence score.

Example:

```text id="c0azv7"
94%
```

---

# Processing Summary Cards

## Purpose

Provide quick understanding of what has already been discovered.

---

## Card 1

Estimated Completion

Example:

```text id="dz1p26"
1 minute remaining
```

---

## Card 2

Rows Detected

Example:

```text id="td3rtn"
12,345
```

---

## Card 3

Columns Detected

Example:

```text id="6m6r04"
34
```

---

## Card 4

Detected Language

Example:

```text id="n9k6zg"
English
```

---

## Rules

All cards should display:

```text id="j2r5zj"
Value

Confidence

Discovery Status
```

---

# Processing Timeline

## Purpose

This is the main component on the page.

The timeline transforms technical execution into understandable progress.

---

## Timeline Structure

Completed:

```text id="xsrkm2"
Green
```

Current:

```text id="pwf4bk"
Purple
```

Pending:

```text id="2nuwp9"
Gray
```

---

## Standard Steps

### File Received

Description:

```text id="i5mf9o"
File uploaded successfully.
```

---

### Structure Validated

Description:

```text id="l26lkz"
Rows, columns and file structure identified.
```

---

### Metadata Generated

Description:

```text id="jv3g3s"
Column metadata and data types inferred.
```

---

### Business Context Identified

Description:

```text id="0u1qlx"
Business area and domain detected.
```

---

### Detecting Relationships

Description:

```text id="s5k8a7"
Searching for relationships with existing datasets.
```

---

### Preparing Dataset

Description:

```text id="yrd1f7"
Optimizing structure and preparing dataset assets.
```

---

### Finalizing

Description:

```text id="6e8l4m"
Registering dataset and preparing availability.
```

---

## Status Labels

Example:

```text id="h1dbtw"
Completed

In Progress

Pending
```

---

## Timestamps

Display execution timestamps.

Example:

```text id="7w7xjl"
10:21:15
10:21:18
10:21:24
```

---

# Right Panel

## Purpose

Show discoveries while processing continues.

This area creates anticipation and transparency.

---

# Processing Insights

Show discovered information.

Examples:

```text id="w8jlwm"
Rows

Columns

File Size

File Type

Detected Language

Data Quality
```

---

# Business Classification

Display inferred classification.

Example:

```text id="5gkl7z"
Business Area

Commercial
```

---

```text id="hhj0n5"
Domain

Sales
```

---

```text id="7jb7nn"
Confidence

94%
```

---

# Relationships Detected

Show discoveries as they occur.

Example:

```text id="2b3zjy"
Orders.csv

customer_id
```

---

```text id="8ucjxm"
Contracts.csv

customer_id
```

---

## Actions

```text id="91zj1u"
View Potential Relationships
```

---

# Dataset Being Created

Purpose:

Explain what Dativerso believes the dataset will become.

---

Example:

```text id="ytpp4n"
Customer Master
```

---

Description:

```text id="4r6m4u"
Clean, structured and business-ready dataset for commercial operations.
```

---

# AI Suggestions

Dativerso may begin suggesting outputs before processing completes.

Examples:

```text id="kdymlm"
Customer 360

Commercial Analytics

Customer Insights Dashboard
```

---

Display:

```text id="e6j8rn"
Suggestion Name

Description

Confidence
```

---

# Auto Refresh

Display indicator.

Example:

```text id="6qu7iw"
Auto-refreshing
```

---

Refresh interval:

```text id="4dh7o6"
5 seconds
```

Recommended for MVP.

---

# Cancel Processing

Secondary action.

Display at bottom of timeline.

Example:

```text id="vdfx4v"
Cancel Processing
```

---

Rules:

* Confirmation required
* Explain consequences
* Allow restart later

---

# What Happens Next Section

Located below timeline.

Purpose:

Reduce uncertainty.

---

## Title

```text id="vvfw7m"
What happens next?
```

---

## Description

```text id="vghqfd"
Once processing is complete, you'll be able to explore your dataset, review its schema, preview data and see AI-generated insights.
```

---

## Action

```text id="pv8ww4"
Learn More
```

---
# Processing Outcomes

The processing screen must support multiple outcomes.

The platform should never assume a successful execution path.

Users must always understand:

* What happened
* Why it happened
* What can be done next

---

# Processing States

## Successful

Status:

```text
Processing Complete
```

Description:

```text
Your dataset is ready to explore.
```

Action:

```text
Open Dataset
```

---

## Ready With Warnings

Status:

```text
Ready With Warnings
```

Description:

```text
Your dataset was successfully created, but some recommendations or validations could not be completed.
```

Examples:

* Relationship detection incomplete
* Business classification confidence below threshold
* AI enrichment unavailable
* Some columns could not be classified

Visual Style:

```text
Warning (Yellow)
```

Actions:

```text
View Warnings

Open Dataset
```

---

## Needs Attention

Status:

```text
Needs Attention
```

Description:

```text
Dativerso found issues that require your review before continuing.
```

Examples:

* Ambiguous date formats
* Missing key columns
* Conflicting data types
* Invalid records detected

Visual Style:

```text
Warning (Orange)
```

Actions:

```text
Review Issues

Apply Suggested Fixes

Continue Anyway
```

---

## Processing Failed

Status:

```text
Processing Failed
```

Description:

```text
Dativerso could not process this dataset.
```

Visual Style:

```text
Error (Red)
```

Actions:

```text
View Details

Upload New Version

Contact Support
```

---

# Error Communication Principles

Never expose internal platform terminology.

Avoid:

```text
Bronze failed

Silver transformation failed

Cloud Run Job failed

BigQuery error

Object storage exception
```

Instead use:

```text
We couldn't process the file.

We found invalid records.

We couldn't understand part of the dataset.

Some data needs review.
```

---

# Error Detail Drawer

When users click:

```text
View Details
```

Open a side drawer.

Structure:

## What Happened

Human-readable explanation.

Example:

```text
Some records contain invalid CSV formatting.
```

---

## Why It Happened

Example:

```text
Several rows contain unclosed quotation marks.
```

---

## How To Fix

Example:

```text
Review the rows indicated below and upload a corrected version.
```

---

## Technical Details

Collapsed by default.

Example:

```text
Line 18,532

Column customer_name

CSV parsing error
```

Technical details are intended for advanced users and support teams.

---

# AI-Assisted Recovery

Whenever possible, Dativerso should suggest automatic fixes.

Example:

```text
Date formats detected:

MM/DD/YYYY
DD/MM/YYYY
```

Suggested action:

```text
Standardize all dates to YYYY-MM-DD
```

Buttons:

```text
Apply Fix

Ignore
```

---

# Reprocessing Mode

Processing may occur more than once.

Examples:

* User updated metadata
* User approved suggested fixes
* User uploaded a replacement file
* User corrected relationships

---

## Initial Processing

Banner:

```text
Dativerso is understanding your data.
```

---

## Reprocessing

Banner:

```text
Dativerso is updating its understanding based on your changes.
```

---

## Timeline Example

```text
✓ Previous analysis archived

✓ Metadata changes applied

⏳ Rebuilding relationships

⏳ Updating recommendations

⏳ Regenerating outputs
```

---

# Dataset Lifecycle Status

Datasets may have one of the following statuses:

```text
Draft

Processing

Ready

Ready With Warnings

Needs Attention

Failed
```

These statuses should be visible throughout the platform, including:

* Dataset Overview
* Catalog
* Workspace Context
* Dataset Search Results

---

# Success Criteria

Users should never be left wondering:

* What failed
* Why it failed
* Whether data was lost
* What action should be taken next
* Understand that Dativerso is actively working
* Understand what has already been discovered
* Trust the classification process
* Feel informed while waiting
* Anticipate the value of the resulting dataset


Every failure must provide a clear path forward.


The screen should feel like watching an analyst investigate the dataset, not watching a background job execute.
