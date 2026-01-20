import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = path.resolve(process.cwd());
const packageJsonPath = path.join(rootDir, 'package.json');

const toVersionParts = (version) => version.split('.').map((part) => Number(part));
const isVersionAtLeast = (current, minimum) => {
  const currentParts = toVersionParts(current);
  const minimumParts = toVersionParts(minimum);
  for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i += 1) {
    const currentValue = currentParts[i] ?? 0;
    const minimumValue = minimumParts[i] ?? 0;
    if (currentValue > minimumValue) return true;
    if (currentValue < minimumValue) return false;
  }
  return true;
};

const checkResult = {
  errors: [],
  warnings: [],
  info: [],
};

if (!fs.existsSync(packageJsonPath)) {
  checkResult.errors.push('未找到 package.json，请确认在项目根目录执行。');
} else {
  checkResult.info.push('检测到 package.json。');
}

const nodeVersion = process.versions.node;
const minimumNode = '18.0.0';
if (!isVersionAtLeast(nodeVersion, minimumNode)) {
  checkResult.errors.push(`Node.js 版本过低：${nodeVersion}（需要 >= ${minimumNode}）。`);
} else {
  checkResult.info.push(`Node.js 版本满足要求：${nodeVersion}。`);
}

try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  checkResult.info.push(`npm 可用：${npmVersion}。`);
} catch (error) {
  checkResult.errors.push('npm 不可用或未安装。');
}

const getDependencyList = () => {
  if (!fs.existsSync(packageJsonPath)) return [];
  const raw = fs.readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(raw);
  const deps = Object.keys(pkg.dependencies ?? {});
  const devDeps = Object.keys(pkg.devDependencies ?? {});
  return [...new Set([...deps, ...devDeps])];
};

const hasNodeModules = fs.existsSync(path.join(rootDir, 'node_modules'));
if (!hasNodeModules) {
  checkResult.warnings.push('未检测到 node_modules，依赖尚未安装。');
}

const missingDeps = [];
for (const dep of getDependencyList()) {
  const depPath = path.join(rootDir, 'node_modules', ...dep.split('/'));
  if (!fs.existsSync(depPath)) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  checkResult.warnings.push(`缺失依赖：${missingDeps.join(', ')}`);
} else if (hasNodeModules) {
  checkResult.info.push('已安装全部依赖。');
}

const output = (label, items) => {
  if (items.length === 0) return;
  console.log(`\n${label}`);
  items.forEach((item) => console.log(`- ${item}`));
};

console.log('Love Simulator 环境依赖检测结果');
console.log('='.repeat(32));
output('信息', checkResult.info);
output('警告', checkResult.warnings);
output('错误', checkResult.errors);

if (checkResult.errors.length > 0) {
  process.exit(1);
}
