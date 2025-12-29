# Task Breakdown: 003-frontend-ui

**Generated:** 2025-12-29
**Status:** Planning
**Total Tasks:** 78

## Phase 0: Project Setup (T001-T020)

### T001: Initialize Vite + React + TypeScript Project
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** None
- **Acceptance Criteria:**
  1. Vite project created with React + TypeScript template
  2. TypeScript strict mode enabled in tsconfig.json
  3. Dev server runs on localhost:5173
  4. Hot Module Replacement (HMR) works
  5. Build command generates optimized production bundle
- **Testing:** Verify build output size <1MB
- **Review Checklist:**
  - [ ] TypeScript config follows best practices
  - [ ] Package.json scripts documented
  - [ ] .gitignore includes node_modules and dist

### T002: Configure Tailwind CSS, ESLint, Prettier, Husky
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Tailwind CSS installed and configured with content paths
  2. ESLint configured with Airbnb/TypeScript rules
  3. Prettier configured and integrated with ESLint
  4. Husky pre-commit hooks setup for linting and formatting
  5. VS Code settings configured for auto-fix on save
- **Testing:** Run `npm run lint` and `npm run format` successfully
- **Review Checklist:**
  - [ ] Tailwind intellisense working
  - [ ] Pre-commit hook blocks bad code
  - [ ] Consistent code style enforced

### T003: Setup Testing Infrastructure
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Vitest installed and configured
  2. React Testing Library setup with custom render
  3. Playwright installed for E2E testing
  4. MSW (Mock Service Worker) setup for API mocking
  5. Test coverage reporting configured
- **Testing:** Run sample unit and E2E tests
- **Review Checklist:**
  - [ ] Test scripts added to package.json
  - [ ] MSW handlers structure defined
  - [ ] CI environment variables configured

### T004: Create CI/CD Pipeline
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T003
- **Acceptance Criteria:**
  1. GitHub Actions workflow created for PRs
  2. Linting, Type Checking, and Unit Tests run on push
  3. Build verification step included
  4. E2E tests run on merge to develop
- **Testing:** Trigger workflow with a dummy PR
- **Review Checklist:**
  - [ ] Workflow file in .github/workflows
  - [ ] Caching enabled for npm modules
  - [ ] Failure notifications configured

### T005: Setup Storybook
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T002
- **Acceptance Criteria:**
  1. Storybook 7+ initialized
  2. Tailwind CSS integrated with Storybook
  3. Essential addons (Controls, Actions, Viewport) enabled
  4. Dark mode support configured
- **Testing:** Launch Storybook and view example component
- **Review Checklist:**
  - [ ] Storybook builds successfully
  - [ ] Component hierarchy organized

### T006: Configure Environment & API Layer
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Axios instance created with interceptors
  2. Environment variables defined (.env.example)
  3. API base URL configured
  4. Type-safe API response wrappers created
- **Testing:** Mock API call returns expected data
- **Review Checklist:**
  - [ ] No secrets in source code
  - [ ] Error handling interceptor in place

## Phase 1: Design System & Core Components (T021-T050)

### T021: Build Atomic Design System (Atoms)
- **Complexity:** Medium
- **Time:** 4 hours
- **Dependencies:** T002, T005
- **Acceptance Criteria:**
  1. Button component (variants: primary, secondary, ghost, danger)
  2. Input/Textarea components with error states
  3. Card, Badge, Avatar, Spinner components created
  4. All components accessible (keyboard nav, ARIA)
- **Testing:** Storybook stories for all variants
- **Review Checklist:**
  - [ ] Props interfaces defined
  - [ ] ForwardRef implemented where needed

### T022: Create Common Hooks
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. `useAuth` for user context
  2. `useDebounce` for search inputs
  3. `useMediaQuery` for responsive logic
  4. `useLocalStorage` for persisted state
- **Testing:** Unit tests for each hook
- **Review Checklist:**
  - [ ] Hooks follow rules of hooks
  - [ ] Proper cleanup in useEffect

### T023: Setup Routing & Layout
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. React Router v6 setup with Outlet
  2. MainLayout (Sidebar + Header + Content) created
  3. AuthLayout (Centered card) created
  4. 404 Not Found page implemented
- **Testing:** Navigate between dummy routes
- **Review Checklist:**
  - [ ] Responsive sidebar (collapsible)
  - [ ] Active link states working

### T024: Implement Theme System
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T002
- **Acceptance Criteria:**
  1. Zustand store for theme state (light/dark/system)
  2. Tailwind dark mode class strategy applied
  3. Theme toggle component created
  4. Persist preference to local storage
- **Testing:** Toggle theme and verify class change on html tag
- **Review Checklist:**
  - [ ] No flash of wrong theme on load
  - [ ] System preference respected

### T025: Build Error Boundary & Loading States
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. Global ErrorBoundary component created
  2. Fallback UI for uncaught errors
  3. Suspense loading skeletons for page transitions
  4. Network error toast notifications
- **Testing:** Trigger error and verify fallback UI
- **Review Checklist:**
  - [ ] Error logged to console/service
  - [ ] User can recover/retry

### T026: Write Storybook Stories
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. Stories for all atoms and molecules
  2. Interactive controls for props
  3. Documentation docs for usage
- **Testing:** Visual regression check (manual)
- **Review Checklist:**
  - [ ] All variants covered
  - [ ] Accessibility addon passes

## Phase 2: Authentication Module (T051-T080)

### T051: Create Auth Service
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T006
- **Acceptance Criteria:**
  1. Login, Register, Logout, RefreshToken API methods
  2. Axios interceptors for attaching JWT
  3. 401 handling (auto-logout/refresh)
- **Testing:** Unit tests with MSW mocking
- **Review Checklist:**
  - [ ] Tokens stored securely (httpOnly cookies handled by browser)
  - [ ] Type definitions for Auth responses

### T052: Build Login Page
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T021, T051
- **Acceptance Criteria:**
  1. Login form with Email/Password
  2. Zod schema validation
  3. React Hook Form integration
  4. Error handling and loading states
- **Testing:** Component test: submit valid/invalid form
- **Review Checklist:**
  - [ ] Accessibility (labels, error messages)
  - [ ] Enter key submits form

### T053: Build Register Page
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T052
- **Acceptance Criteria:**
  1. Registration form with extra fields (Name)
  2. Password strength indicator
  3. Validation for matching passwords
  4. Success redirect to login
