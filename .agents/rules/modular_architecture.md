---
name: Modular Architecture Enforcement
description: Strict rules for developing new UI features, requiring component segregation and dedicated directories.
---

# Modular Architecture Rules

When developing any new features, screens, or modules for this system, you **MUST** strictly adhere to the following modular architecture. **Do not create monolithic files.**

## 1. Directory Structure
Every distinct feature or major screen must have its own dedicated directory under `frontend/src/modules/`.

Example:
```
frontend/src/modules/[module-name]/
├── pages/
│   └── MainScreen.tsx
├── components/
│   ├── SubComponentA.tsx
│   ├── SubComponentB.tsx
│   └── tabs/
│       ├── TabOne.tsx
│       └── TabTwo.tsx
├── hooks/
│   └── use[ModuleName].ts (if applicable)
└── utils/ (if applicable)
```

## 2. Component Segregation
- **Pages (`pages/`)**: Should act as containers. They should fetch data, manage high-level state, and orchestrate the layout using child components.
- **Components (`components/`)**: The actual UI logic (tables, cards, modals, forms, tabs) must be broken down into separate files inside the `components` directory.
- **Never** write a file that exceeds 300-400 lines of complex UI if it can be broken down into logical sub-components.

## 3. Reusability
- If a component is used across multiple modules (e.g., generic buttons, inputs, generic modals), place it in `frontend/src/components/ui/` or `frontend/src/components/`.
- If a component is specific only to one module, keep it scoped within that module's `components/` directory.

> [!IMPORTANT]
> Any violation of this rule (e.g., placing all logic for a new dashboard into a single 1000-line `Dashboard.tsx` file) is strictly prohibited. Always design the component tree before writing the code.
