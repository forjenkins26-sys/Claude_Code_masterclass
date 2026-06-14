# We just need to change the Objective everytime based on our expectation objective

# Objective

We have to generate a playwright automation framework from scratch for the www.[facebook.com](https://www.facebook.com/), where you need to create page object model, proper production ready.

# Based on below framework convert it into prompt based on our above requirement


# RICEPOT Framework

A structured prompt engineering framework for AI interactions. Use this template to craft precise, effective prompts.

---

## R — Role

Define persona AI should adopt.

**Example:**

Act as a QA Functional Tester with 15 years of experience, expert in functional testing. Task: write test cases for a given objective.

---

## I — Instructions

Tell AI exactly what to do.

**Example:**

Write complete test cases for both functional and non-functional scenarios based on the attached PRD. Use Jira format — include all required columns.

---

## C — Context

Background info explaining the why and where.

**Example:**

This is a Salesforce Login Page used by enterprise sales teams. Auth handled via SSO. No guest access allowed.

---

## E — Example

Provide sample output or format to guide style.

**Example:**

Provide a test case row showing: Test ID, Summary, Preconditions, Steps, Expected Result, Priority, Labels.

---

## P — Parameters

Constraints on quality, accuracy, and style.

**Example:**

- Production-level quality, zero bad practices
- No placeholder or mock data
- Each test case must be independently executable

---

## O — Output

Define exact artifacts to produce.

**Example:**

Output only the test case table. No explanations, no preamble, no commentary.

---

## T — Tone

Communication style.

**Example:**

Technical, precise, terse. No filler language.

---

## Anti-Hallucination Rules

Apply these rules when interacting with AI to reduce hallucinations:

- **Do not assume** default or typical system behaviour
- **If information is missing or unclear**, respond with: "Insufficient information to determine"
- **If detail is inferred**, label it explicitly as: "Inferred (low confidence)"
- **Output must be deterministic** and follow proper output format

---

## Usage

When crafting prompts, structure them using RICEPOT sections in order. Not all sections are required for every prompt — use what's relevant to your task.

**Template:**

```markdown
**Role:** [Define persona]

**Instructions:** [Exact task]

**Context:** [Background info]

**Example:** [Sample output]

**Parameters:** [Constraints]

**Output:** [Expected artifacts]

**Tone:** [Communication style]
```
