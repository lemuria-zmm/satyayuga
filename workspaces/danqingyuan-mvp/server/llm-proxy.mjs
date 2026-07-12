import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  LlmValidationError,
  createValidationResult,
  validateLlmEnvelopeRequest,
  validateLlmOutputForRole,
  sanitizeLlmOutputForRole,
} from './llm-validation.mjs';
import { loadLocalEnv } from './env-loader.mjs';
import { createLlmProvider } from './llm-providers/provider-factory.mjs';
import { createProviderFromClientConfig } from './llm-providers/openai-compatible-provider.mjs';
import { listPromptBundles, loadPromptBundle } from './prompt-loader.mjs';

const localEnv = loadLocalEnv();
const port = Number(process.env.LLM_PROXY_PORT ?? 8787);
// 绑定地址：dev 默认 127.0.0.1（仅本机）；生产设 LLM_PROXY_HOST=0.0.0.0 对外可达
const host = process.env.LLM_PROXY_HOST ?? '127.0.0.1';
const maxBodyBytes = 256 * 1024;
const maxValidationRetries = Number(process.env.LLM_VALIDATION_RETRIES ?? 2);
const llmProvider = createLlmProvider();

// —— 静态托管（2026-07-12 单服务部署）：同域托管前端 dist，与 /api/llm 同源，免跨域 ——
// 默认关闭（dev 只跑代理）；生产设 SERVE_STATIC=1 开启。STATIC_DIR 可覆盖（默认 ./dist）。
const serveStatic = process.env.SERVE_STATIC === '1' || process.env.SERVE_STATIC === 'true';
const staticDir = path.resolve(process.env.STATIC_DIR ?? 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function cacheControlFor(filePath) {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) return 'public, max-age=31536000, immutable'; // vite 带 hash 的产物
  if (filePath.endsWith('index.html')) return 'no-cache';
  return 'public, max-age=86400'; // 图/音/视频等运行时资源
}

/** 发送文件，支持 Range（mp4/mp3 拖动、部分浏览器 <video> 必需）。 */
function sendFile(request, response, filePath, stat) {
  const base = {
    'Content-Type': contentType(filePath),
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControlFor(filePath),
  };
  const range = request.headers.range;
  const m = range && /^bytes=(\d*)-(\d*)$/u.exec(range);
  if (m) {
    let start = m[1] === '' ? 0 : Number.parseInt(m[1], 10);
    let end = m[2] === '' ? stat.size - 1 : Number.parseInt(m[2], 10);
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
    if (start > end || start >= stat.size) {
      response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      response.end();
      return;
    }
    response.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    if (request.method === 'HEAD') return response.end();
    fs.createReadStream(filePath, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { ...base, 'Content-Length': stat.size });
  if (request.method === 'HEAD') return response.end();
  fs.createReadStream(filePath).pipe(response);
}

function sendIndexFallback(request, response) {
  const indexPath = path.join(staticDir, 'index.html');
  fs.stat(indexPath, (err, stat) => {
    if (err || !stat.isFile()) {
      textResponse(response, 404, 'Not found.');
      return;
    }
    sendFile(request, response, indexPath, stat);
  });
}

/** 从 dist 提供静态资源；未命中文件回退 index.html（SPA）。含路径穿越防护。 */
function serveStaticRequest(request, response) {
  let rel = decodeURIComponent((request.url ?? '/').split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.normalize(path.join(staticDir, rel));
  if (filePath !== staticDir && !filePath.startsWith(staticDir + path.sep)) {
    textResponse(response, 403, 'Forbidden.');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      sendIndexFallback(request, response); // 交给前端路由
      return;
    }
    sendFile(request, response, filePath, stat);
  });
}

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

  // BYOK（2026-07-11）：请求带 clientProvider 用玩家自带 key 临时建 provider（不落库/不日志）；否则用服务端默认
  const provider = request.clientProvider ? createProviderFromClientConfig(request.clientProvider) : llmProvider;

  return createValidatedEnvelope(request, promptBundle, (retryContext) =>
    provider.generate(request, promptBundle, retryContext),
  );
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    textResponse(response, 204, '');
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    jsonResponse(response, 200, { ok: true, mode: llmProvider.name, envLoaded: localEnv.loadedKeys.length > 0, serveStatic });
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
    // 生产单服务：非 API 的 GET/HEAD 交给静态托管（dist + SPA 回退）
    if (serveStatic && (request.method === 'GET' || request.method === 'HEAD')) {
      serveStaticRequest(request, response);
      return;
    }
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

server.listen(port, host, () => {
  console.log(`丹青院 LLM proxy listening on http://${host}:${port}`);
  if (serveStatic) console.log(`  静态托管: ${staticDir}（SPA 回退 index.html）`);
});
