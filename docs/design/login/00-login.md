# 00-auth-login.md

# Authentication - Login Screen Specification

Version: 1.0

Status: Draft

---

# Purpose

The Login Screen is the entry point to Dativerso.

Its purpose is to provide a secure and frictionless authentication experience while hiding tenancy complexity from end users.

Users should only need to know:

* Their email address
* Their password (if applicable)

Users should never need to know:

* Tenant IDs
* Organization IDs
* Workspace IDs
* Internal system concepts

---

# Authentication Methods

Dativerso supports two authentication methods.

## Primary

Magic Link

Recommended for:

* Business users
* Non-technical users
* First-time users

---

## Secondary

Email and Password

Recommended for:

* Frequent users
* Enterprise environments
* Fallback authentication

---

# Authentication Flow

## Magic Link Flow

```text
Enter Email
↓
Send Magic Link
↓
Check Email
↓
Open Link
↓
Authenticate
↓
Resolve Tenant
↓
Open Application
```

---

## Password Flow

```text
Email
↓
Password
↓
Authenticate
↓
Resolve Tenant
↓
Open Application
```

---

# Layout Structure

```text
┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│ Brand Area              │ Login Card              │
│                          │                          │
│ Dativerso               │ Magic Link              │
│ Product Message         │                          │
│ Benefits                │ Password Login          │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

---

# Visual Identity

Use the Dativerso brand palette.

Primary Colors:

```css
#6E5BFF
#5EC9FF
```

---

Theme:

```text
Light
Professional
Clean
Minimal
```

---

Avoid:

```text
Dark enterprise login pages

Heavy gradients

Marketing-heavy layouts

Generic SaaS templates
```

---

# Left Panel

## Purpose

Explain product value.

Not marketing.

Not sales.

Users should immediately understand what Dativerso does.

---

# Logo

Display:

```text
Dativerso
```

---

# Headline

```text
AI Data Workspace
```

---

# Description

```text
Upload, understand and transform data through conversation.
```

---

# Value Propositions

Display three cards.

---

## Upload Any Dataset

```text
Connect your data from multiple sources in seconds.
```

---

## Understand with AI

```text
Ask questions and get instant insights about your data.
```

---

## Build Data Assets

```text
Create datasets, metrics and dashboards without writing code.
```

---

# Right Panel

## Purpose

Authentication only.

Keep simple.

Keep focused.

---

# Title

```text
Sign in to Dativerso
```

---

# Subtitle

```text
Access your data workspace.
```

---

# Magic Link Section

## Label

```text
Magic Link (Recommended)
```

---

## Input

```text
Work Email
```

---

## Placeholder

```text
name@company.com
```

---

## Primary Action

```text
Send Magic Link
```

---

# Success State

After submission:

---

## Title

```text
Check your inbox
```

---

## Description

```text
We sent a secure sign-in link to your email address.
```

---

## Secondary Actions

```text
Resend Link

Use Another Email
```

---

# Password Login Section

Collapsed by default.

---

## Link

```text
Sign in with password
```

---

When expanded:

---

## Fields

```text
Email

Password
```

---

## Actions

```text
Remember Me

Forgot Password
```

---

## Button

```text
Sign In
```

---

# Tenant Resolution

Tenant selection must never occur before authentication.

---

# Single Tenant User

Example:

```text
matheus@company.com
```

↓

```text
Acme Corp
```

↓

```text
Open Application
```

---

# Multiple Tenant User

Example:

```text
matheus@consulting.com
```

↓

```text
Tenant Selection Screen
```

---

Display:

```text
Choose Organization
```

---

Example:

```text
Acme Corp

Contoso Ltd

Dativerso Demo
```

---

# Unknown User

When email is not registered.

---

## Message

```text
We couldn't find an account associated with this email.
```

---

## Action

```text
Contact your company administrator.
```

---

Avoid revealing:

```text
Whether an email exists

Internal organization information

Authentication details
```

---

# Forgot Password

Flow:

```text
Enter Email
↓
Send Reset Link
↓
Check Email
↓
Reset Password
```

---

# Session Handling

Support:

```text
Remember Me

Persistent Session

Secure Logout
```

---

# Error States

## Invalid Credentials

```text
Invalid email or password.
```

---

## Expired Magic Link

```text
This sign-in link has expired.
```

Action:

```text
Send New Link
```

---

## Too Many Attempts

```text
Too many login attempts.

Please try again later.
```

---

## Service Unavailable

```text
Authentication is temporarily unavailable.

Please try again later.
```

---

# Accessibility Requirements

Must support:

```text
Keyboard Navigation

Screen Readers

Visible Focus States

Accessible Labels

Accessible Error Messages
```

---

# Responsive Behavior

Desktop:

```text
Split Layout
```

---

Tablet:

```text
Compressed Split Layout
```

---

Mobile:

```text
Single Column
```

Login form appears first.

Brand content moves below.

---

# Security Requirements

Do not expose:

```text
Tenant IDs

User IDs

Internal Errors

Authentication Providers

Infrastructure Details
```

---

# Explicitly Avoid

Do not ask for:

```text
Tenant ID

Organization Code

Company Slug

Workspace ID
```

Tenant discovery must happen after authentication.

---

# Success Criteria

Users should be able to:

1. Understand what Dativerso does within 5 seconds
2. Authenticate in less than 30 seconds
3. Access the correct tenant automatically
4. Use Magic Link without technical knowledge
5. Recover access without contacting support

The login experience should feel modern, secure and effortless.
