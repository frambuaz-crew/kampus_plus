import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex = 0, onClose }) => {
    const [index, setIndex] = useState(initialIndex);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [index, onClose, images.length]);

    const next = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIndex((prev) => (prev + 1) % images.length);
    };

    const prev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
            <button
                className="absolute right-6 top-6 text-white/70 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
                <X size={32} />
            </button>

            {images.length > 1 && (
                <button
                    className="absolute left-6 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 p-4 rounded-full transition-all"
                    onClick={prev}
                >
                    <ChevronLeft size={36} />
                </button>
            )}

            <img
                src={images[index].startsWith('http') ? images[index] : `http://localhost:8000${images[index]}`}
                alt="Galeri görseli"
                className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-all select-none"
                onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
                <button
                    className="absolute right-6 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 p-4 rounded-full transition-all"
                    onClick={next}
                >
                    <ChevronRight size={36} />
                </button>
            )}

            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all cursor-pointer ${i === index ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                            onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
