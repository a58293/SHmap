
import "./desktop-ui.css";
import { Channel, invoke } from "@tauri-apps/api/core";

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
const MAIN_SCRIPT_TIMEOUT_MS = 8000;
const AUTO_UPDATE_KEY = "shj_desktop_auto_update_v1";
const UPDATE_CHECK_KEY = "shj_desktop_last_update_check_v1";

function seedSnapshot(){
  const initial=window.SHJ_INITIAL_DATA||{metadata:{},objects:[]};
  return {
    objects:initial.objects||[],changes:[],changeArchives:[],appliedRemotePatches:[],remotePatchHistory:[],viewedRemotePatches:[],
    dataVersion:initial.metadata?.dataVersion||"v075-r0001",camera:{x:0,y:0,zoom:.92},selectedId:initial.objects?.[0]?.id||null,
    selectedCell:null,tileProfiles:{},trash:[],trashRetentionDays:0,nextIdCounter:0,dossierMode:"brief",brushKeys:[],brushStrokes:[],viewPreset:"all",compareKeys:[]
  };
}
function toast(message,error=false){
  const n=document.createElement("div");n.className=`desktop-toast${error?" error":""}`;n.textContent=message;document.body.appendChild(n);setTimeout(()=>n.remove(),3200)
}
async function pumpSave(){
  if(saveBusy||!savePending||!isTauri||!nativeStorageReady)return;
  saveBusy=true;const payload=savePending;savePending=null;
  try{await invoke("save_workspace",{payload})}catch(err){console.error(err);toast(`桌面数据库保存失败：${err}`,true)}finally{saveBusy=false;if(savePending)pumpSave()}
}
async function flushWorkspace(){
  clearTimeout(saveTimer);saveTimer=null;
  if(savePending&&!saveBusy)await pumpSave();
  while(saveBusy||savePending){await new Promise(resolve=>setTimeout(resolve,35));if(savePending&&!saveBusy)await pumpSave()}
}
function queueSave(payload){
  savePending=payload;clearTimeout(saveTimer);saveTimer=setTimeout(pumpSave,80)
}
function formatTime(value){try{return new Intl.DateTimeFormat("zh-CN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return value||""}}
function escapeHtml(v){return String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}


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
    if(notes)notes.innerHTML=escapeHtml(info.body||"本次更新未填写说明。").replace(/\n/g,"<br>");
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
  const button=document.createElement("button");button.id="desktopBackupBtn";button.className="btn secondary desktop-native-btn";button.textContent="桌面备份";
  const updateButton=document.createElement("button");updateButton.id="desktopUpdateBtn";updateButton.className="btn secondary desktop-update-btn";updateButton.textContent="检查更新";
  actions.prepend(button);actions.prepend(updateButton);
  const modal=document.createElement("section");modal.id="desktopBackupModal";modal.className="desktop-native-modal hidden";modal.innerHTML=`<div class="desktop-native-backdrop" data-desktop-close></div><article class="desktop-native-card"><header class="desktop-native-head"><div><span class="eyebrow">NATIVE STORAGE</span><h2>桌面数据库与备份</h2><p>SQLite为主存储，兼容缓存只用于界面快速启动。</p></div><button class="desktop-native-close" data-desktop-close>×</button></header><div class="desktop-native-status"><div class="desktop-native-kpi"><strong id="desktopDbObjects">—</strong><span>当前对象</span></div><div class="desktop-native-kpi"><strong id="desktopDbBackups">—</strong><span>可恢复备份</span></div><div class="desktop-native-kpi"><strong id="desktopDbUpdated">—</strong><span>最近写入</span></div></div><div class="desktop-native-actions"><button class="primary" id="desktopCreateBackup">立即备份</button><button id="desktopCheckDb">检查数据库</button><button id="desktopOpenDataDir">打开数据目录</button><button id="desktopRefreshBackups">刷新</button></div><div class="desktop-backup-list" id="desktopBackupList"></div><footer class="desktop-native-foot" id="desktopDbPath"></footer></article>`;document.body.appendChild(modal);
  const updateModal=document.createElement("section");updateModal.id="desktopUpdateModal";updateModal.className="desktop-native-modal hidden";updateModal.innerHTML=`<div class="desktop-native-backdrop" data-update-close></div><article class="desktop-native-card desktop-update-card"><header class="desktop-native-head"><div><span class="eyebrow">SIGNED DESKTOP UPDATE</span><h2>程序更新</h2><p>自动尝试仓库直连、CDN与GitHub Releases，并安装经过签名验证的Windows版本。</p></div><button class="desktop-native-close" data-update-close>×</button></header><div class="desktop-native-status"><div class="desktop-native-kpi"><strong id="desktopCurrentVersion">—</strong><span>当前版本</span></div><div class="desktop-native-kpi"><strong id="desktopLatestVersion">—</strong><span>可用版本</span></div><div class="desktop-native-kpi"><strong id="desktopUpdateChannel">自动选择</strong><span>多线路更新</span></div></div><div class="desktop-update-state" id="desktopUpdateState">尚未检查</div><div class="desktop-update-progress"><i id="desktopUpdateProgressBar"></i></div><div class="desktop-update-progress-text" id="desktopUpdateProgressText"></div><section class="desktop-update-notes"><h3>版本说明</h3><div id="desktopUpdateNotes">点击“检查更新”读取最新版本。</div></section><div class="desktop-native-actions"><button class="primary" id="desktopCheckUpdate">检查更新</button><button id="desktopInstallUpdate" disabled>下载并安装</button><label class="desktop-update-auto"><input type="checkbox" id="desktopAutoUpdate"> 每天自动检查</label></div><footer class="desktop-native-foot">安装前会自动保存工作区并建立“更新前备份”。</footer></article>`;document.body.appendChild(updateModal);
  const openUpdate=async()=>{updateModal.classList.remove("hidden");try{const info=await invoke("app_version");document.querySelector("#desktopCurrentVersion").textContent=`${info.edition} · ${info.version}`;}catch{document.querySelector("#desktopCurrentVersion").textContent="v007";}};
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
}
function usableWorkspaceSnapshot(payload){
  if(!payload||typeof payload!=="string")return false;
  try{const parsed=JSON.parse(payload);return Array.isArray(parsed?.objects)&&parsed.objects.length>0}catch{return false}
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
async function loadMainScript(){
  updateStartupStatus("正在加载地图主程序……");
  try{await loadMainScriptAttempt("/app/app.js")}catch(firstError){
    console.warn("地图主程序首次加载失败，正在重试",firstError);
    await loadMainScriptAttempt(`/app/app.js?retry=${Date.now()}`)
  }
}
async function start(){
  if(isTauri){
    const legacy=localStorage.getItem(STORAGE_KEY),seed=JSON.stringify(seedSnapshot());
    updateStartupStatus("正在读取桌面数据库……");
    const task=invoke("bootstrap_workspace",{legacySnapshot:legacy,seedSnapshot:seed});
    bootstrapRecoveryTask=task;
    try{
      bootInfo=await promiseWithTimeout(task,BOOTSTRAP_TIMEOUT_MS,"桌面数据库读取超过8秒");
      if(!usableWorkspaceSnapshot(bootInfo?.snapshot))throw new Error("桌面数据库工作区为空或无效");
      localStorage.setItem(STORAGE_KEY,bootInfo.snapshot);nativeStorageReady=true
    }catch(error){
      startupFallback=true;nativeStorageReady=false;
      const fallback=usableWorkspaceSnapshot(legacy)?legacy:seed;
      localStorage.setItem(STORAGE_KEY,fallback);
      bootInfo={source:usableWorkspaceSnapshot(legacy)?"local-cache-fallback":"built-in-seed-fallback",snapshot:fallback,objectCount:JSON.parse(fallback).objects.length,databasePath:""};
      console.error("桌面数据库启动降级",error);
      updateStartupStatus("数据库响应较慢，正在使用本地缓存启动……");
      task.then(info=>{
        bootstrapRecoveryTask=null;nativeStorageReady=true;
        if(window.SHJ_DESKTOP){window.SHJ_DESKTOP.databaseRecovered=true;window.SHJ_DESKTOP.bootInfo=info}
        recoveryBanner("桌面数据库已经恢复连接。当前页面使用本地缓存，为避免覆盖差异，请重新启动程序后继续编辑。")
      }).catch(recoveryError=>{
        bootstrapRecoveryTask=null;console.error("桌面数据库后台恢复失败",recoveryError);
        recoveryBanner("桌面数据库暂未恢复。当前地图来自本地缓存，请先不要编辑；关闭程序后重新启动。")
      })
    }
  }
  window.SHJ_DESKTOP={active:isTauri&&nativeStorageReady&&!startupFallback,recoveryMode:startupFallback,databaseRecovered:false,saveWorkspace:queueSave,flush:flushWorkspace,bootInfo,publishPatch:args=>invoke("publish_patch_to_github",args)};
  await loadMainScript();
  setupNativeUi();
  if(startupFallback){
    recoveryBanner("桌面数据库读取超时，已从本地缓存恢复地图。当前会话请先核对资料，不要进行编辑。")
    const saveState=document.querySelector("#saveState");if(saveState)saveState.textContent="本地缓存恢复模式"
  }
  scheduleAutomaticUpdateCheck();
  if(!isTauri)toast("当前为浏览器预览模式；SQLite与原生备份未启用。",true);
  window.addEventListener("beforeunload",()=>{if(savePending&&isTauri&&nativeStorageReady)navigator.sendBeacon?.("about:blank")},{capture:true});
}
start().catch(err=>{console.error(err);document.body.innerHTML=`<main class="desktop-boot-error"><article><h1>桌面版启动失败</h1><p>程序未能初始化地图。请关闭窗口后重新启动；原有数据库与备份不会被删除。</p><pre>${escapeHtml(err?.stack||err)}</pre></article></main>`});
