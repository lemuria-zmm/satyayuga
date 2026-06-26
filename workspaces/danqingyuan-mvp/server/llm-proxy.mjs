import http from 'node:http';
import {
  LlmValidationError,
  createValidationResult,
  validateLlmEnvelopeRequest,
  validateLlmOutputForRole,
  sanitizeLlmOutputForRole,
} from './llm-validation.mjs';
import { loadLocalEnv } from './env-loader.mjs';
import { createLlmProvider } from './llm-providers/provider-factory.mjs';
import { listPromptBundles, loadPromptBundle } from './prompt-loader.mjs';

const localEnv = loadLocalEnv();
const port = Number(process.env.LLM_PROXY_PORT ?? 8787);
const maxBodyBytes = 256 * 1024;
const maxValidationRetries = Number(process.env.LLM_VALIDATION_RETRIES ?? 2);
const llmProvider = createLlmProvider();

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function textResponse(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(message);
}

function readJsonRequest(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBodyBytes) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function createEnvelope(request, output, validation, promptBundle) {
  return {
    traceId: request.traceId,
    role: request.role,
    promptVersion: promptBundle.version,
    output,
    validation,
  };
}

async function createValidatedEnvelope(request, promptBundle, outputFactory) {
  let lastValidation = createValidationResult();
  let lastError = null;

  for (let retryCount = 0; retryCount <= maxValidationRetries; retryCount += 1) {
    let output;
    try {
      output = await outputFactory({
        promptBundle,
        retryCount,
        previousValidation: lastValidation,
      });
    } catch (error) {
      // JSON 解析失败/provider 报错也进重试（2026-06-26 加固A）：不再一次失败就抛 400
      lastError = error;
      console.log(`[retry ${retryCount}] provider error:`, error instanceof Error ? error.message : error);
      continue;
    }
    const validation = validateLlmOutputForRole(request.role, sanitizeLlmOutputForRole(request.role, output, request.input), retryCount, request.input);
    if (validation.ok) {
      return createEnvelope(request, output, validation, promptBundle);
    }
    lastValidation = validation;
  }

  // 重试耗尽：若全程是 provider 报错（从未拿到可校验输出），抛原始错误；否则抛校验错误
  if (lastError && !lastValidation.errors?.length) throw lastError;
  throw new LlmValidationError(lastValidation);
}

async function routeLlmRequest(request) {
  const requestValidation = validateLlmEnvelopeRequest(request);
  if (!requestValidation.ok) {
    throw new LlmValidationError(requestValidation);
  }
  const promptBundle = await loadPromptBundle(request.role);

  return createValidatedEnvelope(request, promptBundle, (retryContext) =>
    llmProvider.generate(request, promptBundle, retryContext),
  );
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    textResponse(response, 204, '');
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    jsonResponse(response, 200, { ok: true, mode: llmProvider.name, envLoaded: localEnv.loadedKeys.length > 0 });
    return;
  }

  if (request.method === 'GET' && request.url === '/api/prompts') {
    try {
      jsonResponse(response, 200, { prompts: await listPromptBundles() });
    } catch (error) {
      jsonResponse(response, 500, {
        error: error instanceof Error ? error.message : 'Unknown prompt loading error.',
      });
    }
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/llm') {
    textResponse(response, 404, 'Not found.');
    return;
  }

  try {
    const envelope = await readJsonRequest(request);
    jsonResponse(response, 200, await routeLlmRequest(envelope));
  } catch (error) {
    if (error instanceof LlmValidationError) {
      console.log(`[FAIL 422] ${error.message} ::`, JSON.stringify(error.validation)?.slice(0, 400));
      jsonResponse(response, 422, {
        error: error.message,
        validation: error.validation,
      });
      return;
    }

    console.log(`[FAIL 400]`, error instanceof Error ? (error.stack ?? error.message) : error);
    jsonResponse(response, 400, {
      error: error instanceof Error ? error.message : 'Unknown proxy error.',
    });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`丹青院 LLM proxy listening on http://127.0.0.1:${port}`);
});
