---
name: Strict Full-Stack Sync & Code Cleanliness
description: Core Architectural Guidelines for full-stack sync, zero stale data, continuous code maintenance, and strict modularity.
---

# Core Architectural Guideline: Strict Full-Stack Sync & Code Cleanliness

Please strictly adhere to the following development standards moving forward. Keep these rules in mind for every single update, deletion, or addition:

1. **Instant Full-Stack Synchronization** 
Whenever data (like an employee record) is added, deleted, or modified, the change must reflect automatically and instantly across the frontend UI, backend logic, and MySQL database.

2. **Zero Stale Data** 
When making updates, ensure all old, overwritten, or irrelevant data is completely wiped from the database. Never leave obsolete records behind.

3. **Continuous Code Maintenance**
If a feature is updated or rewritten, you must instantly delete the old code. The codebase must remain 100% clean, optimized, and free of dead code at all times.

4. **Strict Modular Updates**
Any new code or modifications must be placed exactly in their designated, modular folders and files. Maintain the highly organized folder structure we established without exception.

**Summary**: The system architecture must remain exceptionally neat, strictly modular, and perfectly synced across the frontend and backend at all times. This standard is permanently maintained.
