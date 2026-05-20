# Fineract UI Theme System

Comprehensive theming documentation for the Fineract UI built with shadcn/ui, Tailwind CSS v4, and React 19.

## Overview

This theme system is currently set to an Electric Neo Bank direction for core banking operations:
- **Deep violet primary brand** (`#5B21B6` light, `#A78BFA` dark) for primary actions and selected states
- **Cyan secondary brand** (`#0E7490` light, `#22D3EE` dark) for links, info states, and high-visibility accents
- **Magenta-violet accent** for chart diversity and modern product expression without overwhelming tables and forms
- **Tinted operational surfaces** so dashboards, ledgers, and forms stay readable during long sessions
- **Emerald and rose money semantics** for positive/completed and risk/failed financial states
- **WCAG 2.1 Level AA** oriented contrast ratios for core text and financial data

## Color Palette

### Light Mode

#### Brand Colors
- **Primary Brand**: `#5B21B6`
  - Used for: Primary buttons, selected navigation, active controls
  - Text: `#FFFFFF`

- **Secondary Brand**: `#0E7490`
  - Used for: Links, info states, tab underlines, secondary brand accents
  - Runtime token: `--brand-secondary` and Tailwind `text-brand-secondary`/`bg-brand-secondary`
  - Text: `#FFFFFF`

- **Accent Brand**: `#A21CAF`
  - Used for: Charts, differentiated product accents, non-critical highlights

#### Semantic Colors
- **Success Emerald**: `#047857`
  - Used for: Income, completed transfers, positive ROI
  - Text: `#FFFFFF`

- **Danger Rose**: `#BE123C`
  - Used for: Expenses, failed transactions, overdrafts
  - Text: `#FFFFFF`

- **Warning Amber**: `#A16207`
  - Used for: Pending states and cautions
  - Text: `#FFFFFF`

#### Neutral Scale
- **Main Surface**: `#FFFFFF` - Card surfaces and popovers
- **Subtle Surface**: `#F5F7FF` - Page background
- **Primary Text**: `#0F172A` - Headings, balances, transaction values
- **Secondary Text**: `#475569` - Labels, timestamps, account numbers

### Dark Mode

#### Brand Colors
- **Primary Brand**: `#A78BFA`
- **Secondary Brand**: `#22D3EE`
- **Accent Brand**: `#F0ABFC`

#### Base Colors
- **Background**: `#070B1A`
- **Surface/Card**: `#151F35`
- **Primary Text**: `#F8FAFC`
- **Secondary Text**: `#94A3B8`

#### Semantic Colors
- **Success Emerald**: `#34D399`
- **Danger Rose**: `#FB7185`
- **Warning Amber**: `#FBBF24`
- **Info Cyan**: `#22D3EE`

#### Typography
- **UI font**: Inter remains the runtime font because it is already configured and has excellent dashboard readability.
- **Financial data**: tabular numbers are enforced through `.tabular-nums`, amount, balance, and currency selectors.
- **Optional later swap**: Manrope or Geist would fit a stronger neo-bank brand, but changing `next/font` should be done with a build check because font fetching can affect deployment.

#### UI Elements
- **Dividers & Borders**: `#334155` dark, `#CBD5E1` light
- **Focus Ring**: primary brand color per theme

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
<Alert variant="warning">
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
--brand-secondary   /* Secondary brand accent */
--secondary         /* Neutral secondary UI surface */
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
--radius            /* Border radius (0.5rem) */
```

### Charts
```css
--chart-1           /* Primary indigo */
--chart-2           /* Secondary cyan */
--chart-3           /* Accent violet */
--chart-4           /* Success emerald */
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
