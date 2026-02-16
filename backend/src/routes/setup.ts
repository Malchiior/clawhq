/**
 * Setup Assistant API
 * Fully scripted onboarding flow — no AI calls needed.
 * Fast, reliable, zero API cost.
 */

import { Router, Response } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const INITIAL_MESSAGE = `Hey there! Welcome to ClawHQ — let's get your AI agent up and running.

How would you like to get started?

**1. Connect Existing** 🔗 — Already running OpenClaw? Link it here as your web/mobile interface.

**2. Cloud Hosted** ☁️ — We host everything. Pick a model, buy credits, live in 30 seconds.

**3. Download ClawHQ** 💻 — Install the desktop app on your PC. Run locally, bring your own keys or buy credits.

Which path is right for you?`

function detectPath(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('connect') || m.includes('existing') || m.includes('link') || m === '1') return 'connector'
  if (m.includes('cloud') || m.includes('host') || m === '2') return 'cloud'
  if (m.includes('download') || m.includes('desktop') || m.includes('local') || m.includes('own machine') || m.includes('my pc') || m === '3') return 'desktop'
  return null
}

function detectModel(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('sonnet') || (m.includes('claude') && !m.includes('haiku') && !m.includes('opus'))) return 'claude-sonnet-4-20250514'
  if (m.includes('haiku')) return 'claude-3-haiku-20240307'
  if (m.includes('opus')) return 'claude-opus-4-6'
  if (m.includes('gpt') || m.includes('openai') || m.includes('4o')) return 'gpt-4o'
  if (m.includes('gemini') || m.includes('google') || m.includes('flash')) return 'gemini-1.5-flash'
  if (m.includes('deepseek')) return 'deepseek-chat'
  if (m.includes('grok')) return 'grok-beta'
  if (m === '1' || m.includes('recommend')) return 'claude-sonnet-4-20250514'
  if (m === '2') return 'claude-3-haiku-20240307'
  if (m === '3') return 'gpt-4o'
  if (m === '4') return 'gemini-1.5-flash'
  return null
}

function detectOS(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('windows') || m.includes('win')) return 'windows'
  if (m.includes('mac') || m.includes('macos') || m.includes('apple')) return 'mac'
  if (m.includes('linux') || m.includes('ubuntu') || m.includes('debian')) return 'linux'
  return null
}

interface SetupState {
  path?: string       // connector | cloud | desktop
  agentName?: string
  model?: string
  gatewayUrl?: string
  systemPrompt?: string
  os?: string
  apiChoice?: string  // credits | byok
  step: string
}

const setupStates: Map<string, SetupState> = new Map()

function getState(userId: string): SetupState {
  if (!setupStates.has(userId)) {
    setupStates.set(userId, { step: 'path_select' })
  }
  return setupStates.get(userId)!
}

interface QuickReply { label: string; value: string }

