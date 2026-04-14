

## Client Portal System — Implementation Plan

### Overview
Two new pages integrated into the existing dark teal design system: a **Portal Access** page (`/portal`) and a **Proposal Viewer** page (`/proposta`). Both use mock data with local state — no backend integration.

### What will be created/modified

**1. `src/pages/Portal.tsx`** — Access Code Page
- Centered glassmorphism card (dark bg, `backdrop-blur`, subtle teal border glow)
- ACQ logo at top
- Input field for 6-8 digit access code (styled with existing Input component)
- Luxurious "Access Proposal" button with glow-teal hover effect and scale animation
- On submit, navigates to `/proposta` (any code accepted — mock mode)
- Minimal layout, no navbar distractions — just a back link to home

**2. `src/pages/Proposta.tsx`** — Proposal Viewer Page
- **Header:** Client name (mock: "John Smith — Acme Corp") + premium countdown timer ("02:14:59 remaining") with teal accent styling, animated digits
- **Body:** Large container/iframe placeholder with elegant border, text "Client proposal will be rendered here" — ready for future HTML injection
- **Footer:** Fixed bottom bar with strong "Talk to a Consultant" button (WhatsApp-ready, links to `wa.me/5562999953623`)
- Immersive layout — no standard navbar, minimal chrome
- Timer uses `useState` + `useEffect` countdown from a mock expiration time

**3. `src/App.tsx`** — Add routes
- `/portal` → Portal page
- `/proposta` → Proposta page

**4. `src/components/Navbar.tsx`** — Add "Client Area" link
- Add a `Link` (react-router-dom) styled subtly before the "Get in Touch" button, labeled "Client Area", pointing to `/portal`
- Also add it to the mobile menu

### Design tokens used
- Same `bg-card`, `border-border`, `text-primary`, `glow-teal`, `text-gradient-teal` utilities
- Framer Motion for entrance animations
- Space Grotesk headings, Montserrat body text

