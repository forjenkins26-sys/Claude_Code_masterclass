# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace

QA Portfolio — showcase of QA automation skills, AI-powered testing tools, and n8n agent workflows built during Claude Code masterclass.

## Live URL
https://anand-soni-qa-portfolio.vercel.app

## Deploy Command
```powershell
cd "c:\ClaudeCodeMasterclass\QA Portfolio"
vercel deploy --prod --yes --scope anandsoni2641-1308s-projects --token $env:VERCEL_TOKEN
```
Token in `.env` → `VERCEL_TOKEN`

## Parent Project

This folder lives inside `c:\ClaudeCodeMasterclass\`. Refer to `c:\ClaudeCodeMasterclass\CLAUDE.md` for:
- Playwright Automation Framework commands
- Playwright 8-Layer commands
- QA Buddy / TestPlanBuddy / TestStrategyBuddy commands
- Jira MCP setup
- GROQ model config (`llama-3.3-70b-versatile`, temperature 0.3)
- Anti-hallucination rules + auto-fix protocol