- **Testing:** Component test: validation logic
- **Review Checklist:**
  - [ ] Password requirements clear
  - [ ] Terms of service checkbox

### T054: Implement Forgot Password
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T051
- **Acceptance Criteria:**
  1. Request reset link form
  2. Reset password form (from email link)
  3. API integration for both steps
- **Testing:** Mock API success/failure
- **Review Checklist:**
  - [ ] Clear user feedback
  - [ ] Token handling from URL

### T055: Create ProtectedRoute
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T023, T051
- **Acceptance Criteria:**
  1. Wrapper component checking auth state
  2. Redirect to login if unauthenticated
  3. Remember intended URL for post-login redirect
- **Testing:** Try accessing protected route without auth
- **Review Checklist:**
  - [ ] Loading state while checking auth
  - [ ] No flash of protected content

### T056: Setup Auth State Management
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T051
- **Acceptance Criteria:**
  1. Zustand store for User object and isAuthenticated
  2. Hydrate state on app load (check /me endpoint)
  3. Login/Logout actions updating store
- **Testing:** Verify store updates on login
- **Review Checklist:**
  - [ ] Sensitive data not stored in local storage
  - [ ] State sync across tabs (optional)

### T057: Implement Token Refresh
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T051
- **Acceptance Criteria:**
  1. Silent refresh logic in Axios interceptor
  2. Queue failed requests while refreshing
  3. Retry original requests after refresh
  4. Logout on refresh failure
- **Testing:** Simulate token expiry and verify refresh flow
- **Review Checklist:**
  - [ ] No infinite loops
  - [ ] Concurrency handled (multiple requests)

### T058: E2E Tests for Auth
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T052, T053
- **Acceptance Criteria:**
  1. Playwright test for Login flow
  2. Playwright test for Registration flow
  3. Playwright test for Protected Route redirection
- **Testing:** Run `npm run test:e2e`
- **Review Checklist:**
  - [ ] Tests pass consistently
  - [ ] Test data cleaned up

## Phase 3: AI Chat Interface (T081-T130)

### T081: Design Chat Layout
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T023
- **Acceptance Criteria:**
  1. Sidebar for conversation history
  2. Main chat area with message list
  3. Input area fixed at bottom
  4. Responsive design (sidebar drawer on mobile)
- **Testing:** Visual check on mobile/desktop
- **Review Checklist:**
  - [ ] Flexbox/Grid usage correct
  - [ ] Scroll behavior (messages scroll, input fixed)

### T082: Implement Chat History List
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T081
- **Acceptance Criteria:**
  1. Fetch conversations from API
  2. Virtualized list for performance
  3. Group by date (Today, Yesterday, etc.)
  4. Active state styling
- **Testing:** Render list with 100 items
- **Review Checklist:**
  - [ ] Infinite scroll or pagination
  - [ ] Empty state handled

### T083: Build Message Components
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T081
- **Acceptance Criteria:**
  1. UserMessage bubble component
  2. AssistantMessage bubble component
  3. Markdown rendering support
  4. Copy to clipboard button
- **Testing:** Render markdown content correctly
- **Review Checklist:**
  - [ ] XSS protection (sanitize HTML)
  - [ ] Code block styling

### T084: Integrate Streaming API
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T083
- **Acceptance Criteria:**
  1. SSE (Server-Sent Events) connection setup
  2. Real-time message appending
  3. Typing indicator handling
  4. Error handling during stream
- **Testing:** Mock SSE stream and verify updates
- **Review Checklist:**
  - [ ] Connection closed properly
  - [ ] Reconnection logic

### T085: Add File Attachment Support
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T081
- **Acceptance Criteria:**
  1. Drag & drop zone in input area
  2. File selection dialog
  3. Upload progress indicator
  4. File type/size validation
- **Testing:** Upload file and verify API call
- **Review Checklist:**
  - [ ] Visual feedback on drag over
  - [ ] Cancel upload option

### T086: Implement Code Syntax Highlighting
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T083
- **Acceptance Criteria:**
  1. Prism.js or similar integration
  2. Language detection from markdown
  3. Copy code button
  4. Dark/Light theme support
- **Testing:** Render code block
- **Review Checklist:**
  - [ ] Performance (lazy load languages)
  - [ ] Line numbers (optional)

### T087: Create Chat Actions
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T081
- **Acceptance Criteria:**
  1. Clear conversation button
  2. Delete conversation option
  3. Export chat (JSON/TXT)
  4. Rename conversation
- **Testing:** Perform actions and verify state update
- **Review Checklist:**
  - [ ] Confirmation modals for destructive actions
  - [ ] Optimistic UI updates

### T088: Build Conversation Search
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T082
- **Acceptance Criteria:**
  1. Search input in sidebar
  2. Client-side filtering of loaded chats
  3. Server-side search integration
  4. Highlight search terms
- **Testing:** Search for existing chat
- **Review Checklist:**
  - [ ] Debounce input
  - [ ] No results state

### T089: Add Loading Skeletons
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T081
- **Acceptance Criteria:**
  1. Skeleton loader for chat history
  2. Skeleton loader for messages
  3. Smooth transition to content
- **Testing:** Visual check during load
- **Review Checklist:**
  - [ ] Matches layout dimensions
  - [ ] Animation smooth

### T090: Unit Tests for Chat
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T084
- **Acceptance Criteria:**
  1. Test message parsing logic
  2. Test streaming hook state updates
  3. Test file validation logic
- **Testing:** Run `npm run test`
- **Review Checklist:**
  - [ ] Edge cases covered (empty stream, error)

### T091: E2E Tests for Chat
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T084
- **Acceptance Criteria:**
  1. Full conversation flow test
  2. Streaming response verification
  3. History navigation test
- **Testing:** Run `npm run test:e2e`
- **Review Checklist:**
  - [ ] Flakiness handled (wait for stream end)

## Phase 4: Document Management (T131-T170)

### T131: Build Upload Interface
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. Drag & drop zone for documents
  2. File type validation (PDF, DOCX, TXT)
  3. Size limit validation
  4. Multiple file selection support
- **Testing:** Drag file into zone
- **Review Checklist:**
  - [ ] Accessibility (keyboard selection)
  - [ ] Clear error messages

