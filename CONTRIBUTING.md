# Contributing to BJMP Imus City Jail Visitation System

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. **Fork and Clone**: Clone the repository to your local machine
2. **Install Dependencies**: Run `npm install`
3. **Set Up Environment**: Create `.env.local` with required API keys (see `.env.example`)
4. **Start Development**: Run `npm run dev`

## Development Guidelines

### Code Style

- **TypeScript**: Use strict type checking; avoid `any` types
- **React**: Use functional components with hooks
- **Naming**: Use descriptive, PascalCase for components, camelCase for functions/variables
- **Comments**: Add comments for complex logic, not for obvious code

### Component Structure

New components should follow this pattern:

```tsx
import React from 'react';
import { SomeType } from '../types';
import { SomeIcon } from 'lucide-react';

interface ComponentProps {
  // Define props
}

export const MyComponent: React.FC<ComponentProps> = ({ ...props }) => {
  // Component logic
  return (
    // JSX
  );
};
```

### File Organization

```
src/components/
├── FeatureName/
│   ├── ComponentName.tsx
│   ├── SubComponent.tsx
│   └── index.ts (optional, for exports)
```

### Import Paths

Use consistent relative paths:
```tsx
// Good
import { UserProfile } from '../../types';
import { BJMP_JAIL_FACILITIES } from '../../constants/bjmpData';

// Avoid
import { UserProfile } from '../../../types';
```

## Before Submitting

### Testing

1. **Type Check**: Run `npm run lint` to check TypeScript errors
2. **Manual Testing**: Test all user flows affected by your changes
3. **Browser Testing**: Test on the target browser versions

### Code Review Checklist

- [ ] No TypeScript errors
- [ ] Follows project naming conventions
- [ ] Components are properly organized
- [ ] Imports use correct relative paths
- [ ] Tailwind CSS classes for styling
- [ ] No console errors or warnings
- [ ] Responsive design considered

### Commit Messages

Use clear, descriptive commit messages:
```
✨ Add: New feature description
🐛 Fix: Bug fix description
📝 Docs: Documentation update
♻️ Refactor: Code refactoring
🎨 Style: Code style improvements
```

## Common Tasks

### Adding a New Component

1. Create folder in `/src/components/` under appropriate feature
2. Create `ComponentName.tsx` file
3. Define TypeScript interfaces in `/src/types/index.ts` if needed
4. Use Tailwind CSS for styling
5. Export from component file

### Adding New Types

1. Add type definitions to `/src/types/index.ts`
2. Use descriptive names for interfaces
3. Add JSDoc comments for complex types

### Adding Constants or Mock Data

1. Add to `/src/constants/bjmpData.ts`
2. Use UPPER_SNAKE_CASE for const names
3. Document the purpose of the constant

## Troubleshooting

### Import Errors
- Check file paths are relative to current file location
- Verify file extensions (.ts, .tsx)
- Ensure imports match export names

### Type Errors
- Run `npm run lint` to see detailed errors
- Check type definitions in `/src/types/index.ts`
- Use TypeScript strict mode to catch issues early

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: delete `.vite` folder
- Restart dev server: `npm run dev`

## Need Help?

- Check existing code for examples
- Refer to component documentation in JSDoc comments
- Review project structure in `PROJECT_STRUCTURE.md`
- Look at similar implemented features

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Ask questions if unclear
- Help others understand the codebase

Happy coding! 🚀
