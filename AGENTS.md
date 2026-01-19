# AGENTS.md — Almacén Stock Control System

## Project Overview
Web-based inventory management and internal ordering system for demo day. Spanish-language UI with role-based access (Requester/Admin). No auth in MVP.

---

## Build, Lint, Test Commands

*(To be populated after tech stack selection)*

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run type check
npm run type-check

# Run all tests
npm test

# Run single test
npm test -- --testNamePattern="test-name-here"
# OR
npm test -- path/to/test.spec.ts
```

---

## Tech Stack Decisions Needed

Before implementing, decide:
- **Framework**: Next.js / React Router + Vite / ?
- **Styling**: Tailwind CSS (mentioned in PRD)
- **State Management**: React Context / Zustand / ?
- **Database**: SQLite for MVP / ?

---

## Code Style Guidelines

### General Principles
- **Language**: All UI strings, user-facing content in Spanish
- **Type Safety**: Strict TypeScript. No `any`, `@ts-ignore`, `@ts-expect-error`
- **Simplicity**: MVP for demo → prioritize clarity over abstractions
- **Consistency**: Once a pattern is established, follow it throughout

### File Structure
```
src/
  app/              # Routing (if Next.js) or pages/
  components/       # Reusable UI components
  lib/              # Utilities, API clients
  types/            # TypeScript interfaces/types
  data/             # Mock data for MVP (no real DB)
```

### Naming Conventions
- **Components**: PascalCase (`PedidoForm.tsx`, `InventarioTable.tsx`)
- **Utilities**: camelCase with verb prefix (`formatDate`, `calculateStock`)
- **Constants**: UPPER_SNAKE_CASE (`PRIMARY_COLOR`, `STATUS_PENDIENTE`)
- **Files**: Match export name (component exports PedidoForm → file name PedidoForm.tsx)

### Import Order
1. External libraries (react, next, etc.)
2. Internal modules (components, lib, types)
3. Relative imports
4. CSS files (if any)

```typescript
import React, { useState } from 'react'
import { Button } from '@/components/ui'
import { Pedido, Item } from '@/types'
import styles from './PedidoForm.module.css'
```

### TypeScript Patterns
- Define types early in `types/` directory
- Use interfaces for object shapes, types for unions/enums
- Export types for reuse across components

```typescript
// types/index.ts
export type PedidoStatus = 'pendiente' | 'entregado'

export interface Pedido {
  id: string
  area: string
  status: PedidoStatus
  createdAt: Date
  items: PedidoItem[]
}

export interface Item {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stock_actual: number
  stock_minimo: number
}
```

### Error Handling
- Never empty catch blocks
- Log errors for debugging in MVP
- Show user-friendly Spanish messages

```typescript
try {
  await crearPedido(pedido)
} catch (error) {
  console.error('Error al crear pedido:', error)
  // Show user-friendly alert in Spanish
  alert('No se pudo crear el pedido. Intente de nuevo.')
}
```

---

## Design System

### Color Palette
```css
--primary: #10b981      /* Emerald green - main actions */
--secondary: #14b8a6    /* Teal - secondary actions */
--neutral: gray-scale   /* Text, borders, backgrounds */
--accent: white, light-gray
```

### Typography
- Font: **Inter** (load via Google Fonts or Tailwind)
- Clear H1–H6 hierarchy
- Responsive sizing

### Components
- Tailwind spacing scale consistent
- Rounded corners (default: `rounded-md`)
- Soft shadows for depth
- Button variants:
  - Primary (emerald green)
  - Secondary (teal)
  - Destructive (red, if needed)

### UI Guidelines
- **Primary actions**: Use emerald green buttons
- **Secondary actions**: Use teal buttons
- **Alert states**: Yellow/Red badges for low stock
- **Status indicators**: Badge component with color coding

---

## Architecture Notes

### Role-Based Routes
- Requester: `/requester/pedido`, `/requester/mis-pedidos`
- Admin: `/admin/pedidos`, `/admin/inventario`
- Home: `/` (role selector)

### Data Flow (MVP - No Backend)
- Use React Context or Zustand for state management
- Mock data in `data/` directory
- LocalStorage optional for persistence

### Key Workflows
1. **Create Order**: Requester selects items → `POST` (mock) → status `pendiente`
2. **Deliver Order**: Admin clicks "Marcar como entregado" → stock decrements → status `entregado`
3. **Low Stock Alert**: Check `stock_actual <= stock_minimo` → visual highlight

---

## Testing Strategy

*(To be updated based on test framework choice)*

- E2E tests for critical user flows (Playwright recommended)
- Component tests for key interactions
- Spanish text assertions in tests

---

## Before Implementing New Features

1. Check `activity.md` for current task
2. Verify feature aligns with PRD
3. Follow existing component patterns
4. Use design system colors and typography
5. Write tests for critical flows
6. Update `activity.md` after completion

---

## Notes

- This is an MVP for demo day → prioritize working functionality over optimization
- All Spanish in UI, code can use English technical terms
- No auth in MVP → role selection via UI
- Ready for post-demo: real auth, database, IA features