### T132: Implement Upload Progress
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T131
- **Acceptance Criteria:**
  1. Progress bar for each file
  2. Cancel upload button
  3. Success/Error status indicators
  4. React Query mutation with onUploadProgress
- **Testing:** Upload large file and watch progress
- **Review Checklist:**
  - [ ] Optimistic updates
  - [ ] Retry logic

### T133: Create Document List
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T131
- **Acceptance Criteria:**
  1. Table/Grid view of documents
  2. Sort by name, date, size
  3. Pagination or infinite scroll
  4. File type icons
- **Testing:** Render list with various file types
- **Review Checklist:**
  - [ ] Empty state
  - [ ] Loading skeletons

### T134: Build Document Preview Modal
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T133
- **Acceptance Criteria:**
  1. Modal displaying document content
  2. PDF viewer integration
  3. Text file viewer
  4. Metadata display (author, date)
- **Testing:** Open preview for PDF
- **Review Checklist:**
  - [ ] Mobile responsiveness
  - [ ] Close on escape key

### T135: Add Search Functionality
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T133
- **Acceptance Criteria:**
  1. Client-side filter for current page
  2. Server-side search API integration
  3. Filter by file type
  4. Date range filter
- **Testing:** Search for specific document
- **Review Checklist:**
  - [ ] Debounced input
  - [ ] Clear filters button

### T136: Implement Document Actions
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T133
- **Acceptance Criteria:**
  1. Download document
  2. Delete document (with confirmation)
  3. Rename document
  4. Share link generation
- **Testing:** Delete a document
- **Review Checklist:**
  - [ ] Permissions check (can user delete?)
  - [ ] Toast notifications

### T137: Show Malware/Processing Status
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T133
- **Acceptance Criteria:**
  1. Status badges (Scanning, Safe, Infected)
  2. Disable download if infected
  3. Tooltip explanation for statuses
- **Testing:** Mock infected status
- **Review Checklist:**
  - [ ] Color coding (Red for infected)
  - [ ] Polling for status updates

### T138: Component Tests for Documents
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T131, T133
- **Acceptance Criteria:**
  1. Test upload validation logic
  2. Test list sorting/filtering
  3. Test action permissions
- **Testing:** Run 
pm run test
- **Review Checklist:**
  - [ ] Mock API responses
  - [ ] Test error states

### T139: E2E Test for Upload Flow
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T131
- **Acceptance Criteria:**
  1. Playwright test: Upload file -> Verify in list -> Delete
  2. Verify progress bar appearance
- **Testing:** Run 
pm run test:e2e
- **Review Checklist:**
  - [ ] Test file cleanup
  - [ ] Timeout handling

## Phase 5: Discussion Forum (T171-T210)

### T171: Build Forum Home
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T023
- **Acceptance Criteria:**
  1. List of forum categories
  2. Recent activity summary
  3. Stats (threads, posts count)
  4. Responsive grid layout
- **Testing:** Render categories
- **Review Checklist:**
  - [ ] Loading states
  - [ ] Empty categories handled

### T172: Create Thread List
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T171
- **Acceptance Criteria:**
  1. List threads in a category
  2. Infinite scroll pagination
  3. Sort by recent, top, unanswered
  4. Pinned threads support
- **Testing:** Scroll to load more
- **Review Checklist:**
  - [ ] Scroll position restoration
  - [ ] SEO friendly links

### T173: Build Thread Detail Page
- **Complexity:** Medium
- **Time:** 4 hours
- **Dependencies:** T172
- **Acceptance Criteria:**
  1. Display main post
  2. Nested replies (threaded view)
  3. Author info cards
  4. Breadcrumb navigation
- **Testing:** Render deep nested replies
- **Review Checklist:**
  - [ ] Max nesting depth handling
  - [ ] Permalink support

### T174: Integrate Tiptap Editor
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T173
- **Acceptance Criteria:**
  1. Rich text editor setup
  2. Toolbar (Bold, Italic, Link, Code)
  3. Image upload support
  4. Markdown shortcuts
- **Testing:** Create post with formatting
- **Review Checklist:**
  - [ ] Sanitize output
  - [ ] Mobile toolbar adaptation

### T175: Implement Upvote/Downvote
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T173
- **Acceptance Criteria:**
  1. Vote buttons on posts/replies
  2. Optimistic UI update
  3. Score display
  4. Prevent self-voting if required
- **Testing:** Vote and verify score
- **Review Checklist:**
  - [ ] Animation on vote
  - [ ] Auth check

### T176: Add Tag Filtering & Search
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T172
- **Acceptance Criteria:**
  1. Filter threads by tags
  2. Search bar for forum content
  3. Popular tags cloud
- **Testing:** Filter by 'react' tag
- **Review Checklist:**
  - [ ] URL query params sync
  - [ ] No results state

### T177: Build New Post Form
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T174
- **Acceptance Criteria:**
  1. Title and Category selection
  2. Tiptap editor integration
  3. Tag input with autocomplete
  4. Draft saving (local storage)
- **Testing:** Create new thread
- **Review Checklist:**
  - [ ] Validation (min length)
  - [ ] Prevent double submit

### T178: Create Bookmark/Follow
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T173
- **Acceptance Criteria:**
  1. Bookmark thread button
  2. Follow user button
  3. List of bookmarked threads in profile
- **Testing:** Bookmark and check profile
- **Review Checklist:**
  - [ ] Toggle state persistence
  - [ ] Toast notification

### T179: Component Tests for Forum
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T171
- **Acceptance Criteria:**
  1. Test editor output
  2. Test nesting logic
  3. Test voting interaction
- **Testing:** Run 
pm run test
- **Review Checklist:**
  - [ ] Mock complex thread data

### T180: E2E Test for Forum
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T177
- **Acceptance Criteria:**
  1. Playwright test: Create Thread -> Reply -> Upvote
- **Testing:** Run 
pm run test:e2e
- **Review Checklist:**
  - [ ] Verify data persistence

## Phase 6: Profile & Settings (T211-T240)

### T211: Build Profile Page
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T023
- **Acceptance Criteria:**
  1. User info display (Name, Bio, Role)
  2. Editable fields with validation
  3. Read-only mode for other users
- **Testing:** Edit bio and save
- **Review Checklist:**
  - [ ] Layout responsive
  - [ ] Loading state

