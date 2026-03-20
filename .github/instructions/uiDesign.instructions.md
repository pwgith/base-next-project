# CoopRun Design System

## Overview

The UI design insteuctions provides a comprehensive, mobile-first responsive design foundation built with Tailwind CSS. It emphasizes modern aesthetics, excellent user experience, and accessibility.

## Key Features

- **Mobile-First Responsive Design**: Optimized for mobile devices with progressive enhancement for larger screens
- **Modern Glass-morphism Effects**: Subtle backdrop blur and transparency effects
- **Professional Typography**: Inter font family with optimized font loading
- **Consistent Color Palette**: Carefully selected colors with proper contrast ratios
- **Smooth Animations**: Tasteful micro-interactions and transitions
- **Accessible Components**: WCAG compliant form elements and interactions

## Design Principles

### 1. Mobile-First
All components are designed starting from mobile (320px) and scale up to larger screens.

### 2. Visual Hierarchy
- Clear typography scale (text-sm to text-3xl)
- Proper spacing system (space-y-* classes)
- Strategic use of color and contrast

### 3. Consistency
- Standardized component classes
- Consistent spacing and sizing
- Unified color palette

### 4. Accessibility
- Proper ARIA labels
- Keyboard navigation support
- High contrast ratios
- Screen reader friendly

## Component Library

### Layout Components

#### `.page-container`
Full-height page wrapper with flex layout.

#### `.hero-section`
Main content area with gradient background and centering.

#### `.hero-content`
Container for hero content with proper spacing.

### Form Components

#### `.form-container`
Full-screen form wrapper with gradient background.

#### `.form-card`
Elevated card container for forms with subtle shadow and blur effects.

#### `.form-header`
Centered header section for forms.

#### `.form-title`
Large, bold title with gradient text effect.

#### `.form-subtitle`
Descriptive subtitle text with proper spacing.

#### `.form-group`
Container for form field groupings.

#### `.form-label`
Consistent label styling for form inputs.

#### `.form-input`
Standard input field with focus states and error handling.

#### `.form-error`
Error message styling with icon and proper color.

#### `.form-help`
Helper text styling for additional guidance.

### Button Components

#### `.btn`
Base button class with transitions and focus states.

#### `.btn-primary`
Primary action button with blue gradient.

#### `.btn-secondary`
Secondary button with outlined style.

#### `.btn-success`
Success button with green styling.

#### `.btn-danger`
Danger button with red styling.

#### Size Variants
- `.btn-sm` - Small button
- `.btn-lg` - Large button

### Alert Components

#### `.alert`
Base alert container with rounded corners.

#### Alert Variants
- `.alert-error` - Error notifications (red)
- `.alert-success` - Success notifications (green)
- `.alert-info` - Informational notifications (blue)
- `.alert-warning` - Warning notifications (amber)

### Feature Components

#### `.feature-grid`
Responsive grid for feature cards.

#### `.feature-card`
Individual feature card with hover effects.

#### `.feature-icon`
Icon container with background color.

#### `.feature-title`
Feature title styling.

#### `.feature-description`
Feature description text.

### Success States

#### `.success-container`
Container for success pages.

#### `.success-card`
Success message card styling.

#### `.success-icon`
Success icon with circular background.

### Loading States

#### `.loading-spinner`
Animated loading spinner.

#### `.loading-container`
Container for loading states.

## Color Palette

### Primary Colors
- **Blue 600**: Main brand color (`#2563eb`)
- **Slate 900**: Primary text (`#0f172a`)
- **Slate 600**: Secondary text (`#475569`)

### Semantic Colors
- **Emerald 600**: Success (`#059669`)
- **Red 600**: Error/Danger (`#dc2626`)
- **Amber 600**: Warning (`#d97706`)

### Background Colors
- **White**: Card backgrounds (`#ffffff`)
- **Slate 50**: Light backgrounds (`#f8fafc`)
- **Blue 50**: Accent backgrounds (`#eff6ff`)

## Typography

### Font Family
- **Primary**: Inter (loaded via Google Fonts)
- **Fallback**: system-ui, -apple-system, sans-serif

### Text Scales
- **Hero Title**: `text-4xl sm:text-5xl lg:text-6xl`
- **Page Title**: `text-2xl sm:text-3xl`
- **Section Title**: `text-xl`
- **Body Text**: `text-base`
- **Small Text**: `text-sm`
- **Helper Text**: `text-xs`

## Spacing System

### Container Spacing
- **Page Padding**: `px-4 sm:px-6 lg:px-8`
- **Section Spacing**: `space-y-6` or `space-y-8`
- **Form Spacing**: `space-y-4` or `space-y-5`

### Component Spacing
- **Button Padding**: `px-6 py-3`
- **Input Padding**: `px-4 py-3`
- **Card Padding**: `p-6 sm:p-8`

## Responsive Breakpoints

### Mobile First Approach
- **Base**: 320px and up (mobile)
- **sm**: 640px and up (large mobile/small tablet)
- **md**: 768px and up (tablet)
- **lg**: 1024px and up (desktop)
- **xl**: 1280px and up (large desktop)

