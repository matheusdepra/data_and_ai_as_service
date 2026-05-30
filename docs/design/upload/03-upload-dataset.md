# 03-upload-dataset.md

# Upload Dataset Specification

Version: 1.0

Status: Draft

---

# Purpose

The Upload Dataset flow is the first meaningful interaction users have with Dativerso.

The objective is not simply uploading a file.

The objective is helping Dativerso understand the data and transform it into business knowledge.

Users should feel:

```text
I uploaded a file.

Dativerso understood it.

Dativerso is helping me use it.
```

---

# Flow Overview

The Upload Dataset experience consists of three states:

```text
Waiting for Upload
↓
Analyzing Dataset
↓
Review AI Understanding
```

---

# State 1 — Waiting for Upload

## Purpose

Allow users to upload data while understanding what Dativerso will do next.

---

## Page Title

```text
Upload Dataset
```

---

## Subtitle

```text
Import your file and let Dativerso understand your data.
```

---

## Main Area

Large centered Dropzone.

---

### Supported Actions

```text
Drag and Drop

Select File
```

---

### Supported Formats

```text
CSV

Excel

JSON

Parquet
```

---

### Maximum Size

```text
2 GB
```

Configurable in future.

---

## AI Assistant Panel

Visible on the right.

Purpose:

Explain what Dativerso will do.

---

### Capabilities

```text
Understand your dataset

Suggest metadata

Find relationships

Recommend outputs
```

---

### Tips Section

Examples:

```text
Files with clear headers work best

Include important key columns

Larger files may take longer to analyze
```

---

## Guidelines Cards

Displayed below upload area.

Examples:

```text
Clean and structured data

Meaningful headers

Consistent formats

Relationships matter
```

---

## Design Principles

Do not show:

```text
Buckets

Landing

Bronze

Silver

BigQuery

Storage Details
```

Users should not be exposed to platform architecture.

---

# State 2 — Analyzing Dataset

## Purpose

Show that Dativerso is actively understanding the uploaded data.

Focus on progress and discoveries.

---

## Page Title

```text
Analyzing Dataset
```

---

## Subtitle

```text
Dativerso is understanding your data and generating recommendations.
```

---

## Main Area

Large progress section.

---

### Upload Summary

Show:

```text
File Name

File Size

Rows Detected

Columns Detected
```

---

Example:

```text
customers.csv

12,345 rows

34 columns

2.3 MB
```

---

## Analysis Timeline

Display steps.

Example:

```text
✓ File uploaded

✓ Structure identified

⏳ Detecting business context

⏳ Searching relationships

⏳ Generating recommendations
```

---

## AI Discoveries

As analysis progresses.

Example:

```text
Potential customer dataset

Commercial domain detected

Relationship candidate found
```

---

## AI Assistant

Right panel updates dynamically.

Examples:

```text
Customer-related dataset detected

Business context identified

Potential relationships found
```

---

## Estimated Time

Optional.

Display only if analysis exceeds a few seconds.

---

# State 3 — Review AI Understanding

## Purpose

Allow users to validate AI-generated knowledge before continuing.

This is not a configuration screen.

This is a review screen.

---

## Page Title

```text
Upload Dataset
```

---

## Subtitle

```text
Review and refine Dativerso's understanding of your dataset.
```

---

## Dataset Summary Card

Show:

```text
File Name

Rows

Columns

File Size
```

---

Example:

```text
customers.csv

12,345 rows

34 columns

2.3 MB
```

---

# AI Analysis Section

Main section.

---

## Confidence Indicator

Example:

```text
High Confidence

94%
```

---

## AI Generated Metadata

Editable.

Fields:

```text
Title

Business Area

Domain

Description

Tags
```

---

Example:

```text
Customer Master

Commercial

Sales

Customer registration and business relationship dataset.

Customer
CRM
Sales
Master Data
```

---

# Potential Relationships

Purpose:

Show what Dativerso discovered.

---

Example:

```text
customers.csv
    ↓
orders.csv

High confidence
```

---

```text
customers.csv
    ↓
contracts.csv

Medium confidence
```

---

## Actions

```text
Review Relationships

View All
```

---

# Business Terms Detected

Examples:

```text
Customer

Account

Contract

Sales Region

Registration Date
```

---

# Dataset Understanding Score

Composite score.

---

Example:

```text
96%
```

Breakdown:

```text
Structure

Business Context

Relationships
```

---

# Suggested Outputs

Purpose:

Show what Dativerso believes can be built.

Examples:

```text
Customer 360

Commercial Analytics

CRM Gold Dataset
```

---

Each suggestion contains:

```text
Description

Confidence

Required Sources
```

---

# AI Assistant Panel

Purpose:

Explain AI decisions.

Examples:

```text
Why was this dataset classified as Commercial?

Explain detected relationships

Generate better description

Suggest additional tags
```

---

# Primary Actions

Bottom of screen.

---

Secondary:

```text
Save Metadata
```

---

Primary:

```text
Continue Processing
```

---

# Success Criteria

Users should:

1. Understand what Dativerso discovered
2. Trust the AI recommendations
3. Make corrections if necessary
4. Continue without needing technical knowledge

The screen should feel like reviewing an analyst's work rather than configuring a data platform.