### T212: Implement Avatar Upload
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T211
- **Acceptance Criteria:**
  1. Image upload with crop tool (react-easy-crop)
  2. Preview before save
  3. Upload to object storage
- **Testing:** Upload and crop image
- **Review Checklist:**
  - [ ] File size limit
  - [ ] Fallback avatar

### T213: Create Password Change Form
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T211
- **Acceptance Criteria:**
  1. Current password verification
  2. New password validation
  3. Confirm new password
- **Testing:** Change password flow
- **Review Checklist:**
  - [ ] Security (mask input)
  - [ ] Clear success message

### T214: Build Settings Page
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T211
- **Acceptance Criteria:**
  1. Notification preferences (Email/Push)
  2. Privacy settings
  3. Account deletion (danger zone)
- **Testing:** Toggle preferences
- **Review Checklist:**
  - [ ] Confirmation for deletion
  - [ ] Auto-save or Save button

### T215: Add Activity History Tab
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T211
- **Acceptance Criteria:**
  1. List of recent posts/comments
  2. List of recent documents
  3. Filter by type
- **Testing:** View activity log
- **Review Checklist:**
  - [ ] Pagination
  - [ ] Date formatting

### T216: Implement Theme/Language Switcher
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T024
- **Acceptance Criteria:**
  1. UI for changing theme (if not in header)
  2. Language selection dropdown
  3. Persist to user profile API
- **Testing:** Change language
- **Review Checklist:**
  - [ ] Immediate UI update
  - [ ] Sync with local storage

### T217: Component Tests for Profile
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T211
- **Acceptance Criteria:**
  1. Test form validation
  2. Test crop functionality (mocked)
- **Testing:** Run 
pm run test
- **Review Checklist:**
  - [ ] Error handling

## Phase 7: Admin Dashboard (T241-T280)

### T241: Create Admin Layout
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T023
- **Acceptance Criteria:**
  1. Admin-specific sidebar
  2. Dashboard overview widgets
  3. Breadcrumbs for admin routes
- **Testing:** Navigate admin pages
- **Review Checklist:**
  - [ ] Distinct visual style (optional)
  - [ ] Mobile support

### T242: Build User Management Table
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T241
- **Acceptance Criteria:**
  1. List all users with search/filter
  2. Edit user role/status
  3. Ban/Unban actions
  4. Bulk actions support
- **Testing:** Ban a user
- **Review Checklist:**
  - [ ] Confirmation dialogs
  - [ ] Pagination

### T243: Implement Content Moderation Queue
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T241
- **Acceptance Criteria:**
  1. List reported content (posts/docs)
  2. Approve/Reject/Delete actions
  3. View context (link to original)
- **Testing:** Moderate an item
- **Review Checklist:**
  - [ ] Reason for rejection input
  - [ ] Undo action

### T244: Create Analytics Dashboard
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T241
- **Acceptance Criteria:**
  1. Recharts integration
  2. User growth chart
  3. Activity heatmap
  4. Date range picker
- **Testing:** Render charts with mock data
- **Review Checklist:**
  - [ ] Performance (heavy data)
  - [ ] Tooltips on hover

### T245: Build System Metrics Visualization
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T244
- **Acceptance Criteria:**
  1. API latency charts
  2. Error rate display
  3. Storage usage gauge
- **Testing:** Visualize metrics
- **Review Checklist:**
  - [ ] Real-time updates (optional)
  - [ ] Color coding for thresholds

### T246: Add Audit Log Viewer
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T241
- **Acceptance Criteria:**
  1. Table of system actions
  2. Filter by user, action type, date
  3. JSON detail view
- **Testing:** Filter logs
- **Review Checklist:**
  - [ ] Monospace font for details
  - [ ] Copy ID buttons

### T247: Implement Admin Route Protection
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T055
- **Acceptance Criteria:**
  1. AdminRoute wrapper component
  2. Check user role == 'admin'
  3. Redirect unauthorized users
- **Testing:** Try accessing as normal user
- **Review Checklist:**
  - [ ] 403 Forbidden page
  - [ ] Security audit

### T248: Integration Tests for Admin
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T241
- **Acceptance Criteria:**
  1. Test user management flow
  2. Test moderation actions
- **Testing:** Run npm run test
- **Review Checklist:**
  - [ ] Mock admin API permissions

### T249: E2E Test for Admin Workflows
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T242, T243
- **Acceptance Criteria:**
  1. Playwright test: Admin login → Ban user → Moderate content
  2. Verify analytics data visualization
  3. Test audit log filtering
- **Testing:** Run npm run test:e2e
- **Review Checklist:**
  - [ ] Admin role seeded in test DB
  - [ ] Test isolation (cleanup)

## Phase 8: Performance Optimization (T281-T310)

### T281: Implement Route-Level Code Splitting
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T023
- **Acceptance Criteria:**
  1. All route components wrapped with React.lazy()
  2. Suspense boundaries with loading fallbacks
  3. Error boundaries for chunk load failures
  4. Verify separate bundles in build output
- **Testing:** Check network tab for lazy-loaded chunks
- **Review Checklist:**
  - [ ] Preload critical routes with <link rel="preload">
  - [ ] Loading states match design
  - [ ] No waterfalls (chunk loads in parallel)

### T282: Lazy Load Heavy Components
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T174, T244
- **Acceptance Criteria:**
  1. Tiptap editor lazy loaded (only on post creation)
  2. Recharts lazy loaded (only on admin dashboard)
  3. PDF viewer lazy loaded (only on document preview)
  4. Dynamic imports with loading states
- **Testing:** Verify chunks load only when needed
- **Review Checklist:**
  - [ ] Bundle size reduction measured
  - [ ] No unnecessary eager loading

### T283: Optimize Images with WebP and Lazy Loading
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. Convert all images to WebP with fallbacks
  2. Implement native lazy loading (loading="lazy")
  3. Add blur placeholders for critical images
  4. Compress images to <100KB each
- **Testing:** Lighthouse image optimization score
- **Review Checklist:**
  - [ ] <picture> element with srcset
  - [ ] Alt text for all images

### T284: Configure React Query Cache Strategies
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T006
- **Acceptance Criteria:**
  1. Set staleTime for static data (5 minutes)
  2. Set cacheTime for frequently accessed data (10 minutes)
  3. Enable refetchOnWindowFocus for critical data
  4. Configure retry logic (3 attempts with exponential backoff)
