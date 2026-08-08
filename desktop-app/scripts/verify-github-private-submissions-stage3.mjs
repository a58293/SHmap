import fs from 'node:fs';

const rustLib = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');
const rustAuth = fs.readFileSync('src-tauri/src/github_auth.rs', 'utf8');

const checks = [
  [rustLib.includes('github_auth::publish_private_submission'), '发布命令已切换到私有仓库 API'],
  [!rustLib.includes('PUBLISH_REPO_REQUIRED'), '发布流程不再依赖本地 Git 仓库'],
  [!rustLib.includes('当前仓库 origin 不是 a58293/SHmap'), '发布流程不再校验公共 SHmap origin'],
  [rustAuth.includes('require_writable_session'), '发布前强制检查写权限'],
  [rustAuth.includes('submissions/pending/'), '更改包目标为 SHmap-Data/submissions/pending'],
  [rustAuth.includes('submissions/assets/'), '图片目标为 SHmap-Data/submissions/assets'],
  [rustAuth.includes('.put(url)'), '使用 GitHub Contents API 写入私有仓库'],
  [rustAuth.includes('Contents 权限设为 Read and write'), '无写权限时给出明确提示'],
  [rustAuth.includes('图片先上传，pending 更改包最后上传'), '保证 pending 包出现前资源已就绪'],
  [rustAuth.includes('同名但内容不同'), '禁止静默覆盖同名远程文件'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('\nStage3 私有更改包发布静态检查通过。');
