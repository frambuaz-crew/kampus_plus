/**
 * Terms of Service Page
 * 
 * Spec: 018-terms-of-service/spec.md
 * 
 * Kullanım şartları sayfası
 */

import React from 'react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="mb-8">
            <Link
              to="/register"
              className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
            >
              ← Kayıt sayfasına dön
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Kullanım Şartları
          </h1>

          <div className="prose max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Genel Hükümler</h2>
              <p>
                KAMPÜS+ platformunu kullanarak, aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız.
                Bu şartlar platformun kullanımına ilişkin tüm kuralları içermektedir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Kullanıcı Sorumlulukları</h2>
              <p>
                Kullanıcılar platformu yasalara uygun şekilde kullanmakla yükümlüdür.
                Uygunsuz içerik paylaşımı, spam veya zararlı faaliyetler yasaktır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Gizlilik</h2>
              <p>
                Kullanıcı verileri gizlilik politikamıza uygun şekilde işlenir ve korunur.
                Detaylı bilgi için gizlilik politikamızı inceleyebilirsiniz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. İçerik Hakları</h2>
              <p>
                Platform üzerinde paylaştığınız içeriklerin sorumluluğu size aittir.
                Telif hakkı ihlali yapılmamalıdır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Değişiklikler</h2>
              <p>
                Bu kullanım şartları zaman zaman güncellenebilir.
                Önemli değişiklikler kullanıcılara bildirilir.
              </p>
            </section>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Son güncelleme: 2025-01-01
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

