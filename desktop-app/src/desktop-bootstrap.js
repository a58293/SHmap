
import "./desktop-ui.css";
import { Channel, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const STORAGE_KEY = "shj_infinite_tile_demo_v018_v031";
const isTauri = Boolean(window.__TAURI_INTERNALS__);
let bootInfo = null;
let savePending = null;
let saveBusy = false;
let saveTimer = null;
let updateMetadata = null;
let nativeStorageReady = !isTauri;
let startupFallback = false;
let bootstrapRecoveryTask = null;
const BOOTSTRAP_TIMEOUT_MS = 8000;
const PRIVATE_DATA_TIMEOUT_MS = 20000;
const MAIN_SCRIPT_TIMEOUT_MS = 8000;
const AUTO_UPDATE_KEY = "shj_desktop_auto_update_v1";
const UPDATE_CHECK_KEY = "shj_desktop_last_update_check_v1";
const AUTH_REPOSITORY = "a58293/SHmap-Data";
const DESKTOP_EDITION = "v012";
const DESKTOP_VERSION = "1.2.5";
const CLOSE_SAVE_TIMEOUT_MS = 3000;

function seedSnapshot(){
  const initial=window.SHJ_INITIAL_DATA||{metadata:{},objects:[]};
  const objects=window.SHJ_OBJECT_ROLE_MANIFEST?.apply?.(initial.objects||[])||(initial.objects||[]);
  return {
    objects,changes:[],changeArchives:[],appliedRemotePatches:[],remotePatchHistory:[],viewedRemotePatches:[],
    dataVersion:initial.metadata?.dataVersion||"v075-r0001",camera:{x:0,y:0,zoom:.92},selectedId:objects[0]?.id||null,
    selectedCell:null,tileProfiles:{},trash:[],trashRetentionDays:0,nextIdCounter:0,dossierMode:"brief",brushKeys:[],brushStrokes:[],viewPreset:"all",compareKeys:[]
  };
}
function hydratePrivateMapBundle(payload){
  const bundle=typeof payload==="string"?JSON.parse(payload):payload;
  if(bundle?.format!=="shmap-private-bootstrap-v1")throw new Error("私有地图数据格式不受支持");
  const globals=bundle?.globals;
  if(!globals||typeof globals!=="object")throw new Error("私有地图数据缺少 globals");
  const required=["SHJ_INITIAL_DATA","SHJ_WATER_PATHS","SHJ_WORLD_HIERARCHY","SHJ_ORIGINAL_LIBRARY","SHJ_SPEC_SUMMARY","SHJ_BOARD_LAYOUT"];
  for(const name of required){
    if(!(name in globals))throw new Error(`私有地图数据缺少 ${name}`);
    window[name]=globals[name];
  }
  if(!Array.isArray(window.SHJ_INITIAL_DATA?.objects)||window.SHJ_INITIAL_DATA.objects.length===0)throw new Error("私有地图对象为空");
  return bundle;
}
function toast(message,error=false){
  const n=document.createElement("div");n.className=`desktop-toast${error?" error":""}`;n.textContent=message;document.body.appendChild(n);setTimeout(()=>n.remove(),3200)
}
async function pumpSave(){
  if(saveBusy||!savePending||!isTauri||!nativeStorageReady)return;
  saveBusy=true;const payload=savePending;savePending=null;
  try{await invoke("save_workspace",{payload})}catch(err){console.error(err);toast(`桌面数据库保存失败：${err}`,true)}finally{saveBusy=false;if(savePending)pumpSave()}
}
async function flushWorkspace({timeoutMs=0}={}){
  clearTimeout(saveTimer);saveTimer=null;
  if(!isTauri)return true;
  if(!nativeStorageReady)return false;
  const deadline=timeoutMs>0?Date.now()+timeoutMs:Infinity;
  if(savePending&&!saveBusy){
    if(timeoutMs>0)void pumpSave();
    else await pumpSave();
  }
  while(saveBusy||savePending){
    if(Date.now()>=deadline)return false;
    await new Promise(resolve=>setTimeout(resolve,35));
    if(savePending&&!saveBusy){
      if(timeoutMs>0)void pumpSave();
      else await pumpSave();
    }
  }
  return true;
}
function queueSave(payload){
  savePending=payload;clearTimeout(saveTimer);saveTimer=setTimeout(pumpSave,80)
}

let nativeCloseApproved=false;
let nativeCloseInProgress=false;
async function setupNativeCloseSaveGuard(){
  if(!isTauri)return;
  const appWindow=getCurrentWindow();
  await appWindow.onCloseRequested(async event=>{
    if(nativeCloseApproved)return;
    event.preventDefault();
    if(nativeCloseInProgress)return;
    nativeCloseInProgress=true;
    try{
      window.__SHJ_FLUSH_PERSIST__?.();
      const saved=await flushWorkspace({timeoutMs:CLOSE_SAVE_TIMEOUT_MS});
      if(!saved)console.warn("Close save timed out or native storage was unavailable; closing with local cache preserved.");
    }catch(error){
      console.error("Final workspace save failed",error);
    }finally{
      nativeCloseApproved=true;
      try{await invoke("exit_application")}catch(error){nativeCloseApproved=false;nativeCloseInProgress=false;console.error("Native application exit failed",error)}
    }
  });
}
function formatTime(value){try{return new Intl.DateTimeFormat("zh-CN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return value||""}}
function escapeHtml(v){return String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}


function ensureCriticalUiBeforeMain(){
  if(document.getElementById("v110-unified-menu-style"))return;
  const style=document.createElement("style");style.id="v110-unified-menu-style";style.textContent=`
    .v098-map-tools-menu,.v098-top-data-menu,.v050-top-system{position:relative;display:flex;align-items:stretch;margin:0}
    .v098-map-tools-menu>summary,.v098-top-data-menu>summary,.v050-top-system>summary{list-style:none;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:3px;min-height:54px;padding:9px 18px;border-radius:14px;border:1px solid rgba(141,119,80,.26);background:linear-gradient(180deg,rgba(248,242,230,.98) 0%,rgba(239,231,214,.98) 100%);color:#314742;box-shadow:0 1px 0 rgba(255,255,255,.75) inset,0 1px 4px rgba(92,76,48,.08);cursor:pointer;user-select:none;white-space:nowrap}
    .v098-map-tools-menu>summary::-webkit-details-marker,.v098-top-data-menu>summary::-webkit-details-marker,.v050-top-system>summary::-webkit-details-marker{display:none}
    .v098-map-tools-menu>summary::after,.v098-top-data-menu>summary::after,.v050-top-system>summary::after{content:"▾";position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:11px;color:#7a715f;pointer-events:none}
    .v098-map-tools-menu[open]>summary::after,.v098-top-data-menu[open]>summary::after,.v050-top-system[open]>summary::after{transform:translateY(-50%) rotate(180deg)}
    .v098-map-tools-menu>summary>span,.v098-top-data-menu>summary,.v050-top-system>summary{font-size:15px;font-weight:700;letter-spacing:.01em}
    .v098-map-tools-menu>summary small,.v098-top-data-menu>summary small,.v050-top-system>summary small{font-size:11px;line-height:1.15;color:#7f7768;font-weight:600;letter-spacing:.02em}
    .v098-map-tools-menu{min-width:166px}.v098-top-data-menu,.v050-top-system{min-width:112px}
    .v098-top-data-menu>summary,.v050-top-system>summary{padding-right:28px;align-items:center;text-align:center;justify-content:center;font-size:14px}.v098-map-tools-menu>summary{padding-right:30px}
    .v098-map-tools-panel,.v098-top-data-menu>div,.v050-top-system>div{margin-top:8px;border-radius:16px;border:1px solid rgba(135,117,82,.22);background:rgba(251,248,240,.98);box-shadow:0 18px 36px rgba(56,48,35,.15),0 1px 0 rgba(255,255,255,.88) inset;backdrop-filter:blur(10px)}
    .v098-top-data-menu>div,.v050-top-system>div{padding:12px}.map-toolbar .v098-map-tools-menu,.top-actions .v098-top-data-menu,.top-actions .v050-top-system{align-self:center}
  `;document.head.appendChild(style)
}

function ensureStableUiBootCurtain(){
  let curtain=document.getElementById("shjStableUiBootCurtain");if(curtain)return curtain;
  const style=document.createElement("style");style.id="shj-stable-ui-boot-style";style.textContent=`
    #shjStableUiBootCurtain{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:linear-gradient(180deg,#f4efe3 0%,#eee6d6 100%);color:#244c45;transition:opacity .18s ease;pointer-events:all}
    #shjStableUiBootCurtain.hidden{opacity:0;pointer-events:none}
    #shjStableUiBootCurtain .card{min-width:320px;max-width:520px;padding:24px 28px;border:1px solid rgba(111,93,62,.20);border-radius:18px;background:rgba(252,249,241,.90);box-shadow:0 18px 48px rgba(57,48,32,.12);text-align:center}
    #shjStableUiBootCurtain strong{display:block;font-size:20px;letter-spacing:.04em;margin-bottom:8px}
    #shjStableUiBootCurtain span{display:block;font-size:13px;color:#6f746a;line-height:1.6}
    #shjStableUiBootCurtain i{display:block;width:120px;height:3px;border-radius:999px;margin:16px auto 0;background:linear-gradient(90deg,transparent,#36766c,transparent);animation:shjBootPulse 1.15s ease-in-out infinite}
    @keyframes shjBootPulse{0%,100%{opacity:.28;transform:scaleX(.72)}50%{opacity:.92;transform:scaleX(1)}}
  `;document.head.appendChild(style);
  curtain=document.createElement("section");curtain.id="shjStableUiBootCurtain";curtain.innerHTML='<div class="card"><strong>山海经原典地图研究台</strong><span id="shjStableUiBootMessage">正在准备正式地图界面……</span><i></i></div>';document.body.appendChild(curtain);return curtain
}
function setStableUiBootMessage(message){const node=document.getElementById("shjStableUiBootMessage");if(node)node.textContent=message}
async function revealStableUiAfterLayout(){
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const curtain=document.getElementById("shjStableUiBootCurtain");if(!curtain)return;curtain.classList.add("hidden");setTimeout(()=>curtain.remove(),220)
}

function syncDesktopVersionChrome(){
  document.title=`山海经原典地图研究台 · 桌面版 ${DESKTOP_EDITION} · ${DESKTOP_VERSION}`;
  const brandVersion=document.querySelector(".brand-copy h1 small");
  if(brandVersion)brandVersion.textContent=`DESKTOP ${DESKTOP_EDITION} · ${DESKTOP_VERSION}`;
  document.documentElement.dataset.desktopVersion=DESKTOP_VERSION;
}

function authGateTemplate(){
  return `<div class="desktop-auth-backdrop"></div>
    <main class="desktop-auth-card" role="dialog" aria-modal="true" aria-labelledby="desktopAuthTitle">
      <div class="desktop-auth-brand"><span>山海</span><div><small>SHMAP SECURE ACCESS</small><strong>山海经原典地图</strong></div></div>
      <section class="desktop-auth-copy"><span class="eyebrow">PRIVATE MAP ACCESS</span><h1 id="desktopAuthTitle">登录后查看正式地图</h1><p>使用你自己的 GitHub 账号登录，只有被凯淞大王允许才可以进入！</p></section>
      <div class="desktop-auth-status" id="desktopAuthStatus">正在检查本机登录状态……</div>
      <section class="desktop-auth-code hidden" id="desktopAuthCodePanel">
        <p>浏览器打开后，输入以下一次性验证码：</p>
        <button type="button" class="desktop-auth-user-code" id="desktopAuthUserCode" title="点击复制验证码">----</button>
        <div class="desktop-auth-code-actions"><button type="button" id="desktopAuthOpenBrowser">打开 GitHub 登录页</button><button type="button" class="secondary" id="desktopAuthCopyCode">复制验证码</button></div>
        <small>正在等待你在 GitHub 完成确认。请不要关闭程序。</small>
      </section>
      <div class="desktop-auth-actions"><button type="button" class="primary" id="desktopAuthLogin">使用 GitHub 登录</button><button type="button" class="secondary hidden" id="desktopAuthRetry">重新检查权限</button><button type="button" class="secondary hidden" id="desktopAuthSwitch">切换 GitHub 账号</button></div>
      <footer><span>✓ 客户端不保存你的密码</span><span>✓ 不使用共享 Token</span><span>✓ 权限由私有仓库控制</span></footer>
    </main>`;
}

function createAuthGate(){
  let gate=document.querySelector("#desktopAuthGate");
  if(gate)return gate;
  gate=document.createElement("section");gate.id="desktopAuthGate";gate.className="desktop-auth-gate";gate.style.zIndex="10020";gate.innerHTML=authGateTemplate();document.body.appendChild(gate);return gate
}

function setAuthGateMessage(gate,message,type="info"){
  const host=gate.querySelector("#desktopAuthStatus");if(!host)return;host.textContent=message;host.dataset.type=type
}

async function copyAuthCode(value){
  try{await navigator.clipboard.writeText(value);return true}catch{return false}
}

async function ensureGitHubAccess(){
  document.body.classList.add("desktop-auth-locked");
  const gate=createAuthGate(),login=gate.querySelector("#desktopAuthLogin"),retry=gate.querySelector("#desktopAuthRetry"),switchAccount=gate.querySelector("#desktopAuthSwitch"),codePanel=gate.querySelector("#desktopAuthCodePanel"),userCode=gate.querySelector("#desktopAuthUserCode"),openBrowser=gate.querySelector("#desktopAuthOpenBrowser"),copyCode=gate.querySelector("#desktopAuthCopyCode");
  if(!isTauri){login.classList.add("hidden");setAuthGateMessage(gate,"正式地图只允许在 SHmap 桌面客户端中通过 GitHub 授权访问。","warning");return new Promise(()=>{})}
  let currentCode="",verificationUri="https://github.com/login/device",resolved=false,resolver;
  const waiting=new Promise(resolve=>{resolver=resolve});
  const finish=status=>{if(resolved)return;resolved=true;document.body.classList.remove("desktop-auth-locked");gate.classList.add("authorized");setTimeout(()=>gate.remove(),220);resolver(status)};
  const showStatus=status=>{
    if(status?.authorized){finish(status);return}
    const account=status?.login?`当前账号 ${status.login}：`:"";setAuthGateMessage(gate,`${account}${status?.message||"尚未登录"}`,status?.signedIn?"warning":"info");
    login.classList.toggle("hidden",Boolean(status?.signedIn));retry.classList.toggle("hidden",!status?.signedIn);switchAccount.classList.toggle("hidden",!status?.signedIn)
  };
  const check=async()=>{
    login.disabled=true;retry.disabled=true;setAuthGateMessage(gate,"正在验证 GitHub 账号与私有仓库权限……");
    try{showStatus(await invoke("github_auth_status"))}catch(error){setAuthGateMessage(gate,`暂时无法完成权限检查：${String(error)}`,"error");retry.classList.remove("hidden")}
    finally{login.disabled=false;retry.disabled=false}
  };
  const startLogin=async()=>{
    login.disabled=true;retry.classList.add("hidden");switchAccount.classList.add("hidden");codePanel.classList.add("hidden");setAuthGateMessage(gate,"正在向 GitHub 申请一次性登录验证码……");
    try{
      const flow=await invoke("github_begin_device_flow");currentCode=flow.userCode;verificationUri=flow.verificationUri;userCode.textContent=currentCode;codePanel.classList.remove("hidden");setAuthGateMessage(gate,"请在浏览器中登录 GitHub，并输入一次性验证码。");
      try{await invoke("open_github_device_page",{url:verificationUri})}catch{}
      showStatus(await invoke("github_complete_device_flow"))
    }catch(error){setAuthGateMessage(gate,String(error),"error");login.disabled=false;login.textContent="重新开始 GitHub 登录";login.classList.remove("hidden")}
  };
  login.addEventListener("click",startLogin);retry.addEventListener("click",check);switchAccount.addEventListener("click",async()=>{try{await invoke("github_logout")}finally{codePanel.classList.add("hidden");login.classList.remove("hidden");retry.classList.add("hidden");switchAccount.classList.add("hidden");setAuthGateMessage(gate,"本机 GitHub 登录已退出，可以使用其他授权账号重新登录。");}});
  const open=()=>invoke("open_github_device_page",{url:verificationUri}).catch(error=>setAuthGateMessage(gate,String(error),"error"));openBrowser.addEventListener("click",open);userCode.addEventListener("click",async()=>{if(await copyAuthCode(currentCode))setAuthGateMessage(gate,"验证码已复制，请在 GitHub 页面粘贴。")} );copyCode.addEventListener("click",async()=>{if(await copyAuthCode(currentCode))setAuthGateMessage(gate,"验证码已复制，请在 GitHub 页面粘贴。")} );
  await check();
  return waiting;
}

function renderReleaseNotes(value){
  const lines=String(value||"本次更新未填写说明。").replace(/\r\n?/g,"\n").split("\n");
  const output=[];
  let listOpen=false;
  const inline=text=>escapeHtml(text)
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  const closeList=()=>{if(listOpen){output.push("</ul>");listOpen=false}};
  for(const sourceLine of lines){
    const line=sourceLine.trim();
    if(!line){closeList();continue}
    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    if(heading){closeList();const level=Math.min(5,heading[1].length+2);output.push(`<h${level}>${inline(heading[2])}</h${level}>`);continue}
    const bullet=line.match(/^[-*]\s+(.+)$/);
    if(bullet){if(!listOpen){output.push("<ul>");listOpen=true}output.push(`<li>${inline(bullet[1])}</li>`);continue}
    closeList();output.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return output.join("");
}


function updateProgress(percent, label){
  const bar=document.querySelector("#desktopUpdateProgressBar");
  const text=document.querySelector("#desktopUpdateProgressText");
  if(bar)bar.style.width=`${Math.max(0,Math.min(100,percent||0))}%`;
  if(text)text.textContent=label||"";
}
function renderUpdateState(info,message){
  const latest=document.querySelector("#desktopLatestVersion");
  const notes=document.querySelector("#desktopUpdateNotes");
  const install=document.querySelector("#desktopInstallUpdate");
  const state=document.querySelector("#desktopUpdateState");
  if(state)state.textContent=message||"";
  if(info){
    updateMetadata=info;
    if(latest)latest.textContent=`v${info.version}`;
    const channel=document.querySelector("#desktopUpdateChannel");
    if(channel)channel.textContent=info.source||"自动选择";
    if(notes)notes.innerHTML=renderReleaseNotes(info.body);
    if(install)install.disabled=false;
    document.querySelector("#desktopUpdateBtn")?.classList.add("has-update");
    updateProgress(100,"检查完成 · 可安装新版本");
  }else{
    updateMetadata=null;
    if(latest)latest.textContent="已是最新";
    const channel=document.querySelector("#desktopUpdateChannel");
    if(channel)channel.textContent="连接正常";
    if(notes)notes.textContent="当前没有可安装的新版本。";
    if(install)install.disabled=true;
    document.querySelector("#desktopUpdateBtn")?.classList.remove("has-update");
    updateProgress(100,"检查完成");
  }
}
async function checkDesktopUpdate({silent=false}={}){
  if(!isTauri)return null;
  const state=document.querySelector("#desktopUpdateState");
  const checkBtn=document.querySelector("#desktopCheckUpdate");
  if(checkBtn)checkBtn.disabled=true;
  if(state)state.textContent="正在连接更新服务器……";
  updateProgress(0,"正在检查");
  try{
    const info=await invoke("check_for_update");
    localStorage.setItem(UPDATE_CHECK_KEY,String(Date.now()));
    if(info){
      renderUpdateState(info,`发现新版本 v${info.version} · ${info.source||"更新线路"}`);
      if(silent)toast(`发现桌面版更新 v${info.version}`);
    }else{
      renderUpdateState(null,"当前已经是最新版本");
      if(!silent)toast("当前已经是最新版本");
    }
    return info;
  }catch(error){
    const message=String(error||"");
    const notes=document.querySelector("#desktopUpdateNotes");
    const channel=document.querySelector("#desktopUpdateChannel");
    if(channel)channel.textContent="连接失败";
    if(state)state.textContent=message.includes("所有更新线路")?"更新线路暂时不可用，已完成自动重试":message.includes("404")?"更新服务器尚未发布版本":"检查失败，请确认网络连接";
    if(notes)notes.textContent=message;
    updateProgress(0,"未完成 · 可再次点击检查更新");
    if(!silent)toast(message.includes("404")?"尚未发布可更新版本":message,true);
    return null;
  }finally{
    if(checkBtn)checkBtn.disabled=false;
  }
}
async function installDesktopUpdate(){
  if(!updateMetadata)return;
  const install=document.querySelector("#desktopInstallUpdate");
  const checkBtn=document.querySelector("#desktopCheckUpdate");
  if(!confirm(`将更新到 v${updateMetadata.version}。程序会先保存并备份当前资料，然后自动关闭并安装。继续吗？`))return;
  if(install)install.disabled=true;
  if(checkBtn)checkBtn.disabled=true;
  try{
    updateProgress(1,"正在保存工作区");
    await pumpSave();
    await invoke("create_backup",{label:`更新到 v${updateMetadata.version} 前备份`});
    let downloaded=0,total=0;
    const channel=new Channel(event=>{
      if(event.event==="started"){
        total=Number(event.data?.contentLength||0);
        updateProgress(2,total?`准备下载 ${Math.ceil(total/1024/1024)} MB`:"开始下载更新");
      }else if(event.event==="retrying"){
        downloaded=0;total=0;
        updateProgress(2,`${event.data?.message||"正在重新连接"}（${event.data?.attempt||2}/${event.data?.maxAttempts||3}）`);
      }else if(event.event==="progress"){
        downloaded+=Number(event.data?.chunkLength||0);
        const percent=total?Math.min(98,Math.round(downloaded/total*100)):Math.min(95,2+downloaded/1048576);
        updateProgress(percent,total?`已下载 ${Math.round(downloaded/1024/1024*10)/10} / ${Math.round(total/1024/1024*10)/10} MB`:`已下载 ${Math.round(downloaded/1024/1024*10)/10} MB`);
      }else if(event.event==="finished"){
        updateProgress(100,"下载完成，正在安装并重启");
      }
    });
    await invoke("install_update",{onEvent:channel});
  }catch(error){
    updateProgress(0,"安装失败");
    toast(String(error),true);
    if(install)install.disabled=false;
    if(checkBtn)checkBtn.disabled=false;
  }
}
function scheduleAutomaticUpdateCheck(){
  if(!isTauri||localStorage.getItem(AUTO_UPDATE_KEY)==="off")return;
  const last=Number(localStorage.getItem(UPDATE_CHECK_KEY)||0);
  if(Date.now()-last<24*60*60*1000)return;
  setTimeout(()=>checkDesktopUpdate({silent:true}),5000);
}

async function refreshBackupModal(){
  const status=await invoke("storage_status");
  const backups=await invoke("list_backups",{limit:80});
  document.querySelector("#desktopDbObjects").textContent=String(status.objectCount||0);
  document.querySelector("#desktopDbBackups").textContent=String(backups.length);
  document.querySelector("#desktopDbUpdated").textContent=status.updatedAt?formatTime(status.updatedAt):"尚未保存";
  document.querySelector("#desktopDbPath").textContent=status.databasePath||"";
  const host=document.querySelector("#desktopBackupList");
  host.innerHTML=backups.length?backups.map(b=>`<div class="desktop-backup-row"><div><h3>${escapeHtml(b.label||"备份")}</h3><p>${escapeHtml(formatTime(b.createdAt))} · ${b.objectCount||0}个对象 · ${escapeHtml(b.kind||"")}</p></div><button data-restore-backup="${b.backupId}">恢复</button></div>`).join(""):`<div class="desktop-empty">尚无备份。首次保存后会自动建立备份。</div>`;
}
function setupNativeUi(){
  document.documentElement.classList.add("desktop-shell");
  const actions=document.querySelector(".top-actions");
  if(!actions)return;
  const auth=window.SHJ_DESKTOP?.githubAuth;
  if(auth?.login){
    const account=document.createElement("button");account.className="btn secondary desktop-github-account";account.textContent=`GitHub · ${auth.login}`;account.title=`已验证 ${auth.repository}${auth.canWrite?" · 可读写":" · 只读"}；点击退出登录`;
    account.addEventListener("click",async()=>{if(!confirm(`退出 GitHub 账号 ${auth.login}？退出后需要重新验证才能查看正式地图。`))return;try{await invoke("github_logout");location.reload()}catch(error){toast(`退出失败：${error}`,true)}});actions.prepend(account)
  }
  const button=document.createElement("button");button.id="desktopBackupBtn";button.className="btn secondary desktop-native-btn";button.textContent="桌面备份";
  const updateButton=document.createElement("button");updateButton.id="desktopUpdateBtn";updateButton.className="btn secondary desktop-update-btn";updateButton.textContent="检查更新";
  actions.prepend(button);actions.prepend(updateButton);
  const modal=document.createElement("section");modal.id="desktopBackupModal";modal.className="desktop-native-modal hidden";modal.innerHTML=`<div class="desktop-native-backdrop" data-desktop-close></div><article class="desktop-native-card"><header class="desktop-native-head"><div><span class="eyebrow">NATIVE STORAGE</span><h2>桌面数据库与备份</h2><p>SQLite为主存储，兼容缓存只用于界面快速启动。</p></div><button class="desktop-native-close" data-desktop-close>×</button></header><div class="desktop-native-status"><div class="desktop-native-kpi"><strong id="desktopDbObjects">—</strong><span>当前对象</span></div><div class="desktop-native-kpi"><strong id="desktopDbBackups">—</strong><span>可恢复备份</span></div><div class="desktop-native-kpi"><strong id="desktopDbUpdated">—</strong><span>最近写入</span></div></div><div class="desktop-native-actions"><button class="primary" id="desktopCreateBackup">立即备份</button><button id="desktopCheckDb">检查数据库</button><button id="desktopOpenDataDir">打开数据目录</button><button id="desktopRefreshBackups">刷新</button></div><div class="desktop-backup-list" id="desktopBackupList"></div><footer class="desktop-native-foot" id="desktopDbPath"></footer></article>`;document.body.appendChild(modal);
  const updateModal=document.createElement("section");updateModal.id="desktopUpdateModal";updateModal.className="desktop-native-modal hidden";updateModal.innerHTML=`<div class="desktop-native-backdrop" data-update-close></div><article class="desktop-native-card desktop-update-card"><header class="desktop-native-head"><div><span class="eyebrow">SIGNED DESKTOP UPDATE</span><h2>程序更新</h2><p>自动尝试仓库直连、CDN与GitHub Releases，并安装经过签名验证的Windows版本。</p></div><button class="desktop-native-close" data-update-close>×</button></header><div class="desktop-native-status"><div class="desktop-native-kpi"><strong id="desktopCurrentVersion">—</strong><span>当前版本</span></div><div class="desktop-native-kpi"><strong id="desktopLatestVersion">—</strong><span>可用版本</span></div><div class="desktop-native-kpi"><strong id="desktopUpdateChannel">自动选择</strong><span>多线路更新</span></div></div><div class="desktop-update-state" id="desktopUpdateState">尚未检查</div><div class="desktop-update-progress"><i id="desktopUpdateProgressBar"></i></div><div class="desktop-update-progress-text" id="desktopUpdateProgressText"></div><section class="desktop-update-notes"><h3>版本说明</h3><div id="desktopUpdateNotes">点击“检查更新”读取最新版本。</div></section><div class="desktop-native-actions"><button class="primary" id="desktopCheckUpdate">检查更新</button><button id="desktopInstallUpdate" disabled>下载并安装</button><label class="desktop-update-auto"><input type="checkbox" id="desktopAutoUpdate"> 每天自动检查</label></div><footer class="desktop-native-foot">安装前会自动保存工作区并建立“更新前备份”。</footer></article>`;document.body.appendChild(updateModal);
  const openUpdate=async()=>{updateModal.classList.remove("hidden");try{const info=await invoke("app_version");document.querySelector("#desktopCurrentVersion").textContent=`${info.edition} · ${info.version}`;}catch{document.querySelector("#desktopCurrentVersion").textContent="v008";}};
  const closeTopNativeModal=()=>{const visible=[...document.querySelectorAll(".desktop-native-modal:not(.hidden)")].pop();if(!visible)return false;visible.classList.add("hidden");return true};
  document.addEventListener("contextmenu",e=>{if(e.target.closest("input,textarea,select,[contenteditable=true]"))return;if(closeTopNativeModal()){e.preventDefault();e.stopImmediatePropagation()}},true);
  updateButton.addEventListener("click",openUpdate);
  updateModal.addEventListener("click",e=>{if(e.target.closest("[data-update-close]"))updateModal.classList.add("hidden")});
  document.querySelector("#desktopCheckUpdate").addEventListener("click",()=>checkDesktopUpdate());
  document.querySelector("#desktopInstallUpdate").addEventListener("click",installDesktopUpdate);
  const autoUpdate=document.querySelector("#desktopAutoUpdate");autoUpdate.checked=localStorage.getItem(AUTO_UPDATE_KEY)!=="off";autoUpdate.addEventListener("change",()=>localStorage.setItem(AUTO_UPDATE_KEY,autoUpdate.checked?"on":"off"));
  const open=async()=>{modal.classList.remove("hidden");try{await refreshBackupModal()}catch(e){toast(`无法读取备份：${e}`,true)}};
  button.addEventListener("click",open);modal.addEventListener("click",async e=>{
    if(e.target.closest("[data-desktop-close]")){modal.classList.add("hidden");return}
    const restore=e.target.closest("[data-restore-backup]");if(restore){const id=Number(restore.dataset.restoreBackup);if(!confirm("恢复该备份会覆盖当前工作区。程序会先自动保存一份恢复前备份。继续吗？"))return;try{const result=await invoke("restore_backup",{backupId:id});localStorage.setItem(STORAGE_KEY,result.payload);location.reload()}catch(err){toast(`恢复失败：${err}`,true)}}
  });
  document.querySelector("#desktopCreateBackup").addEventListener("click",async()=>{try{await pumpSave();await invoke("create_backup",{label:"手动备份"});toast("已创建桌面备份");await refreshBackupModal()}catch(e){toast(`备份失败：${e}`,true)}});
  document.querySelector("#desktopCheckDb").addEventListener("click",async()=>{try{const result=await invoke("check_database");toast(result.ok?`数据库检查通过：${result.message}`:`数据库异常：${result.message}`,!result.ok)}catch(e){toast(`检查失败：${e}`,true)}});
  document.querySelector("#desktopOpenDataDir").addEventListener("click",async()=>{try{await invoke("open_data_directory")}catch(e){toast(`无法打开目录：${e}`,true)}});
  document.querySelector("#desktopRefreshBackups").addEventListener("click",refreshBackupModal);
  const saveState=document.querySelector("#saveState");if(saveState)saveState.textContent=isTauri?"桌面数据库":"浏览器预览";
}

function updateStartupStatus(message){
  const line=document.querySelector("#versionLine");
  if(line)line.textContent=message;
  setStableUiBootMessage(message);
}
function usableWorkspaceSnapshot(payload){
  if(!payload||typeof payload!=="string")return false;
  try{const parsed=JSON.parse(payload);return Array.isArray(parsed?.objects)&&parsed.objects.length>0}catch{return false}
}
function snapshotDataVersion(value){
  try{
    const parsed=typeof value==="string"?JSON.parse(value):value;
    return String(parsed?.dataVersion||"");
  }catch{return ""}
}
function preferredStartupFallback(legacy,seed){
  const seedVersion=snapshotDataVersion(seed);
  if(usableWorkspaceSnapshot(legacy)&&snapshotDataVersion(legacy)===seedVersion){
    return {payload:legacy,source:"local-cache-fallback"};
  }
  return {payload:seed,source:"private-repo-seed-fallback"};
}
function promiseWithTimeout(promise,ms,message){
  let timer;
  return Promise.race([
    promise.finally(()=>clearTimeout(timer)),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms)})
  ])
}
function recoveryBanner(message){
  const existing=document.querySelector("#desktopStartupRecovery");
  if(existing){existing.querySelector("span").textContent=message;return}
  const banner=document.createElement("div");banner.id="desktopStartupRecovery";banner.className="desktop-startup-recovery";
  banner.innerHTML=`<span>${escapeHtml(message)}</span><button type="button">重新启动</button>`;
  banner.querySelector("button").addEventListener("click",()=>location.reload());
  document.body.appendChild(banner);
}
function loadMainScriptAttempt(url){
  return new Promise((resolve,reject)=>{
    const script=document.createElement("script");let settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve()};
    const timer=setTimeout(()=>{script.remove();finish(new Error("地图主程序加载超时"))},MAIN_SCRIPT_TIMEOUT_MS);
    script.src=url;script.onload=()=>finish();script.onerror=()=>finish(new Error("无法加载地图主程序"));document.body.appendChild(script)
  })
}
function waitForMainProgramReady(){
  return new Promise((resolve,reject)=>{
    const started=Date.now();
    const check=()=>{
      if(window.__SHJ_MAIN_READY__===true){resolve();return}
      if(Date.now()-started>=MAIN_SCRIPT_TIMEOUT_MS){reject(new Error("地图主程序已载入，但初始化没有完成"));return}
      setTimeout(check,40)
    };
    check()
  })
}
async function loadMainScript(){
  updateStartupStatus("正在加载地图主程序……");
  window.__SHJ_MAIN_READY__=false;
  let runtimeError=null;
  const captureError=event=>{runtimeError=event?.error||new Error(event?.message||"地图主程序运行异常")};
  const captureRejection=event=>{runtimeError=event?.reason instanceof Error?event.reason:new Error(String(event?.reason||"地图主程序异步运行异常"))};
  window.addEventListener("error",captureError,true);window.addEventListener("unhandledrejection",captureRejection,true);
  try{
    try{await loadMainScriptAttempt("/app/app.js");await waitForMainProgramReady()}catch(firstError){
      if(runtimeError)throw runtimeError;
      console.warn("地图主程序首次加载失败，正在重试",firstError);
      document.querySelectorAll('script[src^="/app/app.js"]').forEach(node=>node.remove());
      window.__SHJ_MAIN_READY__=false;
      await loadMainScriptAttempt(`/app/app.js?retry=${Date.now()}`);
      await waitForMainProgramReady()
    }
    if(runtimeError)throw runtimeError
  }finally{
    window.removeEventListener("error",captureError,true);window.removeEventListener("unhandledrejection",captureRejection,true)
  }
}
async function start(){
  ensureCriticalUiBeforeMain();
  ensureStableUiBootCurtain();
  syncDesktopVersionChrome();
  updateStartupStatus("正在验证 GitHub 地图访问权限……");
  const githubAuth=await ensureGitHubAccess();
  let privateMapInfo=null;
  if(isTauri){
    updateStartupStatus("正在从 SHmap-Data 私有仓库读取正式地图……");
    privateMapInfo=await promiseWithTimeout(
      invoke("load_private_map_bundle"),
      PRIVATE_DATA_TIMEOUT_MS,
      "私有地图数据读取超过20秒"
    );
    hydratePrivateMapBundle(privateMapInfo?.payload);
    const legacy=localStorage.getItem(STORAGE_KEY),seed=JSON.stringify(seedSnapshot());
    updateStartupStatus(`已验证私有地图 ${privateMapInfo?.dataVersion||""}，正在读取桌面数据库……`);
    const task=invoke("bootstrap_workspace",{legacySnapshot:legacy,seedSnapshot:seed});
    bootstrapRecoveryTask=task;
    try{
      bootInfo=await promiseWithTimeout(task,BOOTSTRAP_TIMEOUT_MS,"桌面数据库读取超过8秒");
      if(!usableWorkspaceSnapshot(bootInfo?.snapshot))throw new Error("桌面数据库工作区为空或无效");
      localStorage.setItem(STORAGE_KEY,bootInfo.snapshot);nativeStorageReady=true
    }catch(error){
      startupFallback=true;nativeStorageReady=false;
      const selectedFallback=preferredStartupFallback(legacy,seed),fallback=selectedFallback.payload;
      localStorage.setItem(STORAGE_KEY,fallback);
      bootInfo={source:selectedFallback.source,snapshot:fallback,objectCount:JSON.parse(fallback).objects.length,databasePath:""};
      console.error("桌面数据库启动降级",error);
      updateStartupStatus(`数据库响应较慢，正在使用与${privateMapInfo?.dataVersion||"正式母表"}匹配的安全缓存启动……`);
      task.then(info=>{
        bootstrapRecoveryTask=null;nativeStorageReady=true;
        if(window.SHJ_DESKTOP){window.SHJ_DESKTOP.databaseRecovered=true;window.SHJ_DESKTOP.bootInfo=info}
        recoveryBanner("桌面数据库已经恢复连接。当前页面使用安全缓存，为避免覆盖差异，请重新启动程序后继续编辑。")
      }).catch(recoveryError=>{
        bootstrapRecoveryTask=null;console.error("桌面数据库后台恢复失败",recoveryError);
        recoveryBanner("桌面数据库暂未恢复。当前地图来自最新私有种子或同版本缓存，请先不要编辑；关闭程序后重新启动。")
      })
    }
  }
  window.SHJ_DESKTOP={
    active:isTauri&&nativeStorageReady&&!startupFallback,
    recoveryMode:startupFallback,
    databaseRecovered:false,
    githubAuth,
    privateMapInfo:privateMapInfo?{
      dataVersion:privateMapInfo.dataVersion,
      objectCount:privateMapInfo.objectCount,
      sha256:privateMapInfo.sha256
    }:null,
    saveWorkspace:queueSave,
    flush:flushWorkspace,
    createBackup:async label=>{await flushWorkspace();return invoke("create_backup",{label:label||"手动备份"})},
    bootInfo,
    publishPatch:args=>invoke("publish_patch_to_github",args),
    listPrivatePatches:()=>invoke("list_private_submissions"),
    readPrivatePatch:path=>invoke("read_private_submission",{path}),
    resolvePrivateAsset:fileName=>invoke("resolve_private_asset",{fileName})
  };
  await loadMainScript();
  await setupNativeCloseSaveGuard();
  setupNativeUi();
  updateStartupStatus("界面布局已完成，正在进入地图……");
  await revealStableUiAfterLayout();
  if(startupFallback){
    recoveryBanner(`桌面数据库读取超时，已从${privateMapInfo?.dataVersion||"最新"}私有种子或同版本安全缓存恢复地图。当前会话请先核对资料，不要进行编辑。`)
    const saveState=document.querySelector("#saveState");if(saveState)saveState.textContent="安全缓存恢复模式"
  }
  scheduleAutomaticUpdateCheck();
  if(!isTauri)toast("当前为浏览器预览模式；SQLite与原生备份未启用。",true);
}
start().catch(err=>{console.error(err);document.body.innerHTML=`<main class="desktop-boot-error"><article><h1>桌面版启动失败</h1><p>程序未能初始化地图。请关闭窗口后重新启动；原有数据库与备份不会被删除。</p><pre>${escapeHtml(err?.stack||err)}</pre></article></main>`});
