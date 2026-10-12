# Firestore Data Model Specification

This document maps each relational SQLite table from `backend/src/config/schema.sql` to its equivalent Firestore NoSQL schema in Google Cloud Firestore.

---

## 1. Collections Overview

| Firestore Path | Replaces SQL Table(s) | Primary Purpose | Query Pattern |
| :--- | :--- | :--- | :--- |
| `users/{clerkUserId}` | `users` | User profile, gamification stats, course info | `doc(userId).get()` |
| `subjects/{subjectId}` | `subjects` | Color-coded subjects created by student | `.where('userId', '==', uid)` |
| `assignments/{assignmentId}` | `assignments`, `subtasks`, `resources` | Assignments with embedded subtask checklists & resources | `.where('userId', '==', uid)` |
| `groups/{groupId}` | `groups`, `group_members` | Study groups with member array & lookup IDs | `.where('memberIds', 'array-contains', uid)` |
| `groups/{groupId}/tasks/{taskId}` | `group_tasks` | Task breakdown delegated within a study group | `collection('groups/{id}/tasks')` |
| `achievements/{achievementId}` | `achievements` | Static system badges and reward point definitions | `collection('achievements')` |
| `users/{uid}/achievements/{achId}` | `user_achievements` | Unlocked badges earned by a user | `collection('users/{uid}/achievements')` |
| `users/{uid}/points/{pointId}` | `user_points` | History of points rewarded for on-time submissions | `collection('users/{uid}/points')` |
| `notifications/{notificationId}` | `notifications` | In-app alerts, deadline warnings, achievements | `.where('userId', '==', uid)` |

---

## 2. Collection Schemas & Field Definitions

### `users/{clerkUserId}`
Replaces: `users` table.

```json
{
  "id": "user_2test123",
  "name": "Alex Johnson",
  "email": "alex.student@college.edu",
  "password": null,
  "course": "BCA",
  "semester": "4th",
  "division": "A",
  "avatarUrl": "https://...",
  "avatar_url": "https://...",
  "points": 285,
  "streak": 5,
  "createdAt": "2026-10-12T10:00:00.000Z",
  "updatedAt": "2026-10-12T10:00:00.000Z"
}
```

---

### `subjects/{subjectId}`
Replaces: `subjects` table.

```json
{
  "id": "sub_dbms_user123",
  "userId": "user_2test123",
  "name": "Database Management System",
  "code": "DBMS",
  "color": "#6366F1",
  "createdAt": "2026-10-12T10:00:00.000Z"
}
```

---

### `assignments/{assignmentId}`
Replaces: `assignments`, `subtasks`, and `resources` tables.
*Notice: Eliminates SQL `JOIN`s by copying `subjectName` and `subjectColor` into the document, and embedding `subtasks` & `resources` as arrays.*

```json
{
  "id": "assign_12345",
  "userId": "user_2test123",
  "subjectId": "sub_dbms_user123",
  "subjectName": "Database Management System",
  "subject_name": "Database Management System",
  "subjectCode": "DBMS",
  "subject_code": "DBMS",
  "subjectColor": "#6366F1",
  "subject_color": "#6366F1",
  "title": "DBMS ER-Diagram & Relational Schema",
  "description": "Design complete ER diagrams and translate to normalized 3NF relational schemas.",
  "deadline": "2026-10-15T18:00:00.000Z",
  "difficulty": "HARD",
  "estimatedHours": 4.5,
  "estimated_hours": 4.5,
  "progress": 35,
  "status": "IN_PROGRESS",
  "teacher": "Dr. R. Sharma",
  "submissionMethod": "Online Portal",
  "submission_method": "Online Portal",
  "notes": "Remember 3NF Boyce-Codd constraints",
  "priorityScore": 145,
  "priority_score": 145,
  "priorityLevel": "HIGH",
  "priority_level": "HIGH",
  "riskLevel": "APPROACHING",
  "risk_level": "APPROACHING",
  "completedAt": null,
  "completed_at": null,
  "createdAt": "2026-10-12T10:00:00.000Z",
  "subtasks": [
    {
      "id": "st_1",
      "title": "Research ER Entity sets",
      "estimatedMinutes": 45,
      "estimated_minutes": 45,
      "isCompleted": true,
      "is_completed": 1,
      "createdAt": "2026-10-12T10:00:00.000Z"
    },
    {
      "id": "st_2",
      "title": "Draw ER Diagram in Lucidchart",
      "estimatedMinutes": 60,
      "estimated_minutes": 60,
      "isCompleted": false,
      "is_completed": 0,
      "createdAt": "2026-10-12T10:00:00.000Z"
    }
  ],
  "resources": [
    {
      "id": "res_1",
      "title": "Assignment Guidelines PDF",
      "type": "URL",
      "urlOrPath": "https://portal.college.edu/guidelines.pdf",
      "url_or_path": "https://portal.college.edu/guidelines.pdf",
      "fileSize": 102400,
      "createdAt": "2026-10-12T10:00:00.000Z"
    }
  ]
}
```

