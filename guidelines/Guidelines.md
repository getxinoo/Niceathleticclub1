# General Guidelines: Nice Athletic Club (React SPA)

* **Tech Stack:** React (Vite), TypeScript, Tailwind CSS, Framer Motion.
* **Architecture:** Build as a pure Client-Side SPA. The final build will be hosted on a standard PHP/MySQL Webspace (Checkdomain). **Do not use Next.js, App Router, Server Actions or Node.js backend logic.**
* **API:** Data fetching will happen via standard `fetch()` to a custom PHP API. Keep data logic separated in `lib/api.ts` or custom hooks.
* **Code Quality:** Keep file sizes small. Extract reusable UI elements into `src/components/ui`. Use Flexbox and Grid over absolute positioning.
* **Accessibility:** Ensure high contrast, visible focus states (`focus-visible`), and logical keyboard navigation.

--------------

# Design System Guidelines

Our design follows a premium, dark, and highly interactive "Web-App" feeling.

## 1. Colors & Theme
* **Dark Mode is Default:** The app is strictly dark mode. Use `bg-black`, `bg-[#050505]`, or `bg-[#121212]` for backgrounds.
* **Brand/Accent Color:** Magenta `#CA0C85`. Use this for primary buttons, active states, and subtle glowing effects. Do not overuse it; let it pop against the dark background.
* **Text Colors:** Use `text-white` for headings, `text-white/70` or `text-white/50` for body text to create visual hierarchy.

## 2. Typography
* **Headings (`Bebas Neue`):** Used for large, uppercase, impactful titles.
* **Body/UI (`Poppins` or `Inter`):** Used for readable paragraphs, buttons, and navigation.

## 3. Responsive & Mobile-First (App Feeling)
* **Touch Targets:** Any clickable element (buttons, links, icons) MUST have a minimum size of `44x44px` on mobile screens.
* **Navigation:** Desktop uses a sticky header. Mobile should feel like a native app (e.g., using bottom sheets or full-screen overlays).
* **Spacing:** Use generous padding (`py-24` on desktop, `py-16` on mobile) to let sections breathe.

## 4. Animations & Interactions (Framer Motion)
* **Micro-interactions:** Buttons should have a slight lift (`-translate-y-0.5`) and a glowing shadow on hover. Cards should elevate and reveal a subtle magenta border on hover.
* **Page Transitions:** Pages should fade in smoothly.
* **Accessibility (Crucial):** ALWAYS respect `prefers-reduced-motion`. If reduced motion is active, disable translations/scaling and only use simple opacity fades.

## 5. Components Specifications

### Buttons
* **Primary (Brand):** Background `#CA0C85`, white text. On hover: slight lift, brighter magenta, glowing shadow `shadow-[0_0_20px_rgba(202,12,133,0.4)]`.
* **Secondary (Outline):** Transparent background, thin white border `border-white/20`. On hover: border turns magenta or background becomes `white/10`.
* **Press State:** All buttons should have a satisfying `active:scale-[0.98]` press effect.

### Cards & Surfaces (Glassmorphism)
* For elevated sections (like pricing or team members), use a glassmorphism effect: `bg-white/[0.03] backdrop-blur-md border border-white/10`.
* Add a very subtle inner glow or top border reflection to make them look premium.