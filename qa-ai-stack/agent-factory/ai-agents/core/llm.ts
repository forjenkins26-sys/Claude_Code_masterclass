// Single OpenAI-compatible client. Works for Groq, DeepSeek, Ollama, etc.
// Switch providers via env vars: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL.
// Set LLM_MODE=mock for offline deterministic output (tests, demos).

import OpenAI from 'openai';
import dotenv from 'dotenv';
import type { AskOpts } from './types';

dotenv.config();

const baseURL = process.env.LLM_BASE_URL ?? 'https://api.groq.com/openai/v1';
const apiKey = process.env.LLM_API_KEY ?? 'not-needed-in-mock';
const defaultModel = process.env.LLM_MODEL ?? 'llama-3.3-70b-versatile';

const client = new OpenAI({ baseURL, apiKey });

/**
 * Ask the configured LLM. In mock mode returns opts.mock (deterministic).
 */
export async function ask(
  system: string,
  user: string,
  opts: AskOpts = {},
): Promise<string> {
  if (process.env.LLM_MODE === 'mock') {
    return opts.mock ?? '';
  }

  const r = await client.chat.completions.create({
    model: opts.model ?? defaultModel,
    temperature: opts.temperature ?? 0.1,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  return r.choices[0]?.message?.content ?? '';
}

/**
 * Reasoning models (qwen3, deepseek-reasoner) wrap output in <think>...</think>
 * and sometimes inside ``` fences. Strip them, then parse the LAST {...} block.
 */
export async function askJson<T = unknown>(
  system: string,
  user: string,
  opts: AskOpts = {},
): Promise<T> {
  const raw = await ask(system, user, opts);
  const cleaned = stripThinking(raw);
  const json = extractLastJsonBlock(cleaned);
  return JSON.parse(json) as T;
}

function stripThinking(s: string): string {
  return s
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function extractLastJsonBlock(s: string): string {
  // Find the last balanced {...} or [...] block in the string.
  const stack: number[] = [];
  let inString = false;
  let escape = false;
  let lastEnd = -1;
  let lastStart = -1;
  const opens = new Map<number, number>(); // depth -> start index

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{' || ch === '[') {
      stack.push(i);
    } else if (ch === '}' || ch === ']') {
      const start = stack.pop();
      if (start !== undefined && stack.length === 0) {
        lastStart = start;
        lastEnd = i;
      }
    }
  }

  if (lastStart >= 0 && lastEnd >= 0) {
    return s.slice(lastStart, lastEnd + 1);
  }
  // Fallback: assume the whole string is JSON
  return s;
}
