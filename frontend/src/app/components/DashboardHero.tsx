import React from 'react';

type Props = {
  onRegister: () => void;
};

const DashboardHero: React.FC<Props> = ({ onRegister }) => {
  return (
    <div className="rounded-lg overflow-hidden relative pt-16">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-lg p-8 md:p-12 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold">KAMPÜS+ ile Öğrenme Deneyiminizi Dönüştürün</h1>
          <p className="mt-4 text-lg md:text-xl text-white/90">7/24 aktif yapay zeka asistanı ile tüm sorularınıza hızlı cevap</p>
          <div className="mt-6">
            <button onClick={onRegister} className="inline-flex items-center px-6 py-3 rounded-md font-semibold shadow-lg" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', color: '#fff' }}>
              Hemen Kayıt Ol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHero;