function processMessage(userId: string, message: string): { reply: string; setupComplete?: boolean; setupData?: any; detect?: boolean; bridgeSetup?: boolean; quickReplies?: QuickReply[] } {
  const state = getState(userId)
  const m = message.trim()

  switch (state.step) {
    case 'path_select': {
      const path = detectPath(m)
      if (!path) {
        return { reply: "I didn't catch that. Just pick a number:\n\n**1.** Connect Existing 🔗\n**2.** Cloud Hosted ☁️\n**3.** Download ClawHQ 💻" }
      }
      state.path = path

      if (path === 'connector') {
        state.step = 'connector_location'
        return { reply: "Great choice! 🔗 ClawHQ becomes your web & mobile interface for OpenClaw.\n\nIs OpenClaw running on **this PC** or a **remote server**?", quickReplies: [{ label: "🖥️ This PC", value: "this pc" }, { label: "🌐 Remote Server", value: "remote server" }] }
      }
      if (path === 'cloud') {
        state.step = 'cloud_name'
        return { reply: "Awesome! Cloud Hosted is the fastest way to get started. ☁️\n\nWhat would you like to name your agent?" }
      }
      if (path === 'desktop') {
        state.step = 'desktop_os'
        return { reply: "Nice choice! 💻 The ClawHQ desktop app runs OpenClaw right on your machine — no remote servers needed.\n\nWhat operating system are you on?", quickReplies: [{ label: "🪟 Windows", value: "windows" }, { label: "🍎 Mac", value: "mac" }, { label: "🐧 Linux", value: "linux" }] }
      }
      break
    }

    // ── Connector Path ──
    case 'connector_location': {
      const lower = m.toLowerCase()
      if (lower.includes('this') || lower.includes('local') || lower.includes('same') || lower.includes('pc') || lower.includes('yes')) {
        state.gatewayUrl = 'http://localhost:18789'
        state.step = 'connector_name'
        return { reply: "Perfect — we'll connect to `localhost:18789`.\n\n⚠️ **Make sure OpenClaw is installed and running on this PC.** If it's not running yet, install it first: `npm install -g openclaw && openclaw start`\n\nWhat would you like to name your agent?" }
      }
      if (lower.includes('remote') || lower.includes('server') || lower.includes('vps') || lower.includes('aws') || lower.includes('other') || lower.includes('no') || lower.includes('different')) {
        state.step = 'connector_url'
        return { reply: "No problem! Paste your remote gateway URL (e.g. `https://your-server.com:18789` or `http://192.168.1.100:18789`)." }
      }
      return { reply: "Is it on **this PC** or a **remote server**?", quickReplies: [{ label: "🖥️ This PC", value: "this pc" }, { label: "🌐 Remote Server", value: "remote server" }] }
    }

    case 'connector_url': {
      if (!m.includes('http') && !m.includes('localhost') && !m.match(/\d+\.\d+\.\d+/)) {
        return { reply: "That doesn't look like a URL. It usually looks like `http://localhost:18789` or `https://your-server.com:18789`. What is it?" }
      }
      state.gatewayUrl = m
      state.step = 'connector_name'
      return { reply: `Got it — connecting to ${m}. What would you like to name your agent?` }
    }

    case 'connector_name': {
      // If user typed a URL instead of a name, treat it as custom gateway URL
      if (m.includes('http') || m.includes('localhost')) {
        state.gatewayUrl = m
        return { reply: `Updated gateway to ${m}. Now, what would you like to name your agent?` }
      }
      state.agentName = m
      state.step = 'confirm'
      return {
        reply: `Perfect! Here's your setup:\n\n🔗 **Mode:** Connect Existing\n🌐 **Gateway:** ${state.gatewayUrl}\n🤖 **Agent Name:** ${state.agentName}\n\nLook good?`,
        quickReplies: [{ label: "✅ Yes, finish!", value: "yes" }, { label: "🔄 Start over", value: "no" }],
      }
    }

    // ── Cloud Path ──
    case 'cloud_name': {
      state.agentName = m
      state.step = 'cloud_model'
      return {
        reply: "Now pick your AI model:",
        quickReplies: [{ label: "⭐ Claude Sonnet", value: "claude sonnet" }, { label: "⚡ Claude Haiku", value: "claude haiku" }, { label: "🤖 GPT-4o", value: "gpt-4o" }, { label: "💎 Gemini Flash", value: "gemini flash" }]
      }
    }

    case 'cloud_model': {
      const model = detectModel(m)
      if (!model) {
        return { reply: "Just pick a model:", quickReplies: [{ label: "⭐ Claude Sonnet", value: "claude sonnet" }, { label: "⚡ Claude Haiku", value: "claude haiku" }, { label: "🤖 GPT-4o", value: "gpt-4o" }, { label: "💎 Gemini Flash", value: "gemini flash" }] }
      }
      state.model = model
      state.step = 'confirm'
      const modelName = model.includes('sonnet') ? 'Claude Sonnet' : model.includes('haiku') ? 'Claude Haiku' : model.includes('gpt') ? 'GPT-4o' : model.includes('gemini') ? 'Gemini Flash' : model
      return {
        reply: `Here's your setup:\n\n☁️ **Mode:** Cloud Hosted\n🤖 **Agent:** ${state.agentName}\n🧠 **Model:** ${modelName}\n\nLook good?`,
        quickReplies: [{ label: "✅ Yes, deploy!", value: "yes" }, { label: "🔄 Start over", value: "no" }]
      }
    }

    // ── Desktop Path ──
    case 'desktop_os': {
      const os = detectOS(m)
      if (!os) {
        return { reply: "Which OS? Just say **Windows**, **Mac**, or **Linux**." }
      }
      state.os = os
      state.step = 'desktop_download'
      const osLabel = os.charAt(0).toUpperCase() + os.slice(1)
      const downloadLinks: Record<string, string> = {
        windows: 'https://clawhq.dev/download/windows',
        mac: 'https://clawhq.dev/download/mac',
        linux: 'https://clawhq.dev/download/linux',
      }
      return {
        reply: `Here's your download link:\n\n📥 **[Download ClawHQ for ${osLabel}](${downloadLinks[os]})**\n\nInstall and launch the app — it'll set up OpenClaw locally in a container for you.\n\nWhile that installs, how would you like to handle API access?`,
        quickReplies: [{ label: "💳 Buy Credits", value: "buy credits" }, { label: "🔑 Bring My Own Keys", value: "bring my own keys" }, { label: "⏭️ Skip", value: "skip" }]
      }
    }

    case 'desktop_download': {
      const lower = m.toLowerCase()
      if (lower.includes('credit') || lower.includes('buy') || lower === '1') {
        state.apiChoice = 'credits'
      } else if (lower.includes('byok') || lower.includes('own') || lower.includes('key') || lower === '2') {
        state.apiChoice = 'byok'
      } else if (lower === 'skip') {
        state.apiChoice = 'skip'
      } else {
        return { reply: "How would you like to handle API access?", quickReplies: [{ label: "💳 Buy Credits", value: "buy credits" }, { label: "🔑 Bring My Own Keys", value: "bring my own keys" }, { label: "⏭️ Skip", value: "skip" }] }
      }
      state.step = 'desktop_name'
      return { reply: "What would you like to name your agent?" }
    }

    case 'desktop_name': {
      state.agentName = m
      state.step = 'confirm'
      const apiLabel = state.apiChoice === 'credits' ? '💳 ClawHQ Credits' : state.apiChoice === 'byok' ? '🔑 Bring Your Own Keys' : '⏭️ Decide later'
      return {
        reply: `Here's your setup:\n\n💻 **Mode:** Desktop App\n💿 **OS:** ${(state.os || 'unknown').charAt(0).toUpperCase() + (state.os || 'unknown').slice(1)}\n🔌 **API:** ${apiLabel}\n🤖 **Agent:** ${state.agentName}\n\nLook good?`,
        quickReplies: [{ label: "✅ Yes, finish!", value: "yes" }, { label: "🔄 Start over", value: "no" }]
      }
    }

    // ── Confirmation ──
    case 'confirm': {
      if (m.toLowerCase().includes('yes') || m.toLowerCase().includes('confirm') || m.toLowerCase() === 'y') {
        const deployMode = state.path === 'cloud' ? 'CLOUD' : state.path === 'connector' ? 'CONNECTOR' : 'DESKTOP'
        const needsBridge = state.path === 'connector'
        return {
          reply: needsBridge
            ? `Agent created! Now let's connect your bridge...`
            : `🎉 **Your agent "${state.agentName}" is ready!** Redirecting you to your dashboard...`,
          setupComplete: !needsBridge,
          bridgeSetup: needsBridge || undefined,
          setupData: {
            deployMode,
            agentName: state.agentName || 'My Agent',
            model: state.model || 'claude-sonnet-4-20250514',
            gatewayUrl: state.gatewayUrl || null,
            systemPrompt: state.systemPrompt || 'You are a helpful AI assistant.',
          }
        }
      }
      state.step = 'path_select'
      return { reply: "No worries, let's start over!\n\nHow would you like to get started?\n\n**1.** Connect Existing 🔗\n**2.** Cloud Hosted ☁️\n**3.** Download ClawHQ 💻" }
    }
  }

  state.step = 'path_select'
  return { reply: "Let's get you set up! Pick an option:\n\n**1.** Connect Existing 🔗\n**2.** Cloud Hosted ☁️\n**3.** Download ClawHQ 💻" }
}

