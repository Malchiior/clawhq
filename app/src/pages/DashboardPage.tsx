import { motion } from 'framer-motion'
import { Bot, MessageSquare, Zap, TrendingUp, ArrowUpRight, Activity, Clock } from 'lucide-react'

const stats = [
  { label: 'Active Agents', value: '3', change: '+1', icon: Bot, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Messages Today', value: '1,247', change: '+23%', icon: MessageSquare, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Tokens Used', value: '842K', change: '+12%', icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Avg Response', value: '1.2s', change: '-8%', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
]

const recentActivity = [
  { agent: 'Support Bot', event: 'Handled customer query about pricing', time: '2 min ago', status: 'success' },
  { agent: 'Sales Agent', event: 'Qualified lead from website chat', time: '5 min ago', status: 'success' },
  { agent: 'Content Writer', event: 'Generated blog post draft', time: '12 min ago', status: 'success' },
  { agent: 'Support Bot', event: 'Escalated ticket #4521 to human', time: '18 min ago', status: 'warning' },
  { agent: 'Data Analyst', event: 'Container restart due to OOM', time: '1 hr ago', status: 'error' },
]

const agents = [
  { name: 'Support Bot', status: 'RUNNING', messages: 847, model: 'Claude Sonnet' },
  { name: 'Sales Agent', status: 'RUNNING', messages: 312, model: 'GPT-4o' },
  { name: 'Content Writer', status: 'RUNNING', messages: 88, model: 'Claude Sonnet' },
  { name: 'Data Analyst', status: 'STOPPED', messages: 0, model: 'Claude Opus' },
]

const statusColors: Record<string, string> = {
  RUNNING: 'bg-success',
  STOPPED: 'bg-text-muted',
  ERROR: 'bg-error',
  STARTING: 'bg-accent',
}

const activityColors: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-accent',
  error: 'bg-error',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function DashboardPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Overview of your AI agent fleet</p>
      </div>

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <motion.div key={s.label} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <span className="flex items-center gap-0.5 text-xs font-medium text-success">
                {s.change} <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-2xl font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        {/* Agent Overview */}
        <motion.div variants={item} className="col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-text">Agent Overview</h2>
            <button className="text-xs text-primary hover:text-primary-hover transition-colors">View all →</button>
          </div>
          <div className="divide-y divide-border">
            {agents.map(a => (
              <div key={a.name} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{a.name}</p>
                    <p className="text-[11px] text-text-muted">{a.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-text-secondary">{a.messages} msgs</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${statusColors[a.status]}`} />
                    <span className="text-xs text-text-muted capitalize">{a.status.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-text">Recent Activity</h2>
            <Activity className="w-4 h-4 text-text-muted" />
          </div>
          <div className="p-3 space-y-1">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="mt-1.5"><div className={`w-2 h-2 rounded-full ${activityColors[a.status]}`} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate">{a.event}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-muted font-medium">{a.agent}</span>
                    <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{a.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