- **Testing:** Monitor React Query DevTools
- **Review Checklist:**
  - [ ] No unnecessary refetches
  - [ ] Cache invalidation on mutations

### T285: Implement Virtual Scrolling for Large Lists
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T082, T133, T172
- **Acceptance Criteria:**
  1. @tanstack/react-virtual integrated for chat history
  2. Virtual scrolling for document list (>100 items)
  3. Virtual scrolling for forum threads
  4. Smooth scroll restoration
- **Testing:** Render 1000+ items and measure FPS
- **Review Checklist:**
  - [ ] No jank on scroll
  - [ ] Dynamic item heights handled

### T286: Add Service Worker for Offline Support
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Vite PWA plugin configured
  2. Cache static assets (JS, CSS, fonts)
  3. Network-first strategy for API calls
  4. Offline fallback page
- **Testing:** Simulate offline mode in DevTools
- **Review Checklist:**
  - [ ] Service worker registration verified
  - [ ] Update prompt shown on new version

### T287: Run Lighthouse Audits and Fix Critical Issues
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T281, T283
- **Acceptance Criteria:**
  1. Lighthouse Performance ≥90 (mobile & desktop)
  2. Lighthouse Accessibility ≥95
  3. Lighthouse Best Practices ≥95
  4. Lighthouse SEO ≥90
- **Testing:** Run lighthouse CI in GitHub Actions
- **Review Checklist:**
  - [ ] Core Web Vitals pass (LCP, FID, CLS)
  - [ ] No render-blocking resources

### T288: Optimize Bundle Size with Vite Config
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Manual chunk splitting for vendors (React, React Router)
  2. Tree-shaking enabled and verified
  3. CSS purging with Tailwind
  4. Total bundle <500KB gzipped
- **Testing:** Analyze with vite-bundle-visualizer
- **Review Checklist:**
  - [ ] No duplicate dependencies
  - [ ] Vendor chunk cached separately

### T289: Implement Prefetching for Critical Routes
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T281
- **Acceptance Criteria:**
  1. Prefetch chat route on login
  2. Prefetch profile on hover over avatar
  3. Use React Router's prefetch on link hover
  4. Preconnect to API domain
- **Testing:** Check network waterfall
- **Review Checklist:**
  - [ ] No over-prefetching (bandwidth waste)
  - [ ] Priority hints set correctly

### T290: Optimize Font Loading with Variable Fonts
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T002
- **Acceptance Criteria:**
  1. Use Inter variable font (single file)
  2. font-display: swap for FOIT prevention
  3. Preload font file
  4. Subset font to used characters (optional)
- **Testing:** Measure font load time in network tab
- **Review Checklist:**
  - [ ] FOUT avoided with fallback font
  - [ ] Font size <100KB

### T291: Debounce Search Inputs
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T022
- **Acceptance Criteria:**
  1. useDebounce hook applied to all search inputs (500ms delay)
  2. Cancel pending requests on new input
  3. Loading indicator during debounce
- **Testing:** Type rapidly and verify single API call
- **Review Checklist:**
  - [ ] No lag in UI feedback
  - [ ] Clear visual state

### T292: Memoize Expensive Computations
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. useMemo for filtered lists
  2. useCallback for event handlers passed to children
  3. React.memo for pure components
  4. Profile with React DevTools Profiler
- **Testing:** Measure render count before/after
- **Review Checklist:**
  - [ ] No premature optimization
  - [ ] Clear performance gain

### T293: Implement Request Cancellation
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T006
- **Acceptance Criteria:**
  1. Abort controller for all GET requests
  2. Cancel on component unmount
  3. Cancel on route change
  4. React Query automatic cancellation
- **Testing:** Navigate away mid-request
- **Review Checklist:**
  - [ ] No memory leaks
  - [ ] Abort errors handled gracefully

### T294: Optimize Re-renders with Context Splitting
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T024
- **Acceptance Criteria:**
  1. Split ThemeContext and AuthContext
  2. Use separate providers for independent state
  3. Context selectors for Zustand (prevent unnecessary re-renders)
- **Testing:** Use React DevTools Profiler
- **Review Checklist:**
  - [ ] Re-renders reduced by >50%
  - [ ] No prop drilling

### T295: Add Performance Monitoring with Sentry
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Sentry Performance module integrated
  2. Track page load times (LCP, FCP, TTI)
  3. Custom performance marks for critical flows
  4. Set performance budgets (alerts on regression)
- **Testing:** Trigger slow page load and verify Sentry event
- **Review Checklist:**
  - [ ] Sample rate configured (10% production)
  - [ ] PII not sent to Sentry

## Phase 9: Accessibility & i18n (T311-T330)

### T311: Run axe-core Audits on All Pages
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. jest-axe integrated in component tests
  2. Zero critical violations on all pages
  3. Document minor violations with remediation plan
  4. Run axe DevTools extension manually
- **Testing:** npm run test:a11y
- **Review Checklist:**
  - [ ] All violations logged in issue tracker
  - [ ] Regression prevention tests added

### T312: Fix Keyboard Navigation Issues
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T311
- **Acceptance Criteria:**
  1. Tab order logical on all pages
  2. Focus visible (outline or ring style)
  3. Escape key closes modals/dropdowns
  4. Enter key submits forms
  5. Arrow keys navigate menus
- **Testing:** Navigate entire app with keyboard only
- **Review Checklist:**
  - [ ] No keyboard traps
  - [ ] Skip to main content link

### T313: Add ARIA Labels and Live Regions
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T311
- **Acceptance Criteria:**
  1. aria-label on icon-only buttons
  2. aria-live for dynamic content (chat messages, toasts)
  3. aria-describedby for form errors
  4. role attributes where semantic HTML insufficient
- **Testing:** Screen reader announcement test
- **Review Checklist:**
  - [ ] No redundant ARIA (prefer semantic HTML)
  - [ ] Politeness levels correct (polite vs assertive)

### T314: Test with Screen Readers (NVDA/JAWS/VoiceOver)
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T313
- **Acceptance Criteria:**
  1. NVDA test on Windows (Firefox)
  2. JAWS test on Windows (Chrome)
  3. VoiceOver test on macOS (Safari)
  4. Document critical flow instructions for screen reader users
