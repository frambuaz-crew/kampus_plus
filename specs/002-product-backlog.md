# Kampus+ Product Backlog Feature Specifications

**Created**: 2025-12-24  
**Status**: Planned  
**Scope**: 14 User Stories (US-01 to US-14) organized by Sprint and Module

---

## Overview

This document captures all user stories from the Product Backlog, organized by priority, sprint allocation, and feature module. Each story includes acceptance criteria, estimated effort (story points), and prioritization rationale.

---

## US-01: Email Verification & Student Registration

**Module**: Auth & Core  
**Sprint**: Sprint 1  
**Story Points**: 8  
**Priority**: Critical  
**Status**: To Do

**User Story**: "As a student, I want to register for Kampus+ with secure email verification so that only authorized university members can access the platform."

**Why this priority**: Authentication is the foundation for all other features. Email verification ensures data security and prevents unauthorized access.

**Independent Test**: Registration form works end-to-end, verification email sent, access granted only after verification.

**Acceptance Scenarios**:

1. **Given** a new student on registration page, **When** they fill email, password, and name fields, **Then** form validation passes and account is created with `is_verified=false`
2. **Given** a newly registered student, **When** they check their email, **Then** they receive a verification link
3. **Given** a student with verification link, **When** they click it, **Then** their account is marked verified and they can login
4. **Given** an unverified student, **When** they try to login, **Then** they are blocked with "Please verify email" message

**Technical Notes**:
- Use JWT for email verification tokens (24-hour expiry)
- SMTP or SendGrid for email delivery
- Database: `users.is_verified` boolean flag

---

## US-02: Responsive Sidebar Navigation

**Module**: UI/UX  
**Sprint**: Sprint 1  
**Story Points**: 5  
**Priority**: Critical  
**Status**: To Do

**User Story**: "As a user, I want a responsive sidebar on mobile and desktop showing available menu options so I can easily navigate between features."

**Why this priority**: Navigation UX directly impacts user engagement and feature discoverability.

**Independent Test**: Sidebar renders correctly on mobile/tablet/desktop, items are clickable and navigate correctly.

**Acceptance Scenarios**:

1. **Given** a logged-in user on mobile, **When** viewport is < 768px, **Then** sidebar is hidden and hamburger menu appears
2. **Given** a hamburger menu visible, **When** user clicks it, **Then** sidebar slides in/out smoothly
3. **Given** desktop user (> 1024px), **When** page loads, **Then** sidebar is visible and takes ~20% width
4. **Given** sidebar visible, **When** user clicks a menu item, **Then** page navigates and sidebar closes on mobile

**Modules in Sidebar**:
- Dashboard
- Courses
- Forum
- Messages
- Documents
- Account Settings
- Career Info (for students)
- Moderation (for admins)

---

## US-03: Course Content & Category Management

**Module**: Data (Crowd)  
**Sprint**: Sprint 1  
**Story Points**: 5  
**Priority**: High  
**Status**: To Do

**User Story**: "As an instructor, I want to upload course materials (PDFs, lecture notes, Yemek/Etkinlik content) organized by category so students can easily find and access course resources."

**Why this priority**: Course content delivery is core to the platform's educational value.

**Independent Test**: Instructor can upload files, categorize them, students can view by category filter.

**Acceptance Scenarios**:

1. **Given** an instructor in course management, **When** they click "Upload Material", **Then** file picker opens accepting PDF, DOCX, etc.
2. **Given** uploaded file, **When** instructor selects category (Lecture, Exercise, Exam Prep), **Then** file is tagged and stored
3. **Given** a student viewing course, **When** they filter by "Lecture" category, **Then** only lecture materials appear
4. **Given** multiple materials with same category, **When** student sorts by "Latest", **Then** materials ordered by upload date descending

**Technical Notes**:
- S3/MinIO for file storage
- Database: `documents.category` ENUM(Lecture, Exercise, Exam, Assignment, Reading)

---

## US-04: AI-Powered Study Assistant

