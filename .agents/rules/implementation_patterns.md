---
name: Implementation Patterns - Full-Stack Sync
description: Technical patterns for achieving instant full-stack synchronization and strict data deletion.
---

# Technical Implementation Patterns

When applying the "Strict Full-Stack Sync & Code Cleanliness" guidelines, follow these established technical patterns:

## 1. Instant Frontend State Purge (Optimistic Updates)
Do not rely on `fetchData` or full page reloads after a mutation (e.g., Delete).
- **Pattern**: Pass an `onSuccess(id: string)` callback up to the parent component.
- **Action**: The parent component must instantly filter out the deleted ID from the React state memory (`setState(prev => prev.filter(item => item.id !== id))`).
- **Goal**: Zero loading flickers; the UI snaps instantly.

## 2. Database Hard Deletion
- **Pattern**: Execute a direct `DELETE FROM [table]` query in the backend. Do not use soft deletes (`isActive = false`) unless explicitly required by the user.
- **Cascading**: Rely on MySQL's `ON DELETE CASCADE` for foreign keys (like `employee_information_employees.userId`) to automatically obliterate all related child records across the database. Never leave orphaned rows.

## 3. UI Simplification (Bypassing Intermediate Screens)
- **Pattern**: If the user requests to bypass a list view and go straight to a form, do not just hide the list with CSS or a Modal overlay.
- **Action**: Completely delete the unused list-view code, states, and API calls from the React component. Transform the Modal into a native full-page inline component.
