import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Refrigerator, Calendar } from 'lucide-react';

export type BottomNavTab = 'recipes' | 'fridge' | 'planner';

interface BottomNavProps {
  visible?: boolean;
}

const tabs: Array<{
  id: BottomNavTab;
  label: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ariaLabel: string;
}> = [
  {
    id: 'recipes',
    label: 'Entdecker',
    path: '/',
    icon: BookOpen,
    ariaLabel: 'Rezept-Entdecker',
  },
  {
    id: 'fridge',
    label: 'Vorratskammer & KI',
    path: '/fridge',
    icon: Refrigerator,
    ariaLabel: 'Vorratskammer & KI',
  },
  {
    id: 'planner',
    label: 'Wochenplaner',
    path: '/planner',
    icon: Calendar,
    ariaLabel: 'Wochenplaner',
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ visible = true }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (pathname: string): BottomNavTab => {
    if (pathname.startsWith('/fridge')) return 'fridge';
    if (pathname.startsWith('/planner')) return 'planner';
    if (pathname === '/' || pathname.startsWith('/recipes/') || pathname === '/favorites') return 'recipes';
    return 'recipes';
  };

  const activeTab = getActiveTab(location.pathname);

  if (!visible) return null;

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#E3DFD5]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-4 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (location.pathname !== tab.path) {
                    navigate(tab.path);
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.ariaLabel}
                className="flex w-full min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition-all active:scale-95"
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? 'text-[#4A7856]' : 'text-[#686E6A]'}`}
                  aria-hidden="true"
                />
                <span className={`${isActive ? 'text-[#4A7856]' : 'text-[#686E6A]'}`}>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
