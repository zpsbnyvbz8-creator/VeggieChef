import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Refrigerator, Calendar } from 'lucide-react';
import { useScrollDirection } from '../../utils/hooks/useScrollDirection';

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
    label: 'Vorrat & KI',
    path: '/fridge',
    icon: Refrigerator,
    ariaLabel: 'Vorratskammer & KI',
  },
  {
    id: 'planner',
    label: 'Planer',
    path: '/planner',
    icon: Calendar,
    ariaLabel: 'Wochenplaner',
  },
];

/**
 * Schwebende, abgerundete Pill-Hauptnavigation (nur Mobile < md).
 * Fährt beim Runterscrollen nach unten weg, beim Hochscrollen wieder ein
 * (gleiche Logik wie der Header). Respektiert env(safe-area-inset-bottom).
 */
export const BottomNav: React.FC<BottomNavProps> = ({ visible = true }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const direction = useScrollDirection({ threshold: 8 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (direction === 'down') {
      setIsVisible(false);
    } else if (direction === 'up') {
      setIsVisible(true);
    }
  }, [direction]);

  const getActiveTab = (pathname: string): BottomNavTab => {
    if (pathname.startsWith('/fridge')) return 'fridge';
    if (pathname.startsWith('/planner')) return 'planner';
    return 'recipes';
  };

  const activeTab = getActiveTab(location.pathname);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 md:hidden flex justify-center px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.875rem)] transition-transform duration-300 ease-out will-change-transform ${
        isVisible ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]'
      }`}
    >
      <nav
        aria-label="Hauptnavigation"
        className="flex items-center rounded-full bg-card/95 backdrop-blur-md border border-[#E3DFD5] shadow-lg shadow-black/10 px-1.5 py-1.5"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (location.pathname !== tab.path) {
                  navigate(tab.path);
                }
              }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.ariaLabel}
              title={tab.ariaLabel}
              className={`flex items-center gap-2 min-h-[48px] min-w-[44px] rounded-full px-4 py-2 text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer touch-manipulation active:scale-95 ${
                isActive
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-text-muted hover:bg-accent-tint hover:text-text-main'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? 'text-on-accent' : 'text-text-muted'}`}
                aria-hidden="true"
              />
              <span className="hidden min-[370px]:inline truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;