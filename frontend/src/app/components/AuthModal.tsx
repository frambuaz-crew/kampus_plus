import React, { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
};

const AuthModal: React.FC<Props> = ({ open, onClose, onRegister, onLogin }) => {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10">
        <h2 className="text-xl font-bold">İçeriğe Tam Erişim</h2>
        <p className="mt-2 text-sm text-gray-600">İçeriklere tam erişim için lütfen kayıt olun veya giriş yapın.</p>

        <ul className="mt-4 space-y-2">
          <li className="p-3 bg-gray-50 rounded">7/24 Yapay Zeka Asistanı</li>
          <li className="p-3 bg-gray-50 rounded">Sınırsız İçerik Erişimi</li>
          <li className="p-3 bg-gray-50 rounded">Topluluk Erişimi</li>
        </ul>

        <div className="mt-6 flex gap-3">
          <button onClick={onRegister} className="flex-1 px-4 py-2 rounded-md font-semibold text-white" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>Hemen Kayıt Ol</button>
          <button onClick={onLogin} className="flex-1 px-4 py-2 rounded-md font-medium border border-indigo-200">Zaten Hesabım Var - Giriş Yap</button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

