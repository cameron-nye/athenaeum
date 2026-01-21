# Implementation Plan: Skylight Calendar-Style Redesign

## Requirements Restatement

Transform the Athenaeum family management app into a Skylight Calendar-inspired design with:

1. **Left sidebar navigation** with icon-based menu (mandatory)
2. **Clean, simple UI** - well-organized, minimal, intuitive
3. **Use ShadCN components** as the foundation
4. **Use MotionPrimitive components** for animations, especially the glow effect
5. **Display-first design** - users should be able to do everything from the wall-mounted Raspberry Pi display
6. **Multi-view calendar** with family member filtering (per Skylight screenshots)
7. **Chore cards** organized by family member with completion tracking

---

## Current State Analysis

### What Exists:

- Next.js 16 with App Router
- Tailwind CSS 4 with OKLCH "Zen Garden" color system
- Framer Motion for animations
- Custom components (no ShadCN currently installed)
- Supabase backend with calendar sync and chores
- Display mode for Raspberry Pi (1920x1080)
- User avatars, chore cards, calendar views

### What Needs to Change:

- **No sidebar navigation** - currently uses top header links
- **No ShadCN** - all custom components
- **No MotionPrimitives** - using raw Framer Motion
- **Cluttered UI** - multiple colored buttons, busy headers
- **Dashboard layout** is basic - not Skylight-inspired

---

## Implementation Phases

### Phase 1: Foundation Setup (Dependencies & Component Library)

**1.1 Install ShadCN UI**

- Initialize ShadCN with `npx shadcn@latest init`
- Configure for Tailwind CSS 4 compatibility
- Select components: Button, Card, Avatar, Badge, Sheet, Dialog, Dropdown, Input, Tabs, Tooltip

**1.2 Install MotionPrimitives**

- `npm install motion-primitives` (or copy components manually)
- Add GlowEffect component
- Add TextEffect for animated text

**1.3 Update Color System**

- Adapt Skylight's soft pastel palette:
  - Light blue cards (member columns)
  - Soft orange/peach accent for active items
  - Gray icons for sidebar
  - Clean white/cream background

---

### Phase 2: Layout Architecture

**2.1 Create AppShell Layout**

- `components/layout/AppShell.tsx` - Main layout wrapper
- Left sidebar (64-80px width, icon-only by default)
- Main content area (flexible)
- Optional right panel for details

**2.2 Create Sidebar Component**

- `components/layout/Sidebar.tsx`
- Icons for: Calendar, Chores, Rewards, Meals, Photos, Lists, Sleep, Settings (per Skylight)
- Active state indicator (highlight bar or background)
- Responsive: expands to show labels on hover/focus
- Glow effect on active icon

**2.3 Create Header Component**

- `components/layout/Header.tsx`
- Family name + time + weather (optional)
- Family member avatar row with quick filters
- "Filter" and "Today" controls (per screenshot)

---

### Phase 3: Core UI Components (ShadCN + Custom)

**3.1 Family Member Card Component**

- `components/ui/MemberCard.tsx`
- Vertical column layout per family member
- Avatar at top with initial/photo
- Progress indicator (e.g., "0/3" chores done)
- Tabs: Morning, Evening, Chores (per screenshot)
- Soft rounded background color

**3.2 Chore Item Component**

- `components/ui/ChoreItem.tsx`
- Checkbox/completion toggle
- Title with optional emoji
- Due date/time
- "Late" indicator in orange/red
- Subtle background color per status

**3.3 Calendar Event Card**

- `components/ui/EventCard.tsx`
- Color-coded by calendar source
- Time + title
- Member avatar indicator
- Rounded corners, subtle shadow

**3.4 Glow Button Wrapper**

- `components/ui/GlowButton.tsx`
- Wraps ShadCN Button with MotionPrimitive glow
- Used for primary actions (Add, Complete, etc.)

---

### Phase 4: Main Views Redesign

**4.1 Dashboard/Home View**

- `app/(dashboard)/page.tsx` (or new home route)
- Grid of family member columns (Skylight "Tasks" view)
- Each column shows that member's chores for today
- Horizontal scroll for many members
- FAB (floating action button) with glow for "Add"

**4.2 Calendar View**

- `app/(dashboard)/calendar/page.tsx`
- Week view by default (5-day visible like Skylight)
- Hourly timeline on left
- Events color-coded by calendar/member
- Family member avatar filter bar at top
- "Magic Import" equivalent for calendar sync

**4.3 Chores Management View**

- Redesign `app/(dashboard)/chores/page.tsx`
- Grid of member cards with their assigned chores
- Quick toggle completion
- Points display
- "Any day" flex chores section

**4.4 Settings View**

- `app/(dashboard)/settings/page.tsx`
- Clean, grouped settings
- Display management (existing)
- Family member management
- Calendar connections

