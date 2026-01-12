# Fineract UI Theme System

Comprehensive theming documentation for the Fineract UI built with shadcn/ui, Tailwind CSS v4, and React 19.

## Overview

This theme system is specifically designed for financial applications with:
- **Warm Orange** (#FF8A00) primary color for a modern dashboard aesthetic
- **Neutral Palette** with soft warm grays for surfaces and dividers
- **Semantic Colors** for financial states (success, warning, error)
- **Dark Mode** with deep slate backgrounds (#0F1218, #151B24)
- **WCAG 2.1 Level AA** compliant contrast ratios

## Color Palette

### Light Mode

#### Primary Colors
- **Primary Orange**: `#FF8A00`
  - Used for: Primary buttons, links, active states, brand elements
  - Text: `#FFFFFF`

#### Semantic Colors
- **Success Green**: `#22C55E`
  - Used for: Positive balances, confirmations, successful transactions
  - Text: `#FFFFFF`

- **Warning Amber**: `#F59E0B`
  - Used for: Pending states, warnings, caution messages
  - Text: `#1F2937`

- **Error Red**: `#EF4444`
  - Used for: Negative balances, errors, deletions
  - Text: `#FFFFFF`

- **Info Blue**: `#60A5FA`
  - Used for: Informational messages, secondary actions
  - Text: `#FFFFFF`

#### Neutral Scale
- **50**: `#FFFFFF` - Card surfaces
- **100**: `#F6F7FB` - Page background
- **200**: `#EEF1F6` - Background gradient base
- **300**: `#E6E9EF` - Borders/dividers
- **500**: `#6B7280` - Muted text
- **900**: `#141621` - Primary text

### Dark Mode (Exact Colors)

#### Base Colors
- **Background**: `#0F1218`
- **Surface/Card**: `#151B24`
- **Text Light**: `#F8FAFC`
- **Text Secondary**: `#94A3B8`

#### Primary & Semantic Colors
- **Primary**: `#FF9A1F`
- **Success/Accent**: `#34D399`
- **Warning**: `#FBBF24`
- **Error**: `#F87171`
- **Info**: `#7DD3FC`

#### UI Elements
- **Dividers & Borders**: `#242C3A`
- **Focus Ring**: `#FF9A1F` (matches primary)

## Usage Examples

### Tailwind CSS Classes

```tsx
// Primary button
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Transfer Funds
</Button>

// Success badge
<Badge className="bg-success text-success-foreground">
  Approved
</Badge>

// Warning alert
<Alert className="border-warning bg-warning/10 text-warning-foreground">
  Payment pending
</Alert>

// Error message
<div className="text-destructive">
  Transaction failed
</div>

// Muted text
<p className="text-muted-foreground">
  Account number: 1234567890
</p>
```

### Financial Data Display

```tsx
// Always use tabular numbers for amounts
<div className="tabular-nums font-mono text-2xl font-bold">
  $42,891.50
</div>

// Positive balance (green)
<span className="text-success font-semibold tabular-nums">
  +$1,234.56
</span>

// Negative balance (red)
<span className="text-destructive font-semibold tabular-nums">
  -$567.89
</span>

// Currency amounts
<div className="amount-value">
  {formatCurrency(balance)}
</div>
```

### Cards and Surfaces

```tsx
// Light elevated card
<Card className="bg-card border-border">
  <CardContent>
    Content here
  </CardContent>
</Card>

// Dark mode automatically adjusts
<div className="dark">
  <Card> {/* Automatically uses dark theme colors */}
    Content
  </Card>
</div>
```

### Charts and Data Visualization

```tsx
import { LineChart, Line } from 'recharts';

<LineChart data={data}>
  <Line
    dataKey="balance"
    stroke="var(--chart-1)"
    strokeWidth={2}
  />
  <Line
    dataKey="income"
    stroke="var(--chart-3)"
    strokeWidth={2}
  />
  <Line
    dataKey="expenses"
    stroke="var(--chart-5)"
    strokeWidth={2}
  />
</LineChart>
```

## CSS Variables Reference

### Base Colors
```css
--background         /* Page background */
--foreground         /* Main text color */
--card              /* Card background */
--card-foreground   /* Card text */
```

### Semantic Colors
```css
--primary           /* Brand/primary actions */
--secondary         /* Secondary actions */
--accent            /* Accent/info actions */
--destructive       /* Errors/deletions */
--success           /* Positive states */
--warning           /* Warning states */
--info              /* Informational */
--muted             /* Subtle backgrounds */
```

### Each color has a foreground variant:
```css
--primary-foreground
--success-foreground
/* etc... */
```

### UI Elements
```css
--border            /* Border color */
--input             /* Input border */
--ring              /* Focus ring */
--radius            /* Border radius (1rem) */
```

### Charts
```css
--chart-1           /* Primary orange */
--chart-2           /* Amber */
--chart-3           /* Success green */
--chart-4           /* Cool blue */
--chart-5           /* Destructive red */
```

## Dark Mode Implementation

### Automatic Dark Mode
The theme automatically switches based on the `.dark` class:

```tsx
// Add to root layout
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark"> {/* Add/remove dark class */}
      <body>{children}</body>
    </html>
  );
}
```

### Toggle Dark Mode
```tsx
'use client';

import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
```

## Accessibility Features

### Contrast Ratios
All color combinations meet WCAG 2.1 Level AA:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Focus Indicators
All interactive elements have visible focus states:
```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Tabular Numbers
Financial data automatically uses tabular numbers for alignment:
```tsx
// Automatically applied to classes containing:
.tabular-nums
[class*='currency']
[class*='amount']
[class*='balance']
```

## Best Practices

### 1. Use Semantic Colors
```tsx
// ✅ Good - Uses semantic color
<Badge className="bg-success text-success-foreground">Active</Badge>

// ❌ Avoid - Hardcoded color
<Badge className="bg-green-500 text-white">Active</Badge>
```

### 2. Always Use Tabular Numbers for Amounts
```tsx
// ✅ Good
<div className="tabular-nums">$1,234.56</div>

// ❌ Bad - Numbers won't align in tables
<div>$1,234.56</div>
```

### 3. Maintain Color Meaning
- **Green**: Positive, success, gains
- **Red**: Negative, errors, losses
- **Amber**: Warning, pending, caution
- **Blue**: Primary actions, links
- **Cyan**: Information, secondary

### 4. Test Both Themes
Always test your components in both light and dark modes:
```tsx
// Use Storybook or similar to test both modes
export const LightMode = () => <YourComponent />;
export const DarkMode = () => (
  <div className="dark">
    <YourComponent />
  </div>
);
```

## Component-Specific Guidelines

### Buttons
- **Primary**: `bg-primary text-primary-foreground`
- **Secondary**: `bg-secondary text-secondary-foreground`
- **Destructive**: `bg-destructive text-destructive-foreground`
- **Ghost**: `hover:bg-accent hover:text-accent-foreground`

### Badges
- **Default**: `bg-secondary text-secondary-foreground`
- **Success**: `bg-success text-success-foreground`
- **Warning**: `bg-warning text-warning-foreground`
- **Destructive**: `bg-destructive text-destructive-foreground`

### Alerts
```tsx
<Alert variant="default">      {/* Blue/info */}
<Alert variant="destructive">  {/* Red/error */}
```

### Data Tables
```tsx
<Table>
  <TableHeader>
    <TableRow className="border-border">
      <TableHead className="text-muted-foreground">
        Amount
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-border hover:bg-muted/50">
      <TableCell className="tabular-nums font-mono">
        $1,234.56
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Customization

### Changing Primary Color
Edit `src/app/globals.css`:

```css
:root {
  /* Change from blue to another color */
  --primary: oklch(0.564 0.196 264.376); /* Blue */
  /* To purple: */
  --primary: oklch(0.564 0.196 300); /* Purple */
}
```

### Adding Custom Colors
```css
:root {
  --custom-color: oklch(0.7 0.15 180);
  --custom-color-foreground: oklch(1 0 0);
}

@theme inline {
  --color-custom: var(--custom-color);
  --color-custom-foreground: var(--custom-color-foreground);
}
```

Then use in components:
```tsx
<div className="bg-custom text-custom-foreground">
  Custom colored element
</div>
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com)
- [OKLCH Color Space](https://oklch.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Fineract Banking UI Guide](./fineract-banking-ui-guide.md)

## Support

For questions or issues with the theme system:
1. Check this documentation
2. Review the Fineract UI guide
3. Check shadcn/ui component documentation
4. Open an issue in the project repository