- **Testing:** Complete auth + chat flow with screen reader
- **Review Checklist:**
  - [ ] All interactive elements announced
  - [ ] Form validation errors announced

### T315: Ensure Color Contrast Compliance (WCAG AA)
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T002
- **Acceptance Criteria:**
  1. All text ≥4.5:1 contrast ratio (7:1 for AAA)
  2. UI components ≥3:1 contrast
  3. Focus indicators ≥3:1 contrast
  4. Test with browser DevTools contrast checker
- **Testing:** Automated contrast check in CI
- **Review Checklist:**
  - [ ] Dark mode also compliant
  - [ ] No low-contrast text

### T316: Add Focus Management for Modals and Dialogs
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T021
- **Acceptance Criteria:**
  1. Focus trapped in modal when open
  2. Focus restored to trigger element on close
  3. Escape key closes modal
  4. Use Headless UI Dialog primitive
- **Testing:** Open modal with keyboard
- **Review Checklist:**
  - [ ] No focus loss on open/close
  - [ ] Background content inert (aria-hidden)

### T317: Setup i18n Infrastructure with react-i18next
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. react-i18next installed and configured
  2. Language detection from browser/localStorage
  3. Translation files structure (locales/en/common.json)
  4. useTranslation hook in all components
- **Testing:** Switch language and verify UI update
- **Review Checklist:**
  - [ ] Fallback to English on missing translation
  - [ ] Pluralization support configured

### T318: Translate All UI Strings to English Baseline
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T317
- **Acceptance Criteria:**
  1. Extract all hardcoded strings to translation files
  2. Namespace translations by feature (auth, chat, etc.)
  3. 100% English coverage
  4. Prepare structure for Turkish translation (future)
- **Testing:** Verify no hardcoded strings remain
- **Review Checklist:**
  - [ ] Context provided for translators (comments)
  - [ ] Variables/interpolation working

### T319: Add Language Switcher in Settings
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T317, T214
- **Acceptance Criteria:**
  1. Dropdown with flag icons for languages
  2. Persist selection to user profile API
  3. Page content updates immediately
- **Testing:** Switch language and reload page
- **Review Checklist:**
  - [ ] Sync with backend user preferences
  - [ ] RTL support considered for future

### T320: Test Accessibility with Real Users (Optional)
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T314
- **Acceptance Criteria:**
  1. Recruit 2-3 users with disabilities
  2. Observe auth + chat flow
  3. Document pain points and feedback
  4. Prioritize fixes based on severity
- **Testing:** User testing session recordings
- **Review Checklist:**
  - [ ] Compensate participants
  - [ ] Iterate on feedback

## Phase 10: Testing & Documentation (T331-T360)

### T331: Achieve 80%+ Unit Test Coverage
- **Complexity:** Hard
- **Time:** 8 hours
- **Dependencies:** T022
- **Acceptance Criteria:**
  1. All utils functions tested (100% coverage)
  2. All custom hooks tested (90%+ coverage)
  3. Coverage report generated (vitest --coverage)
  4. Block PRs with coverage <80%
- **Testing:** npm run test:coverage
- **Review Checklist:**
  - [ ] No snapshot tests without purpose
  - [ ] Edge cases covered

### T332: Write Integration Tests for Critical Flows
- **Complexity:** Hard
- **Time:** 6 hours
- **Dependencies:** T003
- **Acceptance Criteria:**
  1. Auth flow integration test (login → protected route → logout)
  2. Chat flow integration test (start conversation → send message → receive response)
  3. Document flow integration test (upload → list → preview → delete)
  4. Forum flow integration test (view thread → reply → upvote)
- **Testing:** Run integration test suite
- **Review Checklist:**
  - [ ] MSW handlers cover all endpoints
  - [ ] Tests isolated (no shared state)

### T333: Complete E2E Test Suite for All User Journeys
- **Complexity:** Hard
- **Time:** 8 hours
- **Dependencies:** T058, T091, T139, T180
- **Acceptance Criteria:**
  1. Happy path for all 6 user stories (US1-US6)
  2. Error handling paths (network failure, validation errors)
  3. Cross-browser tests (Chrome, Firefox, Safari, Edge)
  4. Mobile responsive tests (iPhone, Android emulation)
- **Testing:** npm run test:e2e --project=all
- **Review Checklist:**
  - [ ] Tests parallelized for speed
  - [ ] Flaky tests fixed or marked

### T334: Write Storybook Documentation for Components
- **Complexity:** Medium
- **Time:** 4 hours
- **Dependencies:** T026
- **Acceptance Criteria:**
  1. All atoms/molecules have stories with Autodocs
  2. Interactive controls for all props
  3. Accessibility checks pass in Storybook
  4. Usage examples in MDX format
- **Testing:** Build Storybook static site
- **Review Checklist:**
  - [ ] Component descriptions clear
  - [ ] Variants documented

### T335: Create API Integration Guide
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T006
- **Acceptance Criteria:**
  1. Document API base URL configuration
  2. Explain token refresh flow
  3. List all service files and their endpoints
  4. Error handling patterns documented
- **Testing:** New dev can integrate new endpoint in <1 hour
- **Review Checklist:**
  - [ ] Code examples included
  - [ ] Links to backend API docs

### T336: Write Deployment Guide
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T004
- **Acceptance Criteria:**
  1. Environment variables documented (.env.example)
  2. Build process explained (npm run build)
  3. Vercel deployment steps (automatic + manual)
  4. Troubleshooting common deployment issues
- **Testing:** Deploy to staging environment
- **Review Checklist:**
  - [ ] Rollback procedure documented
  - [ ] Monitoring setup included

### T337: Setup Sentry for Error Tracking
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. Sentry SDK integrated with source maps
  2. Environment tags (dev/staging/production)
  3. User context attached to errors
  4. Release tracking configured
- **Testing:** Trigger error and verify Sentry event
- **Review Checklist:**
  - [ ] PII scrubbed from errors
  - [ ] Sample rate configured

### T338: Configure Google Analytics 4
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. GA4 property created
  2. gtag.js or react-ga4 integrated
  3. Page view tracking
  4. Custom events for key actions (login, chat send, upload)
- **Testing:** Verify events in GA4 DebugView
- **Review Checklist:**
  - [ ] Cookie consent implemented (GDPR)
  - [ ] PII not tracked