---

### Phase 5: Display Mode Enhancements

**5.1 Display Layout Update**

- Redesign `app/(display)/[displayId]/DisplayClient.tsx`
- Match sidebar + main content layout
- Optimize touch targets for wall display
- Keep existing burn-in prevention

**5.2 Touch-Optimized Controls**

- Large touch targets (min 48px)
- Swipe gestures for navigation
- Modal dialogs for input (on-screen keyboard support)
- Quick-complete chores with tap

**5.3 Display Settings Panel**

- In-app settings accessible from display
- No need for separate device for basic config
- PIN protection for sensitive actions

---

### Phase 6: Polish & Animation

**6.1 Glow Effects**

- Add glow to:
  - Active sidebar icon
  - Primary action buttons
  - Completed chore celebration
  - Selected calendar event

**6.2 Micro-interactions**

- Checkbox completion animation
- Card hover/tap feedback
- Page transition animations
- List item stagger entrance

**6.3 Dark Mode Refinement**

- Ensure glow effects work in dark mode
- Adjust colors for OLED-friendly (if applicable)

---

## File Structure (New/Modified)

```
components/
├── layout/
│   ├── AppShell.tsx          # NEW - Main layout wrapper
│   ├── Sidebar.tsx           # NEW - Icon navigation sidebar
│   ├── Header.tsx            # NEW - Top bar with family/time
│   └── MobileNav.tsx         # NEW - Bottom nav for mobile
├── ui/
│   ├── button.tsx            # ShadCN
│   ├── card.tsx              # ShadCN
│   ├── avatar.tsx            # ShadCN (replaces UserAvatar?)
│   ├── badge.tsx             # ShadCN
│   ├── dialog.tsx            # ShadCN
│   ├── dropdown-menu.tsx     # ShadCN
│   ├── input.tsx             # ShadCN
│   ├── tabs.tsx              # ShadCN
│   ├── tooltip.tsx           # ShadCN
│   ├── GlowButton.tsx        # NEW - Button with glow effect
│   ├── MemberCard.tsx        # NEW - Family member column card
│   ├── ChoreItem.tsx         # NEW - Single chore list item
│   └── EventCard.tsx         # NEW - Calendar event card
├── motion/
│   └── glow-effect.tsx       # MotionPrimitive - Glow component
app/
├── (dashboard)/
│   ├── layout.tsx            # MODIFY - Add AppShell
│   ├── page.tsx              # NEW - Home dashboard (member columns)
│   ├── calendar/
│   │   └── page.tsx          # MODIFY - Week view redesign
│   ├── chores/
│   │   └── page.tsx          # MODIFY - Member-centric view
│   └── settings/
│       └── page.tsx          # MODIFY - Clean grouped settings
├── (display)/
│   └── [displayId]/
│       └── DisplayClient.tsx # MODIFY - Add sidebar, touch controls
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@radix-ui/react-avatar": "^1.x",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-dropdown-menu": "^1.x",
    "@radix-ui/react-tabs": "^1.x",
    "@radix-ui/react-tooltip": "^1.x",
    "@radix-ui/react-slot": "^1.x"
  }
}
```

Note: ShadCN components will be copied directly into the project (not a package dependency).

---

## Risk Assessment

| Risk                              | Level  | Mitigation                                      |
| --------------------------------- | ------ | ----------------------------------------------- |
| ShadCN + Tailwind 4 compatibility | MEDIUM | Test during init, may need config tweaks        |
| Display touch responsiveness      | MEDIUM | Test on actual Raspberry Pi hardware            |
| Breaking existing functionality   | LOW    | Incremental refactoring, preserve APIs          |
| Color system mismatch             | LOW    | Map Skylight colors to OKLCH values             |
| Performance on Pi display         | MEDIUM | Profile animations, reduce complexity if needed |

---

## Estimated Complexity: HIGH

This is a significant UI/UX overhaul touching:

- Layout architecture (new sidebar system)
- Component library (ShadCN integration)
- Animation system (MotionPrimitives)
- Multiple page redesigns
- Display mode enhancements

**Recommendation:** Implement in phases, testing each phase before moving on. Phase 1-2 (foundation + layout) should be completed first to establish the new architecture before redesigning individual views.

---

## Questions for Clarification

1. **Weather display**: Should we integrate weather API for the header like Skylight shows?
2. **Meals/Photos/Lists/Sleep**: Are these features planned or should we hide those sidebar icons?
3. **Rewards system**: Is the points/leaderboard system sufficient, or do you want Skylight-style "Rewards" tracking?
4. **Color preferences**: Stick with the current "Zen Garden" palette or shift closer to Skylight's blue/orange?
5. **Mobile support**: Should the sidebar collapse to bottom navigation on phones?

---
