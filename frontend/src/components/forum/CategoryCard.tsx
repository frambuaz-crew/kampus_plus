import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import type { Category } from '../../types/forum';

interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <div 
      onClick={() => onClick(category)}
      className="group relative bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {/* İkon Kutusu - Aydınlık Stil */}
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl text-2xl group-hover:scale-110 transition-transform text-indigo-600">
            {category.icon || '💬'}
          </div>
          
          <div>
            {/* Kategori Adı - Koyu Metin */}
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                {category.description}
              </p>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-500">
          <ArrowRight size={20} />
        </div>
      </div>

      {/* İstatistikler Paneli - Gri Tonlar */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center text-gray-600 text-xs font-medium">
          <Layers size={14} className="mr-2 text-indigo-500" />
          <span className="font-bold text-gray-900 mr-1">{category.topic_count || 0}</span> konu
        </div>
      </div>

      {/* Hover Alt Çizgi - Indigo Vurgu */}
      <div className="absolute bottom-0 left-0 w-0 h-1 bg-indigo-600 rounded-b-2xl group-hover:w-full transition-all duration-500"></div>
    </div>
  );
};