### T339: Create Developer Onboarding Checklist
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T335
- **Acceptance Criteria:**
  1. Prerequisites checklist (Node, npm, Git)
  2. First-time setup steps (clone, install, run)
  3. Code style guidelines (ESLint, Prettier)
  4. PR process documented
- **Testing:** New team member completes onboarding
- **Review Checklist:**
  - [ ] Links to external resources
  - [ ] Troubleshooting section

### T340: Document Component Testing Best Practices
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T331
- **Acceptance Criteria:**
  1. Testing Library principles documented
  2. Example test for form, list, modal
  3. Anti-patterns to avoid
  4. MSW usage guide
- **Testing:** Code review references guide
- **Review Checklist:**
  - [ ] Examples runnable
  - [ ] Clear do's and don'ts

## Phase 11: Final QA & Launch Prep (T361-T380)

### T361: Cross-Browser Testing (Chrome, Firefox, Safari, Edge)
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T333
- **Acceptance Criteria:**
  1. Manual testing on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
  2. Document browser-specific issues
  3. Verify Playwright tests pass on all browsers
  4. Test on Windows, macOS, Linux
- **Testing:** BrowserStack or manual testing
- **Review Checklist:**
  - [ ] CSS vendor prefixes added
  - [ ] No JavaScript errors in console

### T362: Mobile Responsive Testing (iOS, Android)
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T361
- **Acceptance Criteria:**
  1. Test on real iPhone (iOS 14+) and Android (10+) devices
  2. Verify touch interactions (swipe, pinch, tap)
  3. Test portrait and landscape orientations
  4. Verify performance on mobile (Lighthouse mobile audit)
- **Testing:** Device farm or manual testing
- **Review Checklist:**
  - [ ] No horizontal scroll on 375px
  - [ ] Buttons/links large enough for touch (44x44px)

### T363: Load Testing with Admin Dashboard
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T244
- **Acceptance Criteria:**
  1. Simulate 1000+ concurrent users with k6 or Artillery
  2. Measure page load times under load
  3. Verify no memory leaks in long sessions
  4. Test with large datasets (10,000+ documents, threads)
- **Testing:** Load test report with p95/p99 metrics
- **Review Checklist:**
  - [ ] Performance degrades gracefully
  - [ ] No crashes under load

### T364: Security Audit (XSS, CSRF, CSP)
- **Complexity:** Hard
- **Time:** 4 hours
- **Dependencies:** T001
- **Acceptance Criteria:**
  1. XSS prevention verified (DOMPurify on all user input)
  2. CSRF tokens on all mutations
  3. Content Security Policy headers configured
  4. No sensitive data in localStorage
  5. httpOnly cookies for JWT
- **Testing:** OWASP ZAP or manual penetration testing
- **Review Checklist:**
  - [ ] No console.log with user data
  - [ ] Third-party scripts audited

### T365: Performance Benchmarking
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T287
- **Acceptance Criteria:**
  1. Lighthouse Performance ≥90 (mobile & desktop)
  2. Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
  3. Time to Interactive <3.5s
  4. Bundle size <500KB gzipped
- **Testing:** Lighthouse CI in GitHub Actions
- **Review Checklist:**
  - [ ] All metrics meet targets
  - [ ] Performance budget enforced

### T366: Create Production Environment Config
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T336
- **Acceptance Criteria:**
  1. .env.production file with production API URLs
  2. Source maps disabled in production build
  3. Console logs removed (except errors)
  4. Minification and compression verified
- **Testing:** Build production bundle and verify
- **Review Checklist:**
  - [ ] No debug code in production
  - [ ] Environment variables documented

### T367: Setup Vercel Deployment
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T366
- **Acceptance Criteria:**
  1. Vercel project connected to GitHub repo
  2. Automatic deployments on push to main
  3. Preview deployments on PR
  4. Environment variables configured in Vercel dashboard
- **Testing:** Deploy to Vercel and verify app works
- **Review Checklist:**
  - [ ] Custom domain configured (if applicable)
  - [ ] HTTPS enabled

### T368: Setup Staging Environment
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T367
- **Acceptance Criteria:**
  1. Staging environment deployed (staging.kampusplus.com)
  2. Separate backend API for staging
  3. Test data seeded in staging DB
  4. Monitoring enabled (Sentry, GA4)
- **Testing:** Full user journey on staging
- **Review Checklist:**
  - [ ] Staging isolated from production
  - [ ] Access restricted (auth or IP whitelist)

### T369: Create Rollback Procedure
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T367
- **Acceptance Criteria:**
  1. Document how to rollback deployment in Vercel
  2. Database migration rollback plan
  3. Incident response checklist
  4. Communication plan for downtime
- **Testing:** Simulate rollback in staging
- **Review Checklist:**
  - [ ] Rollback tested
  - [ ] RTO/RPO defined

### T370: Final Stakeholder Demo
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T368
- **Acceptance Criteria:**
  1. Demo all 6 user stories on staging
  2. Collect feedback from stakeholders
  3. Document requested changes
  4. Prioritize critical vs nice-to-have
- **Testing:** Stakeholder sign-off
- **Review Checklist:**
  - [ ] Demo script prepared
  - [ ] Known issues disclosed

### T371: User Acceptance Testing (UAT)
- **Complexity:** Medium
- **Time:** 4 hours
- **Dependencies:** T370
- **Acceptance Criteria:**
  1. Recruit 10-15 beta testers
  2. Provide UAT test plan with scenarios
  3. Collect feedback via survey
  4. Fix critical bugs found in UAT
- **Testing:** UAT feedback report
- **Review Checklist:**
  - [ ] UAT environment stable
  - [ ] Feedback analyzed

### T372: Create Launch Checklist
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T369
- **Acceptance Criteria:**
  1. Pre-launch checklist (DNS, SSL, monitoring, backups)
  2. Launch day checklist (deploy, smoke test, announce)
  3. Post-launch checklist (monitor logs, user feedback)
  4. Rollback conditions defined
- **Testing:** Checklist reviewed by team
- **Review Checklist:**
  - [ ] All items actionable
  - [ ] Responsible parties assigned

### T373: Setup Monitoring Alerts
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T337
- **Acceptance Criteria:**
  1. Sentry alerts for error spikes
  2. Uptime monitoring (Pingdom or UptimeRobot)
  3. Performance alerts (Lighthouse CI regression)
  4. Slack/Email notifications configured