---

### `groups/{groupId}` & `groups/{groupId}/tasks/{taskId}`
Replaces: `groups`, `group_members`, and `group_tasks` tables.

#### Group Document (`groups/{groupId}`):
```json
{
  "id": "grp_bca_2026",
  "name": "BCA Final Year Project Group",
  "description": "Collaborative workspace for final semester project",
  "creatorId": "user_2test123",
  "code": "GRP-BCA2026",
  "memberIds": ["user_2test123", "user_partner456"],
  "members": [
    {
      "userId": "user_2test123",
      "name": "Alex Johnson",
      "email": "alex.student@college.edu",
      "avatarUrl": null,
      "role": "LEADER",
      "joinedAt": "2026-10-12T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-10-12T10:00:00.000Z"
}
```

#### Task Subcollection (`groups/{groupId}/tasks/{taskId}`):
```json
{
  "id": "gtask_1",
  "groupId": "grp_bca_2026",
  "title": "Backend API Documentation",
  "assignedUserId": "user_2test123",
  "assignedUserName": "Alex Johnson",
  "deadline": "2026-10-18T18:00:00.000Z",
  "status": "IN_PROGRESS",
  "createdAt": "2026-10-12T10:00:00.000Z"
}
```

---

### `achievements/{achievementId}` (Static Global)
Replaces: `achievements` table.

```json
{
  "id": "DEADLINE_MASTER",
  "code": "DEADLINE_MASTER",
  "name": "Deadline Master",
  "description": "Complete 5 assignments before deadline",
  "icon": "Clock",
  "pointsReward": 75,
  "points_reward": 75
}
```

---

### `users/{uid}/achievements/{achId}` & `users/{uid}/points/{pointId}`
Replaces: `user_achievements` and `user_points` tables.

#### User Achievement (`users/{uid}/achievements/{achId}`):
```json
{
  "id": "DEADLINE_MASTER",
  "achievementId": "DEADLINE_MASTER",
  "code": "DEADLINE_MASTER",
  "name": "Deadline Master",
  "icon": "Clock",
  "pointsReward": 75,
  "earnedAt": "2026-10-12T10:00:00.000Z"
}
```

#### User Points Log (`users/{uid}/points/{pointId}`):
```json
{
  "id": "pt_12345",
  "userId": "user_2test123",
  "points": 50,
  "reason": "Completed Assignment: DBMS ER-Diagram",
  "createdAt": "2026-10-12T10:00:00.000Z"
}
```

---

### `notifications/{notificationId}`
Replaces: `notifications` table.

```json
{
  "id": "notif_9876",
  "userId": "user_2test123",
  "title": "⚡ Urgent Deadline Approaching",
  "message": "Java Multi-threading assignment is due in 18 hours!",
  "type": "URGENT",
  "isRead": false,
  "is_read": 0,
  "link": "/assignments/assign_java_123",
  "createdAt": "2026-10-12T10:00:00.000Z"
}
```

---

## 3. Migration Key Principles
1. **Ownership Validation**: Every operation verifies `doc.userId === req.user.id` or `doc.memberIds.includes(req.user.id)`.
2. **Batch Writes for Cascading Deletes**: When an assignment or group is deleted, batch operations purge any corresponding subcollections or related docs.
3. **Dual Field Naming Compatibility**: Objects return both `camelCase` and `snake_case` aliases (`subject_name` / `subjectName`, `priority_score` / `priorityScore`) to avoid breaking any React UI components.
