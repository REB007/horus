# Horus Frontend - Subtle Neobrutalism UI Design System

## 🎨 Design Philosophy

**Subtle Neobrutalism** takes the playful depth of neobrutalism and refines it with elegance. Think thin borders, **hard drop shadows**, muted colors, and smooth geometry. Our dark mode neobrutalism features:

- **Thin, elegant borders** (1-2px) in soft golden tones
- **Hard golden drop shadows** (offset, no blur) for clear depth
- **Rounded corners** (8-12px) for approachability
- **High contrast on dark** - clear visibility, coherent dark mode
- **Smooth animations** on hover and click
- **Layered depth** through hard shadow stacking
- **Refined typography** - clear, readable, sophisticated

## 🌑 Dark Mode Neobrutalism Palette

### Base Colors
- **Background**: `#0a0a0a` (near black)
- **Surface**: `#1a1a1a` (dark gray)
- **Surface Elevated**: `#2a2a2a` (lighter gray)

### Accent Colors
- **Primary (Golden)**: `#D4AF37` (soft gold)
- **Secondary (Golden Light)**: `#E8C547` (light gold)
- **Border Primary**: `rgba(212, 175, 55, 0.3)` (soft gold 30%)
- **Border Secondary**: `rgba(74, 74, 74, 0.3)` (soft gray 30%)

### Semantic Colors
- **Success/YES**: `#4ADE80` (soft green)
- **Error/NO**: `#F87171` (soft red)
- **Warning**: `#FBBF24` (soft amber)
- **Info**: `#60A5FA` (soft blue)

### Text Colors
- **Primary**: `#FFFFFF` (white)
- **Secondary**: `#CCCCCC` (light gray)
- **Muted**: `#888888` (gray)

## 🎭 Component Styles

### Cards
```css
- Border: 1px solid rgba(212, 175, 55, 0.4)
- Background: #1a1a1a
- Border-radius: 12px
- Shadow: 4px 4px 0px rgba(212, 175, 55, 0.6) (hard drop shadow)
- Hover: translate(-2px, -2px), shadow: 6px 6px 0px rgba(212, 175, 55, 0.7)
- Active: translate(1px, 1px), shadow: 2px 2px 0px rgba(212, 175, 55, 0.5)
- Transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)
```

### Buttons
```css
Primary (Golden):
- Border: 2px solid #0a0a0a
- Background: linear-gradient(135deg, #D4AF37, #E8C547)
- Text: #0a0a0a (near black)
- Border-radius: 8px
- Shadow: 3px 3px 0px #0a0a0a (hard drop shadow)
- Hover: translate(-1px, -1px), shadow: 4px 4px 0px #0a0a0a
- Active: translate(1px, 1px), shadow: 2px 2px 0px #0a0a0a

Secondary (Outlined):
- Border: 2px solid rgba(212, 175, 55, 0.6)
- Background: transparent
- Text: #D4AF37
- Border-radius: 8px
- Shadow: 3px 3px 0px rgba(212, 175, 55, 0.4)
- Hover: background: rgba(212, 175, 55, 0.1), shadow: 4px 4px 0px rgba(212, 175, 55, 0.5)
```

### Inputs
```css
- Border: 2px solid rgba(212, 175, 55, 0.3)
- Background: #0a0a0a
- Text: #FFFFFF
- Border-radius: 8px
- Shadow: inset 2px 2px 0px rgba(0, 0, 0, 0.5)
- Focus: border: 2px solid rgba(212, 175, 55, 0.7), shadow: 0 0 0 3px rgba(212, 175, 55, 0.2)
```

### Tabs/Toggle Buttons
```css
Inactive:
- Border: 2px solid rgba(212, 175, 55, 0.25)
- Background: transparent
- Text: #999999
- Border-radius: 8px
- Shadow: 2px 2px 0px rgba(212, 175, 55, 0.2)

Active:
- Border: 2px solid rgba(212, 175, 55, 0.6)
- Background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(232, 197, 71, 0.2))
- Text: #E8C547
- Border-radius: 8px
- Shadow: 3px 3px 0px rgba(212, 175, 55, 0.5)
- Transform: translate(-1px, -1px)
```

