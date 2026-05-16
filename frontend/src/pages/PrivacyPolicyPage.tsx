import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Eye, Database, UserCheck, Bell } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-700 selection:bg-sky-100 selection:text-sky-900">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        {/* Navigation */}
        <div className="mb-10 animate-fade-in">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-sky-600 font-bold text-sm transition-all group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Geri Dön
          </button>
        </div>

        {/* Header */}
        <div className="mb-12 animate-slide-up">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-sky-200">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight font-heading">
            Gizlilik <span className="text-sky-600">Politikası</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl font-medium">
            Verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu şeffaf bir şekilde açıklıyoruz.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 md:p-12 border border-slate-100 animate-slide-up delay-100">
          <div className="space-y-12">
            
            <section className="group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                  <Database className="w-5 h-5 text-sky-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">1. Toplanan Veriler</h2>
              </div>
              <p className="leading-relaxed text-slate-600 ml-14">
                Kayıt sırasında verdiğiniz ad, soyad, üniversite e-postası, üniversite ve bölüm bilgilerini topluyoruz. 
                Ayrıca platformu kullanımınız sırasında oluşturduğunuz içerikler (notlar, forum mesajları vb.) ve teknik loglar sistemimizde saklanır.
              </p>
            </section>

            <section className="group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                  <Eye className="w-5 h-5 text-sky-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">2. Verilerin Kullanımı</h2>
              </div>
              <ul className="space-y-3 text-slate-600 ml-14 list-disc marker:text-sky-500">
                <li>Hesap doğrulama ve güvenliğini sağlamak.</li>
                <li>Size özel akademik içerikler ve bildirimler sunmak.</li>
                <li>Platformun performansını analiz etmek ve özelliklerini geliştirmek.</li>
                <li>Üniversite topluluğu içinde etkileşimi kolaylaştırmak.</li>
              </ul>
            </section>

            <section className="group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                  <UserCheck className="w-5 h-5 text-sky-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">3. Veri Paylaşımı</h2>
              </div>
              <p className="leading-relaxed text-slate-600 ml-14">
                Kişisel verileriniz, yasal zorunluluklar haricinde asla üçüncü şahıslarla ticari amaçlarla paylaşılmaz. 
                Sadece platformun işlevselliği için gerekli olan anonimleştirilmiş veriler analiz araçlarıyla paylaşılabilir.
              </p>
            </section>

            <section className="group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                  <Bell className="w-5 h-5 text-sky-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">4. Haklarınız</h2>
              </div>
              <p className="leading-relaxed text-slate-600 ml-14">
                Dilediğiniz zaman verilerinize erişebilir, güncelleyebilir veya hesabınızın silinmesini talep edebilirsiniz. 
                Bu haklarınızı kullanmak için ayarlar sayfasını ziyaret edebilir veya destek birimimize ulaşabilirsiniz.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-sm text-slate-400 font-medium">Son Güncelleme</p>
              <p className="text-slate-900 font-bold">16 Mayıs 2026</p>
            </div>
            <Link 
              to="/register"
              className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-sky-100"
            >
              Anladım, Devam Et
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
