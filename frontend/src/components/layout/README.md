# Layout Components

This folder contains reusable layout components that are shared across multiple pages.

## Header Component

Professional header with notifications, messages, dark mode toggle, and profile dropdown.

### Features:
- ✅ Logo (clickable, navigates to dashboard)
- ✅ Dark mode toggle (UI ready, functionality pending)
- ✅ Notifications dropdown with badge count
- ✅ Messages dropdown with unread count
- ✅ Profile dropdown with user menu

### Usage:

```tsx
import { Header } from '../components/layout/Header';

export const YourPage: React.FC = () => {
  return (
    <div>
      <Header />
      <main>
        {/* Your page content */}
      </main>
    </div>
  );
};
```

### Props:
None - Header uses `useAuth()` hook for user data

### Styling:
- Height: 64px (16 with padding)
- Sticky positioning (stays at top on scroll)
- White background with bottom border
- Responsive (desktop optimized)

### TODO:
- [ ] Dark mode functionality (toggle works, theme not implemented)
- [ ] Real API integration for notifications
- [ ] Real API integration for messages
- [ ] Mobile responsive menu

