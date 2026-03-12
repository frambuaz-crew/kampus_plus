import React, { useEffect } from 'react';
import type { ContentCardData } from './ContentCard';

type Props = {
  open: boolean;
  card: ContentCardData | null;
  onClose: () => void;
};

const PreviewModal: React.FC<Props> = ({ open, card, onClose }) => {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 z-10 overflow-auto max-h-[80vh]">
        <div className="flex items-start gap-4">
          <img src={card.thumbnail} alt={card.title} className="w-48 h-32 object-cover rounded" />
          <div>
            <h3 className="text-xl font-bold">{card.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{card.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              <strong>Bu İçerikte Neler Var?</strong>
              <ul className="list-disc ml-5 mt-2 text-gray-600">
                <li>Özet ve temel kavramlar</li>
                <li>Örnekler ve uygulamalar</li>
                <li>İleri okuma kaynakları</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100">Kapat</button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

