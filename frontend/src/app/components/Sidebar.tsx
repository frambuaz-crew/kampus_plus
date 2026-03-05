import React from 'react';

type Props = {
  open: boolean;
  onRequestAuth: () => void;
};

const Sidebar: React.FC<Props> = ({ open, onRequestAuth }) => {
  const groups = [
    {
      items: [
        { key: 'home', label: 'Ana Sayfa', icon: '🏠' },
        { key: 'ai', label: 'AI Asistanım', icon: '🤖' },
        { key: 'forum', label: 'Forum', icon: '💬' },
        { key: 'market', label: 'Pazar', icon: '🛒' },
        { key: 'career', label: 'Kariyer', icon: '💼' },
      ],
    },
    {
      title: 'AKADEMİK',
      items: [
        { key: 'schedule', label: 'Ders Programım', icon: '📅' },
        { key: 'calendar', label: 'Akademik Takvim', icon: '🗓️' },
      ],
    },
  ];

  return (
    <aside className={`w-64 bg-white border-r border-gray-100 min-h-screen pt-16 ${open ? 'block' : 'hidden'} lg:block`}>
      <nav className="px-4 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <div className="mt-4 mb-2 text-xs text-gray-400 pl-2">— {g.title} —</div>}
            {g.items.map((it) => (
              <button
                key={it.key}
                onClick={onRequestAuth}
                className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50"
              >
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">{it.icon}</span>
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