// GET /api/setup/status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { setupComplete: true, setupStep: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      setupRequired: !user.setupComplete,
      currentStep: user.setupStep,
      initialMessage: !user.setupComplete ? INITIAL_MESSAGE : null,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/message
router.post('/message', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { message } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    const result = processMessage(userId, message)

    if ((result.setupComplete || (result as any).bridgeSetup) && result.setupData) {
      const data = result.setupData
      const agent = await prisma.agent.create({
        data: {
          name: data.agentName || 'My Agent',
          model: data.model || 'claude-sonnet-4-20250514',
          systemPrompt: data.systemPrompt || 'You are a helpful AI assistant.',
          deployMode: data.deployMode || 'CLOUD',
          status: 'STOPPED',
          userId,
        }
      })

      if ((result as any).bridgeSetup) {
        // CONNECTOR path: create a Machine + don't mark setup complete yet
        setupStates.delete(userId)
        const secret = process.env.JWT_SECRET || 'dev-secret'
        const token = jwt.sign(
          { userId, type: 'access', bridge: true },
          secret,
          { expiresIn: '365d' }
        )
        // Create machine and assign agent to it
        const machine = await prisma.machine.create({
          data: {
            name: 'My Computer',
            bridgeToken: token,
            userId,
          }
        })
        await prisma.agent.update({
          where: { id: agent.id },
          data: { machineId: machine.id }
        })
        return res.json({
          reply: result.reply,
          setupComplete: false,
          bridgeSetup: true,
          agentId: agent.id,
          agentName: agent.name,
          machineId: machine.id,
          bridgeToken: token,
          bridgeCommand: `npx clawhq-bridge --token=${token} --agent=${agent.id}`,
        })
      }

      await prisma.user.update({
        where: { id: userId },
        data: { setupComplete: true, setupStep: 'complete' }
      })

      setupStates.delete(userId)

      return res.json({
        reply: result.reply,
        setupComplete: true,
        agentId: agent.id,
        agentName: agent.name,
      })
    }

    res.json({ reply: result.reply, setupComplete: false, detect: result.detect || false, quickReplies: result.quickReplies || null })
  } catch (err: any) {
    console.error('Setup error:', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// POST /api/setup/bridge-connected
router.post('/bridge-connected', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { setupComplete: true, setupStep: 'complete' }
    })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/skip
router.post('/skip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: true, setupStep: 'skipped' } })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/complete
router.post('/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: true, setupStep: 'complete' } })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/setup/reset (for testing)
router.post('/reset', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.userId! }, data: { setupComplete: false, setupStep: null } })
    setupStates.delete(req.userId!)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/setup/bridge-download
router.get('/bridge-download', async (req, res) => {
  const { token, agent, os } = req.query as { token?: string; agent?: string; os?: string }
  const t = token || 'YOUR_TOKEN'
  const a = agent || 'YOUR_AGENT_ID'
  const apiUrl = 'https://clawhq-api-production-f6d7.up.railway.app'

  // Look up agent to get sessionMode
  let sessionMode = 'separate'
  try {
    const agentRecord = await prisma.agent.findUnique({ where: { id: a } })
    if (agentRecord?.sessionMode) sessionMode = agentRecord.sessionMode
  } catch {}

  if (os === 'mac' || os === 'linux') {
    const sk = sessionMode === 'shared' ? 'agent:main:main' : `clawhq:${a}`
    const script = `#!/bin/bash\necho "========================================"\necho "   ClawHQ Bridge - Connecting..."\necho "   Session mode: ${sessionMode}"\necho "========================================"\nif ! command -v node &> /dev/null; then echo "ERROR: Node.js required. Install from https://nodejs.org"; exit 1; fi\nnpm install socket.io-client@4 > /dev/null 2>&1\nnode -e "const io=require('socket.io-client');const SK='${sk}';const s=io('${apiUrl}',{auth:{token:'${t}'},reconnection:true,reconnectionDelay:5000});s.on('connect',()=>{console.log('[Bridge] Connected to ClawHQ!');s.emit('bridge:register',{agentId:'${a}'})});s.on('bridge:registered',()=>console.log('[Bridge] Registered - ready'));s.on('bridge:message',async(d)=>{console.log('[Bridge] Message:',d.content);try{const r=await fetch('http://127.0.0.1:18789/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','x-openclaw-session-key':SK},body:JSON.stringify({model:'openclaw:main',messages:[{role:'user',content:d.content}],stream:false})});if(r.ok){const j=await r.json();s.emit('bridge:response',{agentId:'${a}',messageId:d.messageId,content:j.choices[0].message.content})}else{await fetch('http://127.0.0.1:18789/hooks/wake',{method:'POST',headers:{'Content-Type':'application/json','x-openclaw-session-key':SK},body:JSON.stringify({text:d.content,mode:'now'})});s.emit('bridge:response',{agentId:'${a}',messageId:d.messageId,content:'Sent via webhook.'})}}catch(e){s.emit('bridge:response',{agentId:'${a}',messageId:d.messageId,content:'Error: '+e.message})}});s.on('disconnect',r=>console.log('Disconnected:',r));setInterval(()=>{},30000)"\n`
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', 'attachment; filename="clawhq-bridge.sh"')
    return res.send(script)
  }

  // Default: windows — sets up in %USERPROFILE%\ClawHQ\bridge\
  const bridgeJs = `const io=require('socket.io-client');
const {execSync,spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const CLAWHQ='${apiUrl}';
const TOKEN='${t}';
const AGENT='${a}';
const SESSION_MODE='${sessionMode}';
const PORT=18789;
let OC_TOKEN=process.env.OPENCLAW_TOKEN||process.env.OPENCLAW_GATEWAY_TOKEN||'';
try{const cfg=JSON.parse(fs.readFileSync(path.join(require('os').homedir(),'.openclaw','openclaw.json'),'utf8'));OC_TOKEN=OC_TOKEN||cfg.gateway?.auth?.token||'';if(OC_TOKEN)console.log('[Bridge] Auto-detected gateway token')}catch(e){}
const SK=SESSION_MODE==='shared'?'agent:main:main':'clawhq:'+AGENT;

function checkInstalled(){try{const v=execSync('openclaw --version',{timeout:10000,stdio:['pipe','pipe','pipe']}).toString().trim();return{installed:true,version:v}}catch(e){return{installed:false,version:null}}}
async function checkGateway(){try{const r=await fetch('http://127.0.0.1:'+PORT+'/health',{signal:AbortSignal.timeout(5000)});if(r.ok){const d=await r.json().catch(()=>({}));return{running:true,uptime:d.uptime||null,version:d.version||null}}return{running:false}}catch(e){return{running:false}}}
function tryStart(){return new Promise(resolve=>{console.log('[Bridge] Starting OpenClaw gateway...');try{const isWin=process.platform==='win32';const c=spawn(isWin?'openclaw.cmd':'openclaw',['gateway','start'],{detached:true,stdio:'ignore',shell:isWin});c.unref();setTimeout(async()=>{const s=await checkGateway();if(s.running)resolve({success:true});else setTimeout(async()=>{const r=await checkGateway();resolve({success:r.running})},5000)},5000)}catch(e){resolve({success:false,error:e.message})}})}
function tryInstall(){return new Promise(resolve=>{console.log('[Bridge] Installing OpenClaw...');try{execSync('npm install -g openclaw@latest',{timeout:120000,stdio:'inherit'});const c=checkInstalled();resolve({success:c.installed,version:c.version})}catch(e){resolve({success:false,error:e.message})}})}
async function getHealth(){const i=checkInstalled();const g=await checkGateway();let st='not-installed';if(i.installed&&g.running)st='running';else if(i.installed)st='installed-stopped';return{status:st,installed:i.installed,clawVersion:i.version,gatewayRunning:g.running,gatewayUptime:g.uptime,platform:process.platform,nodeVersion:process.version}}

const s=io(CLAWHQ,{auth:{token:TOKEN},reconnection:true,reconnectionDelay:5000});
s.on('connect',async()=>{console.log('[Bridge] Connected to ClawHQ!');const h=await getHealth();console.log('[Bridge] Status:',h.status);s.emit('bridge:register',{agentId:AGENT,health:h})});
s.on('bridge:registered',()=>{console.log('');console.log('========================================');console.log('  DO NOT CLOSE THIS WINDOW!');console.log('  Bridge is running and connected.');console.log('========================================');console.log('')});
s.on('bridge:command',async(d)=>{const{command,requestId}=d;console.log('[Bridge] Command:',command);try{let result;switch(command){case'health-check':result=await getHealth();break;case'start-gateway':{const r=await tryStart();result={...r,health:await getHealth()};break}case'install-openclaw':{const r=await tryInstall();result={...r,health:await getHealth()};break}case'restart-gateway':{try{execSync('openclaw gateway stop',{timeout:10000,stdio:'pipe'})}catch(e){}await new Promise(r=>setTimeout(r,2000));const r2=await tryStart();result={...r2,health:await getHealth()};break}default:result={error:'Unknown: '+command}}s.emit('bridge:command-result',{requestId,agentId:AGENT,command,result})}catch(e){s.emit('bridge:command-result',{requestId,agentId:AGENT,command,result:{error:e.message}})}});
s.on('bridge:message',async(d)=>{
  console.log('[Bridge] Message:',d.content);
  try{
    const hdrs={'Content-Type':'application/json','x-openclaw-session-key':SK};if(OC_TOKEN)hdrs['Authorization']='Bearer '+OC_TOKEN;
    const r=await fetch('http://127.0.0.1:'+PORT+'/v1/chat/completions',{method:'POST',headers:hdrs,body:JSON.stringify({model:'openclaw:main',messages:[{role:'user',content:d.content}],stream:false})});
    if(r.ok){const j=await r.json();s.emit('bridge:response',{agentId:AGENT,messageId:d.messageId,content:j.choices[0].message.content})}
    else{const wh={'Content-Type':'application/json','x-openclaw-session-key':SK};if(OC_TOKEN)wh['Authorization']='Bearer '+OC_TOKEN;await fetch('http://127.0.0.1:'+PORT+'/hooks/wake',{method:'POST',headers:wh,body:JSON.stringify({text:d.content,mode:'now'})});s.emit('bridge:response',{agentId:AGENT,messageId:d.messageId,content:'Sent via webhook.'})}
  }catch(e){console.error('[Bridge] Error:',e.message);s.emit('bridge:response',{agentId:AGENT,messageId:d.messageId,content:'Error: '+e.message})}
});
setInterval(async()=>{if(s.connected){const h=await getHealth();s.emit('bridge:status',{agentId:AGENT,health:h})}},30000);
s.on('disconnect',r=>console.log('[Bridge] Disconnected:',r));
s.on('connect_error',e=>console.error('[Bridge] Error:',e.message));
console.log('[Bridge] Running...');`
  const b64 = Buffer.from(bridgeJs).toString('base64')
  const batch = `@echo off\r\necho ========================================\r\necho    ClawHQ Bridge Setup\r\necho ========================================\r\necho.\r\nwhere node >nul 2>&1\r\nif %errorlevel% neq 0 (\r\n  echo ERROR: Node.js is required.\r\n  echo Download it at https://nodejs.org\r\n  pause\r\n  exit /b 1\r\n)\r\nset "BRIDGE_DIR=%USERPROFILE%\\ClawHQ\\bridge"\r\nif not exist "%BRIDGE_DIR%" (\r\n  echo Creating %BRIDGE_DIR%...\r\n  mkdir "%BRIDGE_DIR%"\r\n)\r\ncd /d "%BRIDGE_DIR%"\r\nif not exist node_modules (\r\n  echo Installing dependencies in %BRIDGE_DIR%...\r\n  echo {"name":"clawhq-bridge","private":true,"dependencies":{"socket.io-client":"^4.7.4"}}> package.json\r\n  call npm install --silent 2>nul\r\n  echo.\r\n)\r\nnode -e "require('fs').writeFileSync('bridge.js',Buffer.from('${b64}','base64').toString())"\r\necho.\r\necho Starting ClawHQ Bridge...\r\necho.\r\nnode bridge.js\r\npause\r\n`
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', 'attachment; filename="clawhq-bridge.bat"')
  res.send(batch)
})

export default router
