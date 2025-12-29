# Layout Components

This folder contains reusable layout components that are shared across multiple pages.

---

## MainLayout Component

Complete layout wrapper with Header + Sidebar + Main Content area.

### Features:
- ✅ Fixed header at top
- ✅ Sidebar navigation (left, 256px width)
- ✅ Flexible main content area
- ✅ Consistent across all authenticated pages

### Usage:

```tsx
import { MainLayout } from '../components/layout/MainLayout';

export const YourPage: React.FC = () => {
  return (
    <MainLayout>
      {/* Your page content */}
      <div className="p-8">
        <h1>Your Content Here</h1>
      </div>
    </MainLayout>
  );
};
```

### Props:
- `children`: React.ReactNode - Page content to render in main area

---

## Header Component

Professional header with notifications, messages, dark mode toggle, and profile dropdown.

### Features:
- ✅ Logo (clickable, navigates to dashboard)
- ✅ Dark mode toggle (UI ready, functionality pending)
- ✅ Notifications dropdown with badge count
- ✅ Messages dropdown with unread count
- ✅ Profile dropdown with user menu

### Styling:
- Height: 64px (h-16)
- Sticky positioning (stays at top on scroll)
- White background with bottom border
- Responsive spacing (px-8 xl:px-16)

---

## Sidebar Component

Professional navigation sidebar with sections and active states.

### Features:
- ✅ Icon + text navigation items
- ✅ Active state indicator (blue background + left border)
- ✅ Organized sections (MAIN, OTHER)
- ✅ Hover effects
- ✅ Badge support for notifications
- ✅ Help & Support at bottom

### Navigation Structure:
```
🏠 Dashboard
─────────────
MAIN
🤖 AI Assistant
📚 My Courses
📄 Documents
💬 Forum
─────────────
OTHER
📊 Statistics
⚙️ Settings
─────────────
❓ Help & Support
```

### Styling:
- Width: 256px (w-64)
- White background
- Right border
- Section titles: uppercase, small, gray

### Active State:
- Blue background (bg-indigo-50)
- Blue text (text-indigo-700)
- Left border (border-l-4 border-indigo-600)
- Subtle shadow

---

## TODO:
- [ ] Dark mode functionality
- [ ] Real API integration for notifications/messages
- [ ] Mobile responsive menu (hamburger)
- [ ] Sidebar collapse functionality
- [ ] Breadcrumbs
- [ ] Page transitions

