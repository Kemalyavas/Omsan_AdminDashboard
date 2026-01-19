import { useNavigate } from 'react-router-dom'
import { LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-800">
              Sipariş Yönetim Paneli
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{user?.email || 'Admin'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 md:px-3">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