### Common Responsive Patterns
```css
/* Mobile first grid */
.feature-grid {
  @apply grid gap-6 md:grid-cols-2 lg:grid-cols-3;
}

/* Responsive text sizing */
.hero-title {
  @apply text-4xl sm:text-5xl lg:text-6xl;
}

/* Responsive button layout */
.btn-group {
  @apply flex flex-col sm:flex-row gap-4;
}
```

## Animations

### Available Animations
- **fade-in**: Gentle fade in with slight vertical movement
- **slide-up**: Quick slide up animation
- **bounce-gentle**: Subtle bouncing animation

### Usage
```html
<div class="animate-fade-in">Content</div>
<div class="animate-slide-up">Quick content</div>
```

## Usage Guidelines

### Do's
- Use consistent spacing from the system
- Apply proper semantic colors
- Ensure adequate contrast ratios
- Test on mobile devices first
- Use appropriate animation timing

### Don'ts
- Don't use arbitrary values outside the system
- Don't combine too many animation effects
- Don't ignore mobile experience
- Don't use poor contrast color combinations

## Implementation Examples

### Basic Form
```html
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 sm:px-6 lg:px-8 py-8">
  <div class="w-full max-w-lg bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50">
    <div class="text-center mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Title</h1>
      <p class="text-slate-600 text-sm mt-2">Subtitle</p>
    </div>
    <form class="space-y-6">
      <div class="space-y-1.5">
        <label class="block text-sm font-medium text-slate-700">Email</label>
        <input class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" type="email" />
      </div>
      <button class="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25 w-full">Submit</button>
    </form>
  </div>
</div>
```

### Feature Grid
```html
<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50 hover:shadow-xl transition-shadow duration-200">
    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
      <svg>...</svg>
    </div>
    <h3 class="text-lg font-semibold text-slate-900">Title</h3>
    <p class="text-sm text-slate-600 mt-1">Description</p>
  </div>
</div>
```

## UI Mockups

### Purpose
Every UI page **must** have a standalone HTML mockup file that stakeholders can open in a browser to review the look and feel before any application code is written. No app framework code (React, Vue, Angular, etc.) should be used — only plain HTML, Tailwind CSS (via CDN), and optional vanilla JavaScript for interactivity that helps convey the intended user experience (e.g., toggling states, sample calculations, tab switching).

### File Location & Naming
- All design assets live under `./design/`
- UI mockups live under `./design/ui/`
- **One HTML file per UI page** (e.g., the home page mockup is `./design/ui/homePage.html`)
- Filenames use **camelCase** per the project coding standard (e.g., `loginPage.html`, `dashboardPage.html`, `problemSolver.html`)

### Mockup File Structure
Each mockup HTML file should follow this template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[Page Name] — UI Mockup</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Only plain CSS here: keyframe animations, pseudo-class states, etc. */
    /* Do NOT use @apply — compound selectors and pseudo-selectors do not work with the Tailwind CDN. */
    /* Instead, apply Tailwind utility classes directly on HTML elements (inline classes). */
  </style>
</head>
<body class="font-['Inter',system-ui,-apple-system,sans-serif]">
  <!-- Page markup using Tailwind utility classes directly on elements -->

  <script>
    // Optional: vanilla JS for interactive mockup behaviour
  </script>
</body>
</html>
```

### Mockup Requirements

| Requirement | Details |
|---|---|
| **Self-contained** | Each file must be viewable by opening it directly in a browser — no build step, no server required. |
| **Inline Tailwind classes** | Apply Tailwind utility classes directly on HTML elements. **Do not** use `@apply` in `<style>` blocks — compound selectors (e.g., `.form-input.error`) and pseudo-selectors (e.g., `:not(.active)`) are not processed by the Tailwind CDN. The `<style>` block should only contain plain CSS such as keyframe animations or pseudo-class state overrides that cannot be expressed as utility classes. |
| **Tailwind via CDN** | Include `<script src="https://cdn.tailwindcss.com"></script>` for utility classes. |
| **Inter font** | Load Inter from Google Fonts as specified in the Typography section. |
| **Responsive** | Mockup must demonstrate mobile-first responsive behaviour matching the breakpoints in this document. |
| **Sample data** | Populate the page with realistic placeholder content (not lorem ipsum) so reviewers can judge layout with real-world text lengths. |
| **Vanilla JS only** | JavaScript is permitted only to simulate interactions (show/hide, state toggles, sample output). No frameworks or libraries beyond Tailwind CDN. |
| **No application logic** | Mockups are for visual review only. Do not implement real API calls, routing, or business logic. |
| **Accessibility** | Follow the accessibility guidelines in this document (ARIA labels, keyboard navigation, contrast). |

### Review Workflow
1. Create the mockup HTML file in `./design/ui/`.
2. Open the file in a browser to verify appearance and responsiveness.
3. Share with stakeholders for visual review and feedback.
4. Iterate on the mockup until approved.
5. Once approved, use the mockup as the reference when implementing the actual application page.

## Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## Performance

- Optimized CSS with Tailwind's purging
- Efficient font loading with `font-display: swap`
- Minimal animation overhead
- Reduced paint and layout thrashing

## Accessibility

- WCAG 2.1 AA compliance
- Proper semantic HTML
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus indicators on all interactive elements