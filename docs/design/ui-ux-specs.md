# Dativerso UI/UX Specification

Version: 1.0
Status: Draft
Scope: Design Principles, Visual Identity and Global Layout

---

# 1. Design Principles

## 1.1 Product Vision

Dativerso is not a Data Catalog, ETL Tool, Data Lake UI or Dashboard Builder.

Dativerso is an AI-powered Data Workspace where users build knowledge, datasets, metrics and analytical assets through conversation.

The platform should always prioritize:

1. Understanding before data
2. Conversation before configuration
3. Outcomes before technology
4. Simplicity before flexibility
5. AI guidance before manual setup

Users should think:

> "I want to build something with data."

Instead of:

> "I need to configure a pipeline."

The product experience should feel like working with an intelligent data analyst rather than operating a traditional data platform.

---

## 1.2 Target Audience

Primary audience:

* Business users
* Analysts
* Operations teams
* Commercial teams
* Managers
* Non-technical professionals

Secondary audience:

* Data analysts
* Data engineers
* Data stewards

The product must always optimize the experience for non-technical users first.

Technical complexity should remain hidden whenever possible.

---

## 1.3 UX Philosophy

The user journey should follow:

```text
Idea
↓
Conversation
↓
Understanding
↓
Preview
↓
Asset
↓
Decision
```

Avoid flows that require users to understand:

* ETL concepts
* Medallion architecture
* Storage layers
* Technical pipelines
* Infrastructure components

Implementation details belong to the platform, not to the user experience.

---

## 1.4 AI-First Experience

Artificial Intelligence is the primary interaction model.

Users should be able to:

* Ask questions
* Request transformations
* Build datasets
* Generate dashboards
* Explore relationships
* Improve data quality

Using natural language.

The interface should encourage conversation before configuration.

---

## 1.5 Visual Inspiration

Primary references:

* Linear
* Notion
* Stripe Dashboard
* Figma
* ChatGPT
* Perplexity

Avoid visual references from:

* Airflow
* Talend
* Pentaho
* Informatica
* Traditional ETL tools
* Traditional BI administration portals

The experience should feel modern, clean and product-oriented.

---

# 2. Visual Identity

## 2.1 Theme

Default theme:

Light Theme

The interface must feel bright, clean and professional.

Dark mode may be added in future releases.

---

## 2.2 Color Palette

Colors are derived from the Dativerso brand identity.

### Primary

```css
#6E5BFF
```

### Secondary

```css
#5EC9FF
```

### Accent

```css
#8B5CF6
```

### Background

```css
#FFFFFF
```

### Surface

```css
#F8F9FC
```

### Border

```css
#E8EBF2
```

### Text Primary

```css
#101828
```

### Text Secondary

```css
#667085
```

### Success

```css
#12B76A
```

### Warning

```css
#F79009
```

### Error

```css
#F04438
```

---

## 2.3 Typography

Preferred fonts:

```text
Inter
```

Fallback:

```text
Segoe UI
Helvetica Neue
Arial
```

Guidelines:

* Clear hierarchy
* Large headings
* Comfortable spacing
* Minimal visual noise

---

## 2.4 Icons

Use:

* Lucide
* Heroicons

Guidelines:

* Simple line icons
* Consistent stroke width
* Professional appearance

Do not use:

* Emojis
* Decorative icons
* Cartoon-style illustrations

---

# 3. Global Layout

All screens must follow a consistent structure.

```text
┌ Sidebar ───────────────┐┌──────────────────────────────────────┐
│                        ││ Top Navigation                       │
│                        │├──────────────────────────────────────┤
│                        ││                                      │
│                        ││ Main Content                         │
│                        ││                                      │
│                        ││                                      │
│                        ││                                      │
│                        │└──────────────────────────────────────┘
└────────────────────────┘
```

---

## 3.1 Sidebar

### Width

```text
280px
```

### Behavior

* Fixed position
* Always visible on desktop
* Collapsible in future versions
* Consistent across all screens

### Navigation Items

```text
Home

Workspaces

Datasets

Catalog

Sources
```

### Workspace Context

When inside a workspace:

```text
Current Workspace

Canvas
Chat
Outputs
History
```

### User Area

Located at the bottom of the sidebar.

Contains:

```text
User Name
Tenant
Environment
Profile Menu
```

### Do Not Include

```text
Administration
ETL
Pipelines
Jobs
Infrastructure
Servers
Clusters
```

Settings should be available only through the user profile menu.

---

## 3.2 Top Navigation

### Left Section

Breadcrumbs

Example:

```text
Home > Workspaces > Customer Analytics
```

---

### Center Section

Global Search

Placeholder:

```text
Search datasets, workspaces or ask Dativerso...
```

Future capability:

```text
Natural language search
```

Examples:

```text
Show customer datasets

Find sales dashboards

Build a customer 360

What datasets contain contracts?
```

---

### Right Section

Contains:

```text
Notifications

Share

Export

Profile Menu
```

Actions may vary depending on the current screen.

---

## 3.3 Main Content Area

The main content area should always prioritize:

1. Primary user action
2. AI-generated guidance
3. Relevant context
4. Secondary actions

Avoid clutter.

Every screen must have a single obvious focal point.

Examples:

* Home → What would you like to build today?
* Dataset → Understanding the dataset
* Copilot → Conversation
* Workspace → Building assets
* Canvas → Visual relationships

---

## 3.4 Responsive Behavior

Desktop-first design.

Minimum supported resolution:

```text
1440 x 900
```

Recommended resolution:

```text
1920 x 1080
```

Future mobile support should prioritize:

* Home
* Catalog
* Dataset Overview

Complex workspace interactions may remain desktop-only.