### Badges/Tags
```css
- Border: 2px solid (color-specific with 0.4 opacity)
- Background: semi-transparent (color with 0.15 opacity)
- Border-radius: 6px
- Shadow: 2px 2px 0px (color-specific with 0.3 opacity)
- Font: medium weight, normal case, small
```

### Progress Bars
```css
Container:
- Border: 2px solid rgba(212, 175, 55, 0.3)
- Background: #0a0a0a
- Height: 16px
- Border-radius: 8px
- Shadow: inset 2px 2px 0px rgba(0, 0, 0, 0.5)

Fill:
- Background: gradient or solid color
- Border-radius: 6px (slightly less than container)
- Border-right: 2px solid rgba(0, 0, 0, 0.3) (if not full)
```

## 🎬 Animations

### Hover Effects
```css
.neo-hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.neo-hover:hover {
  transform: translate(-2px, -2px);
  box-shadow: [increased hard shadow];
}
```

### Click/Active Effects
```css
.neo-active:active {
  transform: translate(1px, 1px);
  box-shadow: [reduced hard shadow];
  transition: all 0.1s ease;
}
```

### Entrance Animations
```css
.neo-entrance {
  animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInUp {
  0% { transform: translateY(10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

## 📐 Spacing & Layout

- **Border Width**: 1-2px (standard), 2px (emphasis)
- **Shadow Offset**: 3-4px (standard), 6px (large cards), 2px (small elements)
- **Shadow**: Hard drop shadows (no blur), offset only
- **Padding**: 16px (small), 24px (medium), 32px (large)
- **Gap**: 16px (tight), 24px (standard), 32px (loose)
- **Border Radius**: 8px (standard), 12px (large cards), 6px (small elements)

## 🔤 Typography

### Headings
- **H1**: 48px, font-weight: 700, text-shadow: 2px 2px 8px rgba(212, 175, 55, 0.3)
- **H2**: 32px, font-weight: 600, text-shadow: 1px 1px 6px rgba(212, 175, 55, 0.2)
- **H3**: 24px, font-weight: 600, text-shadow: 1px 1px 4px rgba(212, 175, 55, 0.15)

### Body
- **Large**: 18px, font-weight: 500
- **Regular**: 16px, font-weight: 400
- **Small**: 14px, font-weight: 400

### Special
- **Numbers/Stats**: font-weight: 600, monospace optional
- **Labels**: normal case, font-weight: 500, letter-spacing: 0.02em

## 🎯 Interactive States

### Default → Hover → Active
1. **Default**: Subtle shadow, no transform
2. **Hover**: Lift up (translateY(-2px)), increase shadow blur
3. **Active**: Press down (translateY(1px)), decrease shadow
4. **Focus**: Add soft glow ring in accent color

## 🎪 Special Elements

### Market Cards
- Thin golden border (1px, 40% opacity)
- Hard drop shadow (4px 4px 0px golden with 60% opacity)
- Border-radius: 12px
- Hover: lift up (-2px, -2px), increase shadow offset (6px 6px)
- Click: press down (1px, 1px), decrease shadow (2px 2px)
- Probability bar: thin borders, rounded (8px), hard shadows

### Header
- Thin bottom border (1px solid golden with 20% opacity)
- Logo with subtle text shadow
- Nav items with smooth hover effect
- Connect button: primary button style with gradient

### Trade Panels
- Soft layered shadows
- Tab buttons with subtle active state
- Input fields with gentle inset shadows
- Action buttons with smooth press effect

### Portfolio Cards
- Soft stacked shadows for depth
- Claim buttons with smooth hover
- Position cards with gentle hover lift

### Admin Panel
- Form inputs with thin borders
- Create button with soft emphasis shadow
- Resolve buttons with color-coded soft shadows
