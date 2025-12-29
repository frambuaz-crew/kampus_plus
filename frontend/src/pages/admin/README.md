# Admin Panel

Separate administrative interface for platform management.

---

## 🔐 **Access**

Admin panel is completely separate from student portal:

```
Student Portal:  /login         → /dashboard
Admin Panel:     /admin/login   → /admin/dashboard
```

---

## 🎨 **Design Philosophy**

- **Dark Theme**: Distinct from student portal (dark gray/black)
- **Red Accent**: Admin-specific color scheme (vs indigo/purple for students)
- **Separate Auth**: Different login flow for security
- **No Sidebar**: Different layout structure

---

## 📁 **Structure**

```
frontend/src/pages/admin/
├── AdminLogin.tsx       (Separate login page)
├── AdminDashboard.tsx   (Main admin panel)
└── README.md            (This file)

TODO (Future):
├── UserManagement.tsx
├── ContentModeration.tsx
├── SystemLogs.tsx
├── Analytics.tsx
├── DocumentManagement.tsx
└── Settings.tsx
```

---

## 🔒 **Security**

### Authentication:
1. Admin users have `role: "admin"` in database
2. Separate login page (`/admin/login`)
3. Role check on backend
4. Frontend also checks `user.role === 'admin'`

### Access Control:
- Student users **cannot** access `/admin/*` routes
- Admin login page checks role after authentication
- Admin dashboard redirects non-admins to `/login`

---

## 🚀 **Features**

### Current:
- ✅ Separate admin login (dark theme)
- ✅ Admin dashboard with cards
- ✅ Quick stats overview
- ✅ TODO notice (under construction)

### Planned:
- [ ] User management (view, edit, suspend)
- [ ] Forum moderation (review flagged posts)
- [ ] System logs and audit trail
- [ ] Platform analytics and statistics
- [ ] Document storage management
- [ ] System settings and configuration

---

## 💡 **Usage**

### For Admins:
1. Navigate to `/admin/login`
2. Login with admin credentials
3. Access admin dashboard
4. Manage platform

### For Development:
```typescript
// Check if user is admin
if (user?.role === 'admin') {
  // Admin-only functionality
}
```

---

## 🎯 **Future Enhancements**

1. **Separate Subdomain**: `admin.kampusplus.com`
2. **2FA**: Two-factor authentication
3. **Audit Logs**: Track all admin actions
4. **Role Permissions**: Different admin levels
5. **API Rate Limiting**: Admin-specific limits
6. **Activity Monitoring**: Real-time dashboard

---

## 🔧 **Tech Stack**

- React + TypeScript
- Tailwind CSS (dark theme)
- Same auth system (different role)
- Separate layout (no sidebar)

---

## ⚠️ **Important Notes**

- Admin panel is **under construction** 🚧
- Placeholder pages will be added incrementally
- Backend API endpoints needed for admin features
- Security audit required before production
- All admin actions should be logged

---

**Status**: 🚧 Under Development

