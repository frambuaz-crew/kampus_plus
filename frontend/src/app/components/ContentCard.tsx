import React from 'react';

export interface ContentCardData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  author: string;
  date: string;
  tag: string;
  isLocked: boolean;
  university?: string;
  isEvent?: boolean;
}

type Props = {
  card: ContentCardData;
  onPreview: () => void;
  onLockedClick: () => void;
};

const ContentCard: React.FC<Props> = ({ card, onPreview, onLockedClick }) => {
  const locked = card.isLocked && !card.isEvent;

  return (
    <article className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-transform transform hover:-translate-y-1">
      <div className="relative">
        <img src={card.thumbnail} alt={card.title} className={`w-full h-40 object-cover ${locked ? 'filter blur-sm' : ''}`} />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow text-indigo-600 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11zM5 20v-6a7 7 0 0114 0v6" /></svg>
              </div>
              <button onClick={onLockedClick} className="mt-2 px-4 py-2 rounded-md font-semibold" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', color: '#fff' }}>
                İçeriği Görüntüle
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{card.tag}</span>
            {card.university && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{card.university}</span>}
          </div>
          <span className="text-xs text-gray-500">{card.date}</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold line-clamp-2">{card.title}</h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{card.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">{card.author}</div>
          {!locked ? (
            <button onClick={onPreview} className="text-sm font-medium text-indigo-600">Önizlemeyi Gör</button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default ContentCard;

