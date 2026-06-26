import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const promptDir = path.join(serverDir, 'prompts');

const promptFilesByRole = {
  character_dialogue: 'character_dialogue.md',
  painting_prompt_generator: 'painting_prompt_generator.md',
  painting_intent_evaluator: 'painting_intent_evaluator.md',
  scene_narrator: 'scene_narrator.md',
  mainline_planner: 'mainline_planner.md',
};

const promptCache = new Map();

export async function loadPromptBundle(role) {
  const fileName = promptFilesByRole[role];
  if (!fileName) {
    throw new Error(`No prompt file configured for role: ${role}`);
  }

  const filePath = path.join(promptDir, fileName);
  const content = await readFile(filePath, 'utf8');
  const parsed = parsePromptFile(content, filePath);

  if (parsed.role !== role) {
    throw new Error(`Prompt role mismatch: expected ${role}, got ${parsed.role}`);
  }

  promptCache.set(role, parsed);
  return parsed;
}

export async function listPromptBundles() {
  const bundles = await Promise.all(Object.keys(promptFilesByRole).map((role) => loadPromptBundle(role)));
  return bundles.map(({ role, version, filePath, systemPrompt }) => ({
    role,
    version,
    filePath,
    characters: systemPrompt.length,
  }));
}

function parsePromptFile(content, filePath) {
  const role = readHeader(content, 'prompt-role');
  const version = readHeader(content, 'prompt-version');

  if (!role) {
    throw new Error(`Missing prompt-role header in ${filePath}`);
  }
  if (!version) {
    throw new Error(`Missing prompt-version header in ${filePath}`);
  }

  return {
    role,
    version,
    filePath,
    systemPrompt: stripPromptHeaders(content).trim(),
  };
}

function readHeader(content, key) {
  const match = content.match(new RegExp(`<!--\\s*${key}:\\s*([^>]+?)\\s*-->`, 'u'));
  return match?.[1]?.trim();
}

function stripPromptHeaders(content) {
  return content.replace(/<!--\s*prompt-(role|version):\s*[^>]+?\s*-->\s*/gu, '');
}
