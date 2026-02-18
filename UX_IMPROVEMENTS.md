# UX & Accessibility Enhancements (Phase 4 & 5)

## Audit Findings

- Small touch targets on mobile (under 44x44px).
- Table horizontal overflow on small screens.
- Poor readability in high-density data views.

## Changes Made

- **Responsive Design**:
  - Implemented card-based views for `Results` and `Timetable` on mobile.
  - Added horizontal scroll navigation for Day selection.
- **Accessibility**:
  - Updated `Button.js` to ensure 44px minimum height.
  - Added `aria-label` to all interactive elements.
  - Improved focus states and color contrast.
- **Visuals**:
  - Added backdrop blur and high-contrast text for better readability on varied backgrounds.

## Files Affected

- `components/ui/Button.js`
- `app/dashboard/results/page.js`
- `app/dashboard/timetable/page.js`

## Testing Performed

- Verified touch target sizes using browser dev tools.
- Tested mobile responsiveness across multiple breakpoints (320px to 1024px)
