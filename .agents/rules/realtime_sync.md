---
name: Real-Time Code & Database Synchronization
description: Strict rule to ensure complete replacement of old code/data and zero leftovers during updates.
---

# Strict Rule: Real-Time Code & Database Synchronization

Please keep this firmly in mind for all future development: the moment any change or update is made within the system, it must immediately be synchronized across both the codebase and the database.

## 1. Complete Replacement
Whenever an update occurs, the old code logic and the outdated database records must be completely erased and directly replaced by the new updates.

## 2. Zero Leftovers
Never leave old data, obsolete database rows, or commented-out old code behind when pushing an update. The system must always reflect only the newest, updated state.
