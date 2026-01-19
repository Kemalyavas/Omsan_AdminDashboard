import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Siparişler', href: '/orders', icon: FileText },
  { name: 'Müşteriler', href: '/customers', icon: Users },
  { name: 'Ayarlar', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow bg-slate-900 pt-5 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <Package className="h-8 w-8 text-blue-500" />
          <span className="ml-3 text-xl font-bold text-white">OMSAN</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            <p>OMSAN MERMER SAN. TİC. LTD. ŞTİ.</p>
            <p className="mt-1">Sipariş Yönetim Sistemi v1.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
