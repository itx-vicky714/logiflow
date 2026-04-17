# Design System: Glassmorphism Dark

## Theme Description
A premium, futuristic, dark-mode dashboard tailored for a logistics and supply chain SaaS platform in India. It leverages glassmorphism (frosted glass) effects to separate content layers cleanly without being visually overwhelming.

## Color Palette
- **Background:** Midnight Blue (`#0F172A`)
- **Primary Accent/Brand:** Vivid Purple (`#8B5CF6`)
- **Text Primary:** Pure White (`#FFFFFF`)
- **Text Secondary:** Slate Gray (`#94A3B8`)
- **Panel/Surface Background:** Frosted Glass (Midnight blue with 10-20% opacity and `backdrop-blur-lg`)
- **Panel Borders:** Very subtle translucent borders (`rgba(255,255,255,0.1)`)
- **Status Indicators:**
  - **On Time/Success:** Emerald Green (`#10B981`)
  - **Delayed/Critical:** Rose Red (`#E11D48`)
  - **In Transit/Info:** Deep Sky Blue (`#0EA5E9`)

## Typography
- **Font Family:** `Poppins`, sans-serif
- **Headings:** Semi-bold, clear, high contrast.
- **Body Text:** Regular weight, slightly muted using Text Secondary for readability against dark backgrounds.

## UI/UX Rules
1. **Glassmorphism:** Use `backdrop-filter: blur(16px)` along with a lightly opaque white/blue fill for all cards, floating menus, and modals to create depth.
2. **Neon Glows:** Apply very subtle box-shadows (glows) matching the accent color on active/hovered components, but avoid making it look like a pure "cyberpunk" theme. It should still look professional.
3. **Rounded Corners:** Use liberal border radius (`rounded-xl` or `rounded-2xl` in Tailwind) to soften the interface.
4. **Data Visualization:** Charts should use the primary and status colors. Avoid solid fills; use gradients in area charts that fade to transparent.