**Module**: Security/AI  
**Sprint**: Sprint 2  
**Story Points**: 8  
**Priority**: High  
**Status**: To Do

**User Story**: "As a student, I want to ask the AI assistant questions about my courses or get personalized study recommendations with AI support so I can improve my understanding without always asking instructors."

**Why this priority**: AI features differentiate Kampus+ and provide 24/7 student support.

**Independent Test**: Student can submit question, AI responds, responses are relevant and anonymized.

**Acceptance Scenarios**:

1. **Given** student in chat interface, **When** they type a question about "calculus derivative", **Then** AI responds with relevant explanation within 5 seconds
2. **Given** AI response, **When** student checks it, **Then** no student PII is included in AI logs
3. **Given** multiple students asking similar questions, **When** AI processes them, **Then** responses are contextual to each student's course
4. **Given** complex query requiring course context, **When** AI processes it, **Then** it retrieves course materials via RAG

**Technical Notes**:
- Use Google Gemini API for LLM
- Implement RAG (Retrieval-Augmented Generation) with FAISS vector DB
- Anonymize student identity before sending to AI (use anonymous_id)
- NO prompt logging to database

---

## US-05: Forum Moderation & Admin Controls

**Module**: Moderation  
**Sprint**: Sprint 2  
**Story Points**: 5  
**Priority**: High  
**Status**: To Do

**User Story**: "As a forum moderator/admin, I want to filter inappropriate content and manage forum discussions so the community remains respectful and on-topic."

**Why this priority**: Community safety is essential for trust. Moderation prevents harassment and keeps forum focused.

**Independent Test**: Admin can see flagged posts, mark as inappropriate, hide them from view.

**Acceptance Scenarios**:

1. **Given** a flagged forum post, **When** moderator reviews it, **Then** they see post content, flag reason, and reporter identity (anonymized)
2. **Given** inappropriate content confirmed, **When** moderator clicks "Remove", **Then** post is hidden from all users
3. **Given** borderline content, **When** moderator marks "Needs Review", **Then** senior mod is notified for additional review
4. **Given** repeated violations by same user, **When** admin reviews history, **Then** they can "Suspend User" for defined period

**Technical Notes**:
- Database: `forum_posts.is_flagged`, `forum_posts.moderation_status`
- Implement user suspension with `users.suspended_until` timestamp

---

## US-06: Course Cards & Marketplace

**Module**: Marketplace  
**Sprint**: Sprint 2  
**Story Points**: 5  
**Priority**: Medium  
**Status**: To Do

**User Story**: "As a student, I want to view course information on cards showing course name, instructor, rating, and enrollment status so I can browse and discover courses."

**Why this priority**: Course discovery drives engagement and enrollment.

**Independent Test**: Course cards render with all data, can filter by rating/popularity, can enroll from card.

**Acceptance Scenarios**:

1. **Given** student on Courses page, **When** page loads, **Then** course cards display with course name, instructor photo, rating (1-5 stars), enrollment count
2. **Given** course card, **When** student clicks "Enroll", **Then** they're added to course and button changes to "Enrolled"
3. **Given** multiple courses, **When** student filters by "Rating: 4.5+", **Then** only highly-rated courses appear
4. **Given** sorting options, **When** student selects "Most Popular", **Then** courses sorted by enrollment count descending

**Technical Notes**:
- Database: Add `courses.rating` (FLOAT), `courses.enrollment_count` (INT)
- Implement rating calculation from `enrollments.rating` reviews

---

## US-07: Career Resources & Referral System

**Module**: Career  
**Sprint**: Sprint 3  
**Story Points**: 5  
**Priority**: High  
**Status**: To Do

**User Story**: "As a student/recruiter, I want to access career resources and use a referral system with role, title, and tip classifications so I can explore job opportunities and get recommendations."

**Why this priority**: Career support increases platform stickiness and delivers real-world value.

**Independent Test**: Career resources accessible, can create referral entries, filtering works by role/title/tip.

**Acceptance Scenarios**:

1. **Given** student in Career section, **When** they click "Browse Referrals", **Then** list shows referrals organized by company, role, and rating
2. **Given** referral card, **When** they expand it, **Then** details show: Role, Title, Tip (advice), Contact info, Rating
3. **Given** recruiter or mentor, **When** they create referral, **Then** they fill: Company, Role, Title, Tip, and Salary Range (optional)
4. **Given** filtering options, **When** student filters by "Software Engineer" role, **Then** only matching referrals appear

**Technical Notes**:
- Database: `referrals.role`, `referrals.title`, `referrals.tip`, `referrals.salary_range`
- ENUM for role types: Intern, Entry-Level, Mid-level, Senior, etc.

---

## US-08: Direct Messaging & Communication

**Module**: Communication  
**Sprint**: Sprint 3  
**Story Points**: 13  
**Priority**: Critical  
**Status**: To Do

**User Story**: "As a student, I want to send direct messages to instructors or classmates via a Messenger feature so I can get help or collaborate outside of class."

**Why this priority**: Communication is critical for student success and mentorship relationships.

**Independent Test**: Student can send message, recipient receives it, conversation history persists.

**Acceptance Scenarios**:

1. **Given** student on Messenger, **When** they click "New Message" and select recipient, **Then** message compose box opens
2. **Given** typing message, **When** they click "Send", **Then** message appears in conversation and recipient is notified (email/in-app)
3. **Given** conversation thread, **When** messages load, **Then** full history is visible with timestamps and sender names
4. **Given** Firebase integration, **When** recipient is online, **Then** message shows as "Delivered" with real-time indicator

**Technical Notes**:
- Use Firebase Realtime DB for real-time messaging or implement WebSocket with FastAPI
- Database: `messages.sender_id`, `messages.recipient_id`, `messages.content`, `messages.created_at`, `messages.is_read`
- Implement read receipts and typing indicators

---

## US-09: Forum Discussion & Community

**Module**: Social  
**Sprint**: Sprint 3  
**Story Points**: 3  
**Priority**: Medium  
**Status**: To Do

**User Story**: "As a student, I want to ask questions and see responses in a forum so I can learn from peers and instructors."

**Why this priority**: Peer learning and community engagement drive retention.

**Independent Test**: Student can post, reply, view comment threads, upvote responses.

**Acceptance Scenarios**:

1. **Given** student in course forum, **When** they click "New Topic", **Then** they can enter question title and description
2. **Given** posted topic, **When** peers reply, **Then** replies appear as nested comments with author, timestamp, and score
3. **Given** good answer, **When** asker marks it "Helpful", **Then** answer is highlighted and scored visibly higher
4. **Given** topic with moderator filter enabled, **When** inappropriate reply appears, **Then** it's hidden with "Removed by moderator" message

**Technical Notes**:
- Database: `forum_posts`, `forum_replies` (thread structure)
- Implement anonymous posting with HMAC-SHA256 anonymous IDs (Constitution Principle IV)
- Moderator reveal capability for admins

---

## US-10: Knowledge Base & UniKon Assistance

**Module**: AI (RAG)  
**Sprint**: Sprint 4  
**Story Points**: 13  
**Priority**: Critical  
**Status**: To Do

**User Story**: "As a student, I want to ask questions about campus rules, policies, or historical information and get answers from a Chromo-based knowledge vector DB so I can get instant accurate information."

**Why this priority**: Knowledge base reduces support load and empowers self-service learning.

**Independent Test**: Student queries campus policy, AI retrieves correct answer from vector DB, response is accurate.

**Acceptance Scenarios**:

1. **Given** student asks "What are campus parking rules?", **When** AI searches vector DB, **Then** relevant policy excerpts are retrieved and summarized
2. **Given** query about historical events, **When** AI responds, **Then** answer includes sources and document references
3. **Given** ambiguous query, **When** AI doesn't find confident match, **Then** it suggests "Ask a staff member" with contact info
4. **Given** new policies added to knowledge base, **When** vector DB is updated, **Then** AI reflects changes within 24 hours

