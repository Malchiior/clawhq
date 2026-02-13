import { motion } from 'framer-motion'
import { BookOpen, Rocket, Bot, Radio, Key, Code, ExternalLink, Search } from 'lucide-react'

const sections = [
  { icon: Rocket, title: 'Getting Started', desc: 'Quick start guide to deploy your first agent', articles: ['Create your account', 'Deploy your first agent', 'Connect a channel', 'Send your first message'] },
  { icon: Bot, title: 'Agents', desc: 'Configure and manage your AI agents', articles: ['Agent configuration', 'System prompts best practices', 'Model selection guide', 'Container management'] },
  { icon: Radio, title: 'Channels', desc: 'Connect messaging platforms', articles: ['Telegram setup', 'WhatsApp Business API', 'Discord bot integration', 'Slack app setup'] },
  { icon: Key, title: 'API Reference', desc: 'REST API documentation', articles: ['Authentication', 'Agents endpoint', 'Channels endpoint', 'Webhooks'] },
  { icon: Code, title: 'SDKs & Libraries', desc: 'Client libraries for popular languages', articles: ['JavaScript/TypeScript', 'Python', 'Go', 'Ruby'] },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function DocsPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Documentation</h1>
          <p className="text-sm text-text-secondary mt-1">Everything you need to build with ClawHQ</p>
        </div>
        <a href="https://docs.clawhq.com" target="_blank" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors">
          Full docs <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input type="text" placeholder="Search documentation..." className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
      </div>

      <motion.div variants={container} className="grid grid-cols-2 gap-4">
        {sections.map(s => (
          <motion.div key={s.title} variants={item} className="bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text">{s.title}</h3>
                <p className="text-xs text-text-muted">{s.desc}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {s.articles.map(a => (
                <li key={a}>
                  <button className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1.5 w-full text-left">
                    <BookOpen className="w-3 h-3 shrink-0" /> {a}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
