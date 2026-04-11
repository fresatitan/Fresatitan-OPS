import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="noise-bg min-h-screen bg-surface-1">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-[220px] pb-16 lg:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
