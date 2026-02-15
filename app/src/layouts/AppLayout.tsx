import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import FloatingChat from '../components/FloatingChat'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">
        <main className="flex-1 p-6 lg:p-8 max-w-[1200px] overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <FloatingChat />
    </div>
  )
}