**Technical Notes**:
- Vector DB: FAISS with Chroma/Pinecone (Chroma recommended for embedded mode)
- Use Google Gemini embeddings API for vectorization
- Document source: PDFs, wiki, policy docs ingested into vector store
- Retrieval: RAG with reranking to improve relevance

---

## US-11: Image Processing & Metadata

**Module**: AI (Vision)  
**Sprint**: Sprint 4  
**Story Points**: 8  
**Priority**: Medium  
**Status**: To Do

**User Story**: "As an instructor, I want to upload course photos or diagrams and have AI extract text/metadata (using Vision API) so course materials are searchable and accessible."

**Why this priority**: Image processing enables richer content discovery and accessibility.

**Independent Test**: Instructor uploads image, AI extracts text, text is searchable, image is indexed.

**Acceptance Scenarios**:

1. **Given** instructor uploads whiteboard photo, **When** AI processes it, **Then** handwritten text is extracted and stored as searchable metadata
2. **Given** diagram with labels, **When** AI analyzes it, **Then** labels and descriptions are extracted and added to search index
3. **Given** OCR results, **When** accuracy is low, **Then** instructor is offered option to correct extracted text
4. **Given** multiple images in course, **When** student searches for keyword, **Then** relevant images appear in results with extracted text highlighted

**Technical Notes**:
- Vision API: Google Cloud Vision API or Claude Vision
- Implement OCR confidence threshold (>90% auto-accept, <90% manual review)
- Database: `documents.extracted_text`, `documents.image_metadata`

---

## US-12: Mentor Network & Pairing

**Module**: Network  
**Sprint**: Sprint 4  
**Story Points**: 5  
**Priority**: Medium  
**Status**: To Do

**User Story**: "As a student/mentor, I want to join a mentor-mentee network showing available mentors and request mentorship so I can get guidance from experienced students/professionals."

**Why this priority**: Mentorship creates value-add that increases lifetime user engagement.

**Independent Test**: Student can browse mentors, send request, mentor approves, relationship established.

**Acceptance Scenarios**:

1. **Given** student in Mentor section, **When** they view "Available Mentors", **Then** mentors are listed with bio, expertise tags, availability, and rating
2. **Given** mentor profile, **When** student clicks "Request Mentorship", **Then** request is sent to mentor for approval
3. **Given** mentor review, **When** they approve request, **Then** student receives notification and messaging channel opens
4. **Given** active mentorship, **When** either party rates the relationship, **Then** rating appears on mentor's profile and both get feedback form

**Technical Notes**:
- Database: `mentorships.student_id`, `mentorships.mentor_id`, `mentorships.status` (pending/active/completed), `mentorships.rating`
- Implement matching algorithm (optional for future): Based on expertise tags and goals

---

## US-13: Dashboard Widgets & Analytics

**Module**: Dashboard  
**Sprint**: Sprint 4  
**Story Points**: 5  
**Priority**: Medium  
**Status**: To Do

**User Story**: "As a student, I want to see on my dashboard a collection of widgets showing my courses, grades, upcoming events, and forum activity so I have a quick overview of my progress."

**Why this priority**: Dashboard improves user onboarding and provides quick access to key info.

**Independent Test**: Dashboard loads with all widget data, widgets are interactive, data updates in real-time.

**Acceptance Scenarios**:

1. **Given** student dashboard loads, **When** page renders, **Then** widgets display: Active Courses, GPA/Grades Card, Upcoming Assignments, Recent Forum Activity
2. **Given** widget showing courses, **When** student clicks a course card, **Then** they navigate to course detail page
3. **Given** grade widget, **When** course grade is updated, **Then** widget refreshes within 5 seconds (real-time)
4. **Given** multiple widgets, **When** user drags widgets, **Then** layout is rearranged and saved to preferences

**Technical Notes**:
- Use WebSocket or polling for real-time updates
- Database: `user_dashboard_preferences.widget_order`, `user_dashboard_preferences.widget_visibility`
- Implement widget state management in frontend context/store

---

## US-14: Personalization & AI Recommendations

