# KAMPÜS+ Frontend

KAMPÜS+ platformunun frontend uygulaması. React + TypeScript + Vite ile geliştirilmiştir.

## 🎯 Proje Hakkında

KAMPÜS+ öğrenciler için AI destekli öğrenme platformudur. Platform içi forum, pazar, kariyer ilanları ve AI asistan özellikleri sunar.

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 20+
- npm veya yarn

### Kurulum

1. Dependencies yükle:
```bash
npm install
```

2. Environment variables ayarla:
```bash
cp .env.example .env
# .env dosyasını düzenle (VITE_API_URL)
```

3. Development server'ı başlat:
```bash
npm run dev
```

4. Tarayıcıda aç:
```
http://localhost:5173
```

## 📦 Build

Production build:
```bash
npm run build
```

Build çıktısı `dist/` klasöründe olacak.

## 🧪 Test

MVP için test scriptleri devre dışı. İleride aktif edilecek.

## 🛠️ Teknolojiler

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client

## 📁 Proje Yapısı

```
frontend/
├── src/
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── contexts/      # React Context
│   ├── api/           # API client
│   └── types/         # TypeScript types
├── public/            # Static assets
└── dist/              # Build output
```

## 🔧 Configuration

- `vite.config.ts` - Vite configuration
- `tailwind.config.cjs` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration

## 🐳 Docker

Production build için Docker kullanılabilir:

```bash
docker build -t kampus-frontend .
docker run -p 3000:3000 kampus-frontend
```

## 📝 Notlar

- Environment variables `VITE_` prefix'i ile başlamalı
- API URL `VITE_API_URL` environment variable'ından alınır
- React Router için tüm route'lar `index.html`'e yönlendirilir (nginx.conf)

---

**KAMPÜS+ Platform** - AI-Powered Learning Platform

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