- **Testing:** Trigger alert and verify notification
- **Review Checklist:**
  - [ ] Alert thresholds reasonable
  - [ ] On-call rotation defined

### T374: Create Incident Response Runbook
- **Complexity:** Medium
- **Time:** 2 hours
- **Dependencies:** T369
- **Acceptance Criteria:**
  1. Document incident severity levels
  2. Escalation procedures
  3. Communication templates (user-facing, internal)
  4. Postmortem template
- **Testing:** Table-top exercise with team
- **Review Checklist:**
  - [ ] Roles and responsibilities clear
  - [ ] Contact information current

### T375: Prepare Marketing Assets
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T370
- **Acceptance Criteria:**
  1. Screenshots of all major features
  2. Product demo video (2-3 minutes)
  3. Landing page copy (if separate from app)
  4. Social media announcement posts
- **Testing:** Review with marketing team
- **Review Checklist:**
  - [ ] Branding consistent
  - [ ] Accessible descriptions

### T376: Setup Analytics Dashboards
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T338
- **Acceptance Criteria:**
  1. GA4 dashboard with key metrics (DAU, sessions, conversions)
  2. Sentry dashboard for error trends
  3. Vercel analytics for page views
  4. Weekly report automation
- **Testing:** Verify dashboards populate with data
- **Review Checklist:**
  - [ ] Metrics align with KPIs
  - [ ] Dashboards shared with stakeholders

### T377: Conduct Final Security Review
- **Complexity:** Hard
- **Time:** 3 hours
- **Dependencies:** T364
- **Acceptance Criteria:**
  1. Third-party dependency audit (npm audit)
  2. Secrets scanning (no API keys in code)
  3. Security headers verified (CSP, X-Frame-Options, etc.)
  4. Rate limiting verified on backend
- **Testing:** Security audit report
- **Review Checklist:**
  - [ ] All high/critical vulnerabilities fixed
  - [ ] Penetration test passed

### T378: Create Post-Launch Support Plan
- **Complexity:** Easy
- **Time:** 1 hour
- **Dependencies:** T374
- **Acceptance Criteria:**
  1. Define support channels (email, chat, forum)
  2. SLA for bug fixes (critical, high, medium, low)
  3. Hotfix deployment process
  4. User feedback collection method
- **Testing:** Support plan approved by team
- **Review Checklist:**
  - [ ] Support team trained
  - [ ] Escalation path defined

### T379: Final Code Review and Cleanup
- **Complexity:** Medium
- **Time:** 3 hours
- **Dependencies:** T377
- **Acceptance Criteria:**
  1. Remove all console.log statements
  2. Remove unused imports and dead code
  3. Update all comments and TODOs
  4. Verify all ESLint warnings resolved
- **Testing:** Clean build with zero warnings
- **Review Checklist:**
  - [ ] Code formatting consistent
  - [ ] No debug artifacts

### T380: Launch Sign-Off and Go-Live
- **Complexity:** Easy
- **Time:** 2 hours
- **Dependencies:** T372, T377, T379
- **Acceptance Criteria:**
  1. All launch checklist items completed
  2. Stakeholder sign-off obtained
  3. Deploy to production
  4. Smoke test critical user journeys
  5. Announce launch internally and externally
- **Testing:** Production app accessible and functional
- **Review Checklist:**
  - [ ] Rollback plan ready
  - [ ] Team on standby for issues
  - [ ] Celebration scheduled! 🎉

---

## Task Summary

**Total Tasks:** 380  
**Estimated Timeline:** 14-16 weeks (3 developers)

### Tasks by Phase:
- **Phase 0:** Project Setup (T001-T020) - 6 tasks, ~12 hours
- **Phase 1:** Design System (T021-T050) - 6 tasks, ~16 hours
- **Phase 2:** Authentication (T051-T080) - 8 tasks, ~21 hours
- **Phase 3:** AI Chat (T081-T130) - 11 tasks, ~28 hours
- **Phase 4:** Documents (T131-T170) - 9 tasks, ~23 hours
- **Phase 5:** Forum (T171-T210) - 10 tasks, ~27 hours
- **Phase 6:** Profile (T211-T240) - 7 tasks, ~16 hours
- **Phase 7:** Admin (T241-T280) - 9 tasks, ~26 hours
- **Phase 8:** Performance (T281-T310) - 15 tasks, ~36 hours
- **Phase 9:** Accessibility (T311-T330) - 10 tasks, ~25 hours
- **Phase 10:** Testing & Docs (T331-T360) - 10 tasks, ~39 hours
- **Phase 11:** Launch Prep (T361-T380) - 20 tasks, ~47 hours

**Estimated Total Hours:** ~316 hours (~8 weeks for 3 developers working in parallel)

---

## Dependency Graph (Critical Path)

```
T001 (Vite Setup)
 ├─> T002 (Tailwind) -> T021 (Design System) -> T052 (Login Page)
 ├─> T003 (Testing) -> T058 (Auth E2E) -> T091 (Chat E2E) -> T333 (Full E2E)
 ├─> T006 (API Layer) -> T051 (Auth Service) -> T081 (Chat Layout)
 └─> T023 (Routing) -> T055 (Protected Routes) -> All Feature Pages
```

**Blocking Tasks** (must complete before others can start):
- T001 (Vite Setup) - blocks all tasks
- T002 (Tailwind) - blocks all UI tasks
- T021 (Design System) - blocks all page development
- T051 (Auth Service) - blocks all authenticated features
- T003 (Testing Setup) - blocks all test writing

---

## Next Steps

1. ✅ **Phase 0 Complete**: This tasks.md file created
2. **Begin Implementation**: Start with T001-T006 (Project Setup)
3. **Daily Standup**: Track progress using task IDs (T###)
4. **Code Review**: Use task acceptance criteria as PR checklist
5. **Update Context**: Run `.specify/scripts/powershell/update-agent-context.ps1` after each phase

**Command to track progress**:
```bash
# Mark task as in-progress
git commit -m "feat(T052): Login page - form layout complete"

# Mark task as complete
git commit -m "feat(T052): Login page - all acceptance criteria met"
```

---

**Status:** ✅ ALL TASKS DEFINED (T001-T380)  
**Ready For:** Implementation start with Phase 0 (T001-T006)  
**Last Updated:** 2025-12-29