**Module**: AI / Personalization  
**Sprint**: Sprint 4  
**Story Points**: 8  
**Priority**: High  
**Status**: To Do

**User Story**: "As a student, I want personalized course recommendations based on my academic history, learning style, and interests so I can discover relevant courses and optimize my learning path."

**Why this priority**: Personalization increases engagement and course completion rates.

**Independent Test**: Student sees personalized recommendations, recommendations change based on behavior, accuracy improves over time.

**Acceptance Scenarios**:

1. **Given** student completes profile with interests (Major, Electives, Career Goals), **When** dashboard loads, **Then** "Recommended for You" section shows 3-5 relevant courses
2. **Given** student enrolls in courses and completes assignments, **When** ML model runs (daily), **Then** recommendations are updated based on performance patterns
3. **Given** student searches for "Data Science", **When** results load, **Then** recommended courses appear at top, sorted by relevance to their profile
4. **Given** course recommendation clicked, **When** student navigates, **Then** reason for recommendation is shown ("Matches your interest in AI", etc.)

**Technical Notes**:
- Recommendation engine: Collaborative filtering (if user base large enough) or content-based filtering
- ML pipeline: Daily batch job to compute recommendations
- Database: `recommendations.student_id`, `recommendations.course_id`, `recommendations.score`, `recommendations.reason`
- Track click-through rate (CTR) to measure recommendation quality

---

## Summary Table

| ID | Title | Module | Sprint | Story Points | Priority | Status |
|---|---|---|---|---|---|---|
| US-01 | Email Verification | Auth & Core | Sprint 1 | 8 | Critical | To Do |
| US-02 | Responsive Sidebar | UI/UX | Sprint 1 | 5 | Critical | To Do |
| US-03 | Course Content | Data | Sprint 1 | 5 | High | To Do |
| US-04 | AI Study Assistant | Security/AI | Sprint 2 | 8 | High | To Do |
| US-05 | Forum Moderation | Moderation | Sprint 2 | 5 | High | To Do |
| US-06 | Course Cards | Marketplace | Sprint 2 | 5 | Medium | To Do |
| US-07 | Career Resources | Career | Sprint 3 | 5 | High | To Do |
| US-08 | Direct Messaging | Communication | Sprint 3 | 13 | Critical | To Do |
| US-09 | Forum Discussion | Social | Sprint 3 | 3 | Medium | To Do |
| US-10 | Knowledge Base | AI (RAG) | Sprint 4 | 13 | Critical | To Do |
| US-11 | Image Processing | AI (Vision) | Sprint 4 | 8 | Medium | To Do |
| US-12 | Mentor Network | Network | Sprint 4 | 5 | Medium | To Do |
| US-13 | Dashboard Widgets | Dashboard | Sprint 4 | 5 | Medium | To Do |
| US-14 | AI Personalization | AI / Personalization | Sprint 4 | 8 | High | To Do |

---

## Cross-Sprint Dependencies

- **US-01** (Email Verification) is a BLOCKER for all other features (no unauthenticated access)
- **US-02** (Sidebar Navigation) unblocks Sprint 2+ features (navigation dependency)
- **US-04** (AI Study Assistant) depends on vector DB setup (shared with US-10)
- **US-10** (Knowledge Base) and **US-11** (Image Processing) share vector DB and AI service infrastructure

---

## Constitution Compliance Checklist

✅ **Test-First Development**: All features have defined acceptance scenarios (testable)  
✅ **Full-Stack Integration**: Frontend-backend contracts defined for each user story  
✅ **Security by Default**: US-01 (auth), anonymization in US-09 (forum)  
✅ **AI Ethics & Privacy**: US-04 (no prompt logging), US-09 (anonymous IDs), US-10 (knowledge base filtering)  
✅ **Branch Strategy**: Each US will have dedicated feature branch  
✅ **Observability**: Logging and metrics requirements documented for AI features (US-04, US-10, US-11)

---

**Created by**: AI Agent (Speckit)  
**Date**: 2025-12-24  
**Status**: Ready for Planning Sprint
