import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadLocalEnv(fileName = '.env.local') {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return { filePath, loadedKeys: [] };
  }

  const loadedKeys = [];
  const content = readFileSync(filePath, 'utf8');
  content.split(/\r?\n/u).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) {
      return;
    }

    process.env[parsed.key] = parsed.value;
    loadedKeys.push(parsed.key);
  });

  return { filePath, loadedKeys };
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!/^[A-Z_][A-Z0-9_]*$/u.test(key)) {
    return null;
  }

  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  return {
    key,
    value: unwrapEnvValue(rawValue),
  };
}

function unwrapEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
