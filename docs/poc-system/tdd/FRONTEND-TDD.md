# Trading Platform POC - Frontend Technical Design Document (TDD)

**Version**: 1.0
**Date**: 2026-03-18
**Status**: Design Complete - Ready for Implementation
**Authors**: Frontend Team

---

## 📑 Document Index

- [1. Overview & Goals](#1-overview--goals)
- [2. Frontend Architecture](#2-frontend-architecture)
- [3. Technology Stack](#3-technology-stack)
- [4. Design System](#4-design-system)
- [5. Page Structure](#5-page-structure)
- [6. Component Design](#6-component-design)
- [7. API Integration](#7-api-integration)
- [8. TradingView Integration](#8-tradingview-integration)
- [9. State Management](#9-state-management)
- [10. Authentication Flow](#10-authentication-flow)
- [11. Performance Optimization](#11-performance-optimization)
- [12. Implementation Plan](#12-implementation-plan)

---

## 1. Overview & Goals

### 1.1 Project Summary

A **modern crypto trading platform frontend** built with Next.js 15, featuring:
- Real-time trading interface with TradingView charts
- Order placement (LIMIT & MARKET orders)
- Portfolio management
- Order history tracking
- Dark/Light mode support
- Responsive mobile design

### 1.2 Phase 1 Scope (POC)

**Build a functional trading interface supporting:**
- ✅ User authentication (Login/Register with JWT cookies)
- ✅ Trading Dashboard (3-panel layout: OrderBook, Chart, TradingForm)
- ✅ TradingView Advanced Charts integration
- ✅ Order placement (BUY/SELL, LIMIT/MARKET)
- ✅ Portfolio view with balance tracking
- ✅ Order history view
- ✅ Dark mode (primary theme)
- ✅ Responsive mobile layout

**Explicitly OUT of scope:**
- ❌ Real-time WebSocket updates (Phase 2)
- ❌ Advanced order types (STOP_LIMIT, ICEBERG)
- ❌ Depth chart visualization
- ❌ Multi-language support
- ❌ Mobile app (native iOS/Android)

### 1.3 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| First Contentful Paint | < 1.5s | Next.js SSR optimization |
| Time to Interactive | < 3s | Code splitting, lazy loading |
| Chart Load Time | < 2s | TradingView lazy load |
| API Response Handling | < 200ms | Client-side caching |
| Bundle Size | < 500KB | Main bundle (gzipped) |

### 1.4 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest 2 versions | ✅ Full |
| Firefox | Latest 2 versions | ✅ Full |
| Safari | Latest 2 versions | ✅ Full |
| Edge | Latest 2 versions | ✅ Full |
| Mobile Safari (iOS) | 15+ | ✅ Full |
| Chrome Mobile (Android) | Latest | ✅ Full |

---

## 2. Frontend Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Client                           │
│                  (Next.js 15 App Router)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Pages      │ │ Components   │ │   Lib        │
│              │ │              │ │              │
│ /login       │ │ OrderBook    │ │ apiClient    │
│ /trade       │ │ TradingForm  │ │ datafeed     │
│ /portfolio   │ │ OrdersTable  │ │ hooks        │
│ /orders      │ │ BalanceCard  │ │ utils        │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Backend    │ │  Binance     │ │ TradingView  │
│   API        │ │  Public API  │ │  Library     │
│              │ │              │ │              │
│ Port 3001    │ │ (Temp)       │ │ /static/     │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 2.2 Directory Structure

```
apps/web/
├── app/                              # Next.js 15 App Router
│   ├── layout.tsx                    # Root layout (theme provider)
│   ├── globals.css                   # Global styles + design tokens
│   ├── page.tsx                      # Home (redirect to /trade)
│   │
│   ├── (auth)/                       # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx              # Login page with modal
│   │   └── register/
│   │       └── page.tsx              # Register page
│   │
│   ├── (dashboard)/                  # Dashboard route group
│   │   ├── layout.tsx                # Dashboard layout (header + nav)
│   │   ├── trade/
│   │   │   └── page.tsx              # Main trading dashboard
│   │   ├── portfolio/
│   │   │   └── page.tsx              # Portfolio view
│   │   └── orders/
│   │       └── page.tsx              # Orders view
│   │
│   └── api/                          # API routes (optional)
│       └── auth/
│           └── [...nextauth]/route.ts # NextAuth handlers
│
├── components/
│   ├── ui/                           # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── modal.tsx
│   │   └── badge.tsx
│   │
│   ├── layout/                       # Layout components
│   │   ├── Header.tsx                # Top navigation bar
│   │   ├── DashboardLayout.tsx       # Dashboard wrapper
│   │   └── MobileNav.tsx             # Mobile bottom nav
│   │
│   ├── trading/                      # Trading-specific components
│   │   ├── OrderBook.tsx             # Order book panel
│   │   ├── TradingViewChart.tsx      # TradingView widget wrapper
│   │   ├── TradingForm.tsx           # Buy/Sell form
│   │   ├── OrdersTable.tsx           # Orders table
│   │   └── ConfirmOrderModal.tsx     # Order confirmation modal
│   │
│   ├── account/                      # Account components
│   │   ├── BalanceCard.tsx           # Portfolio summary card
│   │   ├── AssetsTable.tsx           # Assets list table
│   │   └── DepositWithdrawModal.tsx  # Deposit/Withdraw modal
│   │
│   └── auth/                         # Auth components
│       ├── LoginForm.tsx             # Login form
│       └── RegisterForm.tsx          # Register form
│
├── lib/
│   ├── api/                          # API clients
│   │   ├── client.ts                 # Axios instance (backend API)
│   │   └── binance.ts                # Binance public API client
│   │
│   ├── tradingview/                  # TradingView integration
│   │   ├── datafeed.ts               # Custom datafeed implementation
│   │   ├── binance-datafeed.ts       # Binance datafeed adapter
│   │   └── config.ts                 # Chart configuration
│   │
│   ├── hooks/                        # React hooks
│   │   ├── useAuth.ts                # Authentication hook
│   │   ├── useOrders.ts              # Orders data hook
│   │   ├── useBalance.ts             # Balance data hook
│   │   └── useOrderBook.ts           # Order book hook
│   │
│   ├── utils/                        # Utility functions
│   │   ├── format.ts                 # Number/currency formatting
│   │   ├── validation.ts             # Form validation
│   │   └── constants.ts              # App constants
│   │
│   └── types/                        # TypeScript types
│       ├── api.ts                    # API response types
│       ├── trading.ts                # Trading-related types
│       └── user.ts                   # User types
│
├── public/
│   └── static/
│       └── charting_library/         # TradingView library files
│
└── styles/
    └── themes/                       # Theme configurations
        ├── dark.css
        └── light.css
```

---

## 3. Technology Stack

### 3.1 Core Framework

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| **Next.js** | 15.x | React framework | App Router, SSR, API routes |
| **React** | 19.x | UI library | Server Components |
| **TypeScript** | 5.x | Type safety | Strict mode |
| **Tailwind CSS** | 4.x | Styling | Utility-first CSS |

### 3.2 UI Components

| Library | Version | Purpose |
|---------|---------|---------|
| **shadcn/ui** | Latest | Base components |
| **Radix UI** | Latest | Headless components |
| **lucide-react** | Latest | Icons |
| **class-variance-authority** | Latest | Component variants |
| **tailwind-merge** | Latest | Tailwind class merging |

### 3.3 Data Fetching & State

| Library | Version | Purpose |
|---------|---------|---------|
| **@tanstack/react-query** | 5.x | Server state management |
| **axios** | 1.x | HTTP client |
| **zustand** | 4.x | Client state (optional) |
| **swr** | 2.x | Alternative to React Query |

### 3.4 TradingView

| Library | Version | Purpose |
|---------|---------|---------|
| **TradingView Charting Library** | v27.005 | Advanced charts |
| **Custom Datafeed** | - | Binance API adapter |

### 3.5 Form & Validation

| Library | Version | Purpose |
|---------|---------|---------|
| **react-hook-form** | 7.x | Form state management |
| **zod** | 3.x | Schema validation |

### 3.6 Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.x | Code linting |
| **Prettier** | 3.x | Code formatting |
| **TypeScript** | 5.x | Type checking |

---

## 4. Design System

### 4.1 Color Tokens (CSS Variables)

```css
/* apps/web/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

:root {
  /* Brand Colors */
  --brand-primary: #00A8E8;           /* Cyan - Primary actions */
  --brand-primary-hover: #0091CC;     /* Hover state */

  /* Trading Colors */
  --buy-color: #00C087;               /* Green - Buy orders */
  --buy-bg: rgba(0, 192, 135, 0.08);  /* Buy background */
  --buy-hover: #00A876;               /* Buy hover */

  --sell-color: #F6465D;              /* Red - Sell orders */
  --sell-bg: rgba(246, 70, 93, 0.08); /* Sell background */
  --sell-hover: #E03D52;              /* Sell hover */

  /* Semantic Colors */
  --success: #00C087;
  --error: #F6465D;
  --warning: #FFB800;

  /* Background Colors - Dark Theme */
  --bg-page: #0D0D0D;                 /* Main page background */
  --bg-surface: #161616;              /* Cards, panels */
  --bg-elevated: #1E1E1E;             /* Inputs, dropdowns */
  --bg-hover: #252525;                /* Hover states */

  /* Text Colors - Dark Theme */
  --text-primary: #FFFFFF;            /* Main text */
  --text-secondary: #8E8E93;          /* Secondary text */
  --text-tertiary: #636366;           /* Tertiary text */
  --text-on-accent: #FFFFFF;          /* Text on accent colors */

  /* Border Colors - Dark Theme */
  --border-default: #2C2C2E;          /* Default borders */
  --border-subtle: #1C1C1E;           /* Subtle dividers */

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-xs: 11px;
  --font-sm: 12px;
  --font-base: 14px;
  --font-lg: 16px;
  --font-xl: 20px;
  --font-2xl: 24px;
  --font-3xl: 32px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
}

/* Light Theme */
[data-theme="light"] {
  --bg-page: #F5F5F7;
  --bg-surface: #FFFFFF;
  --bg-elevated: #FAFAFA;
  --bg-hover: #F0F0F0;

  --text-primary: #1D1D1F;
  --text-secondary: #6E6E73;
  --text-tertiary: #86868B;
  --text-on-accent: #FFFFFF;

  --border-default: #D2D2D7;
  --border-subtle: #E5E5EA;
}

/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-base);
  color: var(--text-primary);
  background: var(--bg-page);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar Styling (Dark Theme) */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: var(--radius-sm);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
```

### 4.2 Component Variants (CVA)

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--brand-primary)] text-[var(--text-on-accent)] hover:bg-[var(--brand-primary-hover)]',
        buy: 'bg-[var(--buy-color)] text-white hover:bg-[var(--buy-hover)]',
        sell: 'bg-[var(--sell-color)] text-white hover:bg-[var(--sell-hover)]',
        ghost: 'bg-transparent border border-[var(--border-default)] hover:bg-[var(--bg-hover)]',
        outline: 'border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-elevated)]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);
```

---

## 5. Page Structure

### 5.1 Login Page (`/login`)

**Layout:**
```tsx
<div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
  <LoginModal>
    <Tabs>
      <Tab>Login</Tab>
      <Tab>Register</Tab>
    </Tabs>

    <LoginForm>
      <Input label="Email" />
      <Input label="Password" type="password" />
      <Link href="/forgot-password">Forgot password?</Link>
      <Button variant="default" fullWidth>Login</Button>

      <Divider>or</Divider>

      <SocialButtons>
        <Button variant="outline">Google</Button>
        <Button variant="outline">GitHub</Button>
      </SocialButtons>
    </LoginForm>
  </LoginModal>
</div>
```

**Key Features:**
- Cookie-based authentication
- Form validation with react-hook-form + zod
- Social login placeholders
- Redirect to `/trade` after login

---

### 5.2 Trading Dashboard (`/trade`)

**Layout (Desktop 1440px):**
```tsx
<DashboardLayout>
  <Header />

  <div className="grid grid-cols-[320px_1fr_340px] gap-4 p-4 h-[calc(100vh-64px)]">
    {/* Left Panel - Order Book */}
    <OrderBookPanel />

    {/* Center Panel - Chart */}
    <div className="flex flex-col gap-4">
      <TradingViewChart />
    </div>

    {/* Right Panel - Trading Form */}
    <TradingFormPanel />
  </div>

  {/* Bottom Section - Orders Table */}
  <OrdersSection className="h-[300px]" />
</DashboardLayout>
```

**Component Breakdown:**

#### **OrderBookPanel** (320px width)
```tsx
<div className="bg-[var(--bg-surface)] rounded-lg p-4">
  <div className="flex items-center justify-between mb-4">
    <h3>Order Book</h3>
    <span className="text-sm">BTC/USDT</span>
  </div>

  <div className="text-2xl font-bold mb-2">
    <span className="text-[var(--buy-color)]">$43,247.50</span>
    <span className="text-xs text-[var(--text-secondary)] ml-2">+2.45%</span>
  </div>

  {/* Asks (Sell orders) */}
  <div className="space-y-1 mb-2">
    {asks.map(level => (
      <OrderBookLevel
        price={level.price}
        amount={level.amount}
        total={level.total}
        side="ask"
      />
    ))}
  </div>

  {/* Spread */}
  <div className="border-t border-[var(--border-subtle)] py-1 text-xs text-center">
    Spread: 0.01 (0.01%)
  </div>

  {/* Bids (Buy orders) */}
  <div className="space-y-1 mt-2">
    {bids.map(level => (
      <OrderBookLevel
        price={level.price}
        amount={level.amount}
        total={level.total}
        side="bid"
      />
    ))}
  </div>
</div>
```

#### **TradingViewChart** (Fill container)
```tsx
<div className="bg-[var(--bg-surface)] rounded-lg overflow-hidden">
  {/* Pair Header */}
  <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
    <div>
      <h2 className="text-xl font-bold">BTC/USDT</h2>
      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
        <span>24h High: 43,580.00</span>
        <span>24h Low: 42,120.50</span>
        <span>24h Volume: 12,458.42</span>
      </div>
    </div>
  </div>

  {/* Chart Container */}
  <div id="tv_chart_container" className="h-[600px]" />
</div>
```

#### **TradingFormPanel** (340px width)
```tsx
<div className="bg-[var(--bg-surface)] rounded-lg p-4">
  {/* Buy/Sell Tabs */}
  <Tabs>
    <Tab variant="buy" active>Buy</Tab>
    <Tab variant="sell">Sell</Tab>
  </Tabs>

  {/* Order Type Toggle */}
  <div className="flex gap-2 mb-4">
    <Button variant="ghost" size="sm" active>Limit</Button>
    <Button variant="ghost" size="sm">Market</Button>
  </div>

  {/* Price Input */}
  <Input
    label="Price"
    value="43,247.50"
    suffix="USDT"
    type="number"
  />

  {/* Amount Input */}
  <Input
    label="Amount"
    value="0.0000"
    suffix="BTC"
    type="number"
  />

  {/* Percentage Buttons */}
  <div className="grid grid-cols-4 gap-2 mb-4">
    <Button variant="ghost" size="sm">25%</Button>
    <Button variant="ghost" size="sm">50%</Button>
    <Button variant="ghost" size="sm">75%</Button>
    <Button variant="ghost" size="sm">100%</Button>
  </div>

  {/* Summary */}
  <div className="space-y-2 mb-4 text-sm">
    <div className="flex justify-between">
      <span className="text-[var(--text-secondary)]">Total</span>
      <span>0.00 USDT</span>
    </div>
    <div className="flex justify-between">
      <span className="text-[var(--text-secondary)]">Available</span>
      <span>1,250.50 USDT</span>
    </div>
  </div>

  {/* Action Button */}
  <Button variant="buy" fullWidth>Buy BTC</Button>
</div>
```

#### **OrdersSection** (300px height)
```tsx
<div className="bg-[var(--bg-surface)] rounded-lg">
  <Tabs>
    <Tab active>Open Orders</Tab>
    <Tab>Order History</Tab>
    <Tab>Trade History</Tab>
  </Tabs>

  <OrdersTable
    columns={['Pair', 'Type', 'Side', 'Price', 'Amount', 'Filled', 'Total', 'Status', 'Action']}
    data={openOrders}
  />
</div>
```

---

### 5.3 Portfolio Page (`/portfolio`)

```tsx
<DashboardLayout>
  <Header />

  <div className="p-6 space-y-6">
    {/* Portfolio Summary */}
    <div className="bg-[var(--bg-surface)] rounded-lg p-6">
      <h3 className="text-sm text-[var(--text-secondary)] mb-2">Portfolio Value</h3>
      <div className="flex items-end gap-4">
        <span className="text-4xl font-bold">$52,847.50</span>
        <span className="text-[var(--success)] text-lg">
          +$1,247.50 (+2.42%)
        </span>
      </div>
    </div>

    {/* Assets Table */}
    <div className="bg-[var(--bg-surface)] rounded-lg">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
        <h2 className="text-xl font-bold">Your Assets</h2>
        <div className="flex gap-2">
          <Button variant="outline">Deposit</Button>
          <Button variant="outline">Withdraw</Button>
        </div>
      </div>

      <AssetsTable />
    </div>
  </div>
</DashboardLayout>
```

---

### 5.4 Orders Page (`/orders`)

```tsx
<DashboardLayout>
  <Header />

  <div className="p-6">
    <Tabs className="mb-6">
      <Tab active>Open Orders</Tab>
      <Tab>Order History</Tab>
      <Tab>Trade History</Tab>
    </Tabs>

    <div className="bg-[var(--bg-surface)] rounded-lg">
      <OrdersTable
        filters
        pagination
        data={orders}
      />
    </div>
  </div>
</DashboardLayout>
```

---

## 6. Component Design

### 6.1 OrderBook Component

```typescript
// components/trading/OrderBook.tsx
interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookProps {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  currentPrice: number;
  changePercent: number;
}

export function OrderBook({ pair, bids, asks, currentPrice, changePercent }: OrderBookProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Order Book</h3>
        <span className="text-sm text-[var(--text-secondary)]">{pair}</span>
      </div>

      {/* Current Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-2xl font-bold",
            changePercent >= 0 ? "text-[var(--buy-color)]" : "text-[var(--sell-color)]"
          )}>
            ${currentPrice.toLocaleString()}
          </span>
          <span className={cn(
            "text-xs",
            changePercent >= 0 ? "text-[var(--buy-color)]" : "text-[var(--sell-color)]"
          )}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-3 text-xs text-[var(--text-secondary)] mb-2">
        <span>Price(USDT)</span>
        <span className="text-right">Amount(BTC)</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {asks.slice(0, 10).reverse().map((level, i) => (
          <OrderBookLevel key={i} {...level} side="ask" />
        ))}
      </div>

      {/* Spread */}
      <div className="border-t border-b border-[var(--border-subtle)] py-1 my-1 text-xs text-center text-[var(--text-secondary)]">
        Spread: {(asks[0]?.price - bids[0]?.price).toFixed(2)} ({((asks[0]?.price - bids[0]?.price) / bids[0]?.price * 100).toFixed(2)}%)
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {bids.slice(0, 10).map((level, i) => (
          <OrderBookLevel key={i} {...level} side="bid" />
        ))}
      </div>
    </div>
  );
}

function OrderBookLevel({ price, amount, total, side }: OrderBookLevel & { side: 'bid' | 'ask' }) {
  const percentage = (total / 100000) * 100; // Example max total

  return (
    <div className="relative grid grid-cols-3 text-xs py-0.5 hover:bg-[var(--bg-hover)] cursor-pointer">
      {/* Background bar */}
      <div
        className={cn(
          "absolute inset-0 opacity-10",
          side === 'bid' ? 'bg-[var(--buy-color)]' : 'bg-[var(--sell-color)]'
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <span className={cn(
        "z-10",
        side === 'bid' ? 'text-[var(--buy-color)]' : 'text-[var(--sell-color)]'
      )}>
        {price.toLocaleString()}
      </span>
      <span className="z-10 text-right">{amount.toFixed(4)}</span>
      <span className="z-10 text-right">{total.toLocaleString()}</span>
    </div>
  );
}
```

---

### 6.2 TradingForm Component

```typescript
// components/trading/TradingForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const orderSchema = z.object({
  pair: z.string(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.number().positive().optional(),
  amount: z.number().positive(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface TradingFormProps {
  pair: string;
  availableBalance: number;
  currentPrice: number;
}

export function TradingForm({ pair, availableBalance, currentPrice }: TradingFormProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      pair,
      side: 'BUY',
      type: 'LIMIT',
      price: currentPrice,
      amount: 0,
    },
  });

  const amount = watch('amount');
  const price = watch('price') || currentPrice;
  const total = amount * price;

  const handlePercentage = (percent: number) => {
    const maxAmount = availableBalance / price;
    setValue('amount', maxAmount * (percent / 100));
  };

  const onSubmit = async (data: OrderFormData) => {
    // API call to place order
    const response = await apiClient.post('/orders', {
      ...data,
      side,
      type: orderType,
    });

    // Show confirmation modal
    // Refresh order list
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg p-4">
      {/* Buy/Sell Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setSide('BUY')}
          className={cn(
            "py-2 rounded-md font-semibold transition",
            side === 'BUY'
              ? 'bg-[var(--buy-color)] text-white'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={cn(
            "py-2 rounded-md font-semibold transition",
            side === 'SELL'
              ? 'bg-[var(--sell-color)] text-white'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
          )}
        >
          Sell
        </button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrderType('LIMIT')}
          className={cn(
            "flex-1 py-1.5 text-sm rounded transition",
            orderType === 'LIMIT'
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          Limit
        </button>
        <button
          onClick={() => setOrderType('MARKET')}
          className={cn(
            "flex-1 py-1.5 text-sm rounded transition",
            orderType === 'MARKET'
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          Market
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Price Input (LIMIT only) */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-4 py-2.5 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                USDT
              </span>
            </div>
            {errors.price && (
              <p className="text-xs text-[var(--error)] mt-1">{errors.price.message}</p>
            )}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.00000001"
              {...register('amount', { valueAsNumber: true })}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-4 py-2.5 pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              BTC
            </span>
          </div>
          {errors.amount && (
            <p className="text-xs text-[var(--error)] mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Percentage Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map(percent => (
            <button
              key={percent}
              type="button"
              onClick={() => handlePercentage(percent)}
              className="py-1.5 text-xs bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] rounded transition"
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Total</span>
            <span>{total.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Available</span>
            <span>{availableBalance.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={cn(
            "w-full py-3 rounded-md font-semibold transition",
            side === 'BUY'
              ? 'bg-[var(--buy-color)] hover:bg-[var(--buy-hover)] text-white'
              : 'bg-[var(--sell-color)] hover:bg-[var(--sell-hover)] text-white'
          )}
        >
          {side === 'BUY' ? 'Buy' : 'Sell'} BTC
        </button>
      </form>
    </div>
  );
}
```

---

## 7. API Integration

### 7.1 Backend API Client

```typescript
// lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any custom headers here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 7.2 Binance Public API Client (Temporary)

```typescript
// lib/api/binance.ts
import axios from 'axios';

const binanceClient = axios.create({
  baseURL: 'https://api.binance.com/api/v3',
});

export const binanceAPI = {
  // Get current ticker price
  getTicker: async (symbol: string) => {
    const response = await binanceClient.get('/ticker/24hr', {
      params: { symbol: symbol.replace('/', '') }, // BTC/USDT -> BTCUSDT
    });
    return response.data;
  },

  // Get candlestick data
  getKlines: async (symbol: string, interval: string, limit: number = 100) => {
    const response = await binanceClient.get('/klines', {
      params: {
        symbol: symbol.replace('/', ''),
        interval, // '1m', '5m', '15m', '1h', '1d'
        limit,
  },
    });

    // Transform to standard format
    return response.data.map((candle: any[]) => ({
      time: candle[0] / 1000, // Convert to seconds
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  },

  // Get order book
  getOrderBook: async (symbol: string, limit: number = 20) => {
    const response = await binanceClient.get('/depth', {
      params: {
        symbol: symbol.replace('/', ''),
        limit,
      },
    });

    return {
      bids: response.data.bids.map(([price, amount]: [string, string]) => ({
        price: parseFloat(price),
        amount: parseFloat(amount),
        total: parseFloat(price) * parseFloat(amount),
      })),
      asks: response.data.asks.map(([price, amount]: [string, string]) => ({
        price: parseFloat(price),
        amount: parseFloat(amount),
        total: parseFloat(price) * parseFloat(amount),
      })),
    };
  },
};
```

---

## 8. TradingView Integration

### 8.1 Binance Datafeed Implementation

```typescript
// lib/tradingview/binance-datafeed.ts
import { binanceAPI } from '../api/binance';

const configurationData = {
  supported_resolutions: ['1', '5', '15', '60', '1D', '1W', '1M'],
  exchanges: [
    { value: 'Binance', name: 'Binance', desc: 'Binance Exchange' },
  ],
  symbols_types: [
    { name: 'crypto', value: 'crypto' },
  ],
};

const resolutionMap: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  '1D': '1d',
  '1W': '1w',
  '1M': '1M',
};

export const BinanceDatafeed = {
  onReady: (callback: any) => {
    setTimeout(() => callback(configurationData), 0);
  },

  searchSymbols: (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: any
  ) => {
    const symbols = [
      { symbol: 'BTCUSDT', full_name: 'Binance:BTCUSDT', description: 'Bitcoin / Tether', exchange: 'Binance', type: 'crypto' },
      { symbol: 'ETHUSDT', full_name: 'Binance:ETHUSDT', description: 'Ethereum / Tether', exchange: 'Binance', type: 'crypto' },
    ];

    const filtered = symbols.filter(s =>
      s.symbol.toLowerCase().includes(userInput.toLowerCase())
    );

    setTimeout(() => onResultReadyCallback(filtered), 0);
  },

  resolveSymbol: (
    symbolName: string,
    onSymbolResolvedCallback: any,
    onResolveErrorCallback: any
  ) => {
    const symbolInfo = {
      ticker: symbolName.replace('Binance:', ''),
      name: symbolName,
      description: symbolName.replace('Binance:', '').replace('USDT', ' / USDT'),
      type: 'crypto',
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: 'Binance',
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      has_daily: true,
      has_weekly_and_monthly: true,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 8,
      data_status: 'streaming',
      format: 'price',
    };

    setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
  },

  getBars: async (
    symbolInfo: any,
    resolution: string,
    periodParams: any,
    onHistoryCallback: any,
    onErrorCallback: any
  ) => {
    try {
      const interval = resolutionMap[resolution] || '1m';
      const { from, to } = periodParams;

      // Calculate limit based on timeframe
      const limit = Math.min(1000, Math.ceil((to - from) / getResolutionInSeconds(resolution)));

      const bars = await binanceAPI.getKlines(symbolInfo.ticker, interval, limit);

      // Filter by time range
      const filteredBars = bars.filter((bar: any) => bar.time >= from && bar.time <= to);

      if (filteredBars.length === 0) {
        onHistoryCallback([], { noData: true });
      } else {
        onHistoryCallback(filteredBars, { noData: false });
      }
    } catch (error) {
      console.error('getBars error:', error);
      onErrorCallback(error);
    }
  },

  subscribeBars: (
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: any,
    subscriberUID: string,
    onResetCacheNeededCallback: any
  ) => {
    // WebSocket streaming (optional for Phase 1)
    console.log('subscribeBars:', subscriberUID);
  },

  unsubscribeBars: (subscriberUID: string) => {
    console.log('unsubscribeBars:', subscriberUID);
  },
};

function getResolutionInSeconds(resolution: string): number {
  const map: Record<string, number> = {
    '1': 60,
    '5': 300,
    '15': 900,
    '60': 3600,
    '240': 14400,
    '1D': 86400,
    '1W': 604800,
  };
  return map[resolution] || 60;
}
```

### 8.2 TradingView Chart Component

```typescript
// components/trading/TradingViewChart.tsx
'use client';

import { useEffect, useRef } from 'react';
import { BinanceDatafeed } from '@/lib/tradingview/binance-datafeed';

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
}

export function TradingViewChart({
  symbol = 'BTCUSDT',
  interval = '15',
  theme = 'dark',
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Load TradingView script
    const script = document.createElement('script');
    script.src = '/static/charting_library/charting_library.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        widgetRef.current = new window.TradingView.widget({
          container: chartContainerRef.current!,
          library_path: '/static/charting_library/',
          datafeed: BinanceDatafeed,
          symbol: `Binance:${symbol}`,
          interval,
          timezone: 'Etc/UTC',
          theme: theme === 'dark' ? 'dark' : 'light',
          locale: 'en',
          autosize: true,
          toolbar_bg: theme === 'dark' ? '#161616' : '#FFFFFF',
          overrides: {
            // Dark theme customization
            'paneProperties.background': '#161616',
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': '#1C1C1E',
            'paneProperties.horzGridProperties.color': '#1C1C1E',
            'scalesProperties.textColor': '#8E8E93',
            'scalesProperties.lineColor': '#2C2C2E',

            // Candlestick colors
            'mainSeriesProperties.candleStyle.upColor': '#00C087',
            'mainSeriesProperties.candleStyle.downColor': '#F6465D',
            'mainSeriesProperties.candleStyle.borderUpColor': '#00C087',
            'mainSeriesProperties.candleStyle.borderDownColor': '#F6465D',
            'mainSeriesProperties.candleStyle.wickUpColor': '#00C087',
            'mainSeriesProperties.candleStyle.wickDownColor': '#F6465D',
          },
          disabled_features: [
            'header_symbol_search',
            'header_compare',
            'header_undo_redo',
            'header_screenshot',
          ],
          enabled_features: [
            'study_templates',
            'side_toolbar_in_fullscreen_mode',
          ],
          loading_screen: {
            backgroundColor: theme === 'dark' ? '#161616' : '#FFFFFF',
            foregroundColor: theme === 'dark' ? '#8E8E93' : '#1D1D1F',
          },
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
      document.head.removeChild(script);
    };
  }, [symbol, interval, theme]);

  return (
    <div className="relative w-full h-full">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
```

---

## 9. State Management

### 9.1 React Query Setup

```typescript
// lib/providers/react-query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 9.2 Custom Hooks

```typescript
// lib/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
  };
}

// lib/hooks/useOrders.ts
export function useOrders(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const response = await apiClient.get('/orders', { params: filters });
      return response.data;
    },
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiClient.post('/orders', orderData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

// lib/hooks/useBalance.ts
export function useBalance() {
  return useQuery({
    queryKey: ['account', 'balance'],
    queryFn: async () => {
      const response = await apiClient.get('/account/balance');
      return response.data;
    },
  });
}

// lib/hooks/useOrderBook.ts (Binance)
export function useOrderBook(symbol: string) {
  return useQuery({
    queryKey: ['orderbook', symbol],
    queryFn: () => binanceAPI.getOrderBook(symbol),
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
```

---

## 10. Authentication Flow

### 10.1 Protected Routes

```typescript
// lib/auth/protected-route.tsx
'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

### 10.2 Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--bg-page)]">
        <Header />
        <main>{children}</main>
      </div>
    </ProtectedRoute>
  );
}
```

---

## 11. Performance Optimization

### 11.1 Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const TradingViewChart = dynamic(
  () => import('@/components/trading/TradingViewChart'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <p>Loading chart...</p>
      </div>
    ),
  }
);
```

### 11.2 Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/bitcoin.svg"
  alt="Bitcoin"
  width={24}
  height={24}
  priority
/>
```

### 11.3 Memoization

```typescript
import { memo, useMemo } from 'react';

export const OrderBookLevel = memo(function OrderBookLevel({ price, amount, total, side }) {
  const percentage = useMemo(() => (total / 100000) * 100, [total]);

  return (
    // Component JSX
  );
});
```

---

## 12. Implementation Plan

### **Phase 1: Setup & Foundation (Week 1 - Days 1-3)**

**Day 1-2: Project Setup**
- [x] Next.js 15 project initialized
- [ ] Install dependencies (React Query, Tailwind, shadcn/ui)
- [ ] Setup design system (globals.css with CSS variables)
- [ ] Configure TypeScript strict mode
- [ ] Setup ESLint + Prettier

**Day 3: Base Components**
- [ ] Implement shadcn/ui components (Button, Input, Tabs, Table, Modal)
- [ ] Create layout components (Header, DashboardLayout)
- [ ] Setup React Query provider

**Deliverable:** Clean project structure with design system ready

---

### **Phase 2: Authentication (Week 1 - Days 4-5)**

**Day 4: Auth Pages**
- [ ] Login page with form validation
- [ ] Register page
- [ ] Protected route wrapper
- [ ] Auth hooks (useAuth)

**Day 5: API Integration**
- [ ] Backend API client setup (axios + cookies)
- [ ] Login/logout flow
- [ ] Token refresh handling
- [ ] Redirect logic

**Deliverable:** Working authentication with cookie-based sessions

---

### **Phase 3: Trading Dashboard (Week 2 - Days 1-4)**

**Day 1: Layout Structure**
- [ ] 3-panel layout (OrderBook, Chart, TradingForm)
- [ ] Responsive grid system
- [ ] Mobile stacked layout

**Day 2: OrderBook Component**
- [ ] Binance API integration for order book data
- [ ] Real-time polling (5s interval)
- [ ] Bid/Ask visualization with background bars
- [ ] Spread calculation

**Day 3: TradingView Integration**
- [ ] TradingView widget component
- [ ] Binance datafeed implementation
- [ ] Chart configuration (dark theme, candlesticks)
- [ ] Resolution switcher

**Day 4: TradingForm Component**
- [ ] Buy/Sell tabs
- [ ] Limit/Market toggle
- [ ] Form validation (react-hook-form + zod)
- [ ] Percentage buttons (25%, 50%, 75%, 100%)
- [ ] Order placement API integration

**Deliverable:** Fully functional trading dashboard

---

### **Phase 4: Orders & Portfolio (Week 2 - Days 5-7)**

**Day 5: Orders Table**
- [ ] OrdersTable component
- [ ] Tabs: Open Orders, Order History, Trade History
- [ ] Status badges (Pending, Partial, Filled, Canceled)
- [ ] Cancel order action
- [ ] Pagination

**Day 6: Portfolio Page**
- [ ] Portfolio summary card (total value, % change)
- [ ] AssetsTable component
- [ ] Balance data from backend API
- [ ] Deposit/Withdraw modals (UI only)

**Day 7: Orders Page**
- [ ] Dedicated orders page
- [ ] Filters (status, pair, date range)
- [ ] Search functionality
- [ ] Export CSV (optional)

**Deliverable:** Complete portfolio and order management views

---

### **Phase 5: Polish & Testing (Week 3)**

**Day 1-2: UI/UX Refinement**
- [ ] Loading states (skeletons)
- [ ] Error handling & toast notifications
- [ ] Empty states
- [ ] Hover effects & transitions
- [ ] Mobile responsive fixes

**Day 3-4: Testing**
- [ ] Manual testing all flows
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit

**Day 5: Documentation**
- [ ] Component documentation
- [ ] API integration docs
- [ ] Deployment guide
- [ ] User guide

**Deliverable:** Production-ready POC

---

## 📋 Success Criteria

**Functional Requirements:**
- [x] User can login/register with backend API
- [ ] User can view real-time order book (Binance data)
- [ ] User can view TradingView chart with historical data
- [ ] User can place LIMIT & MARKET orders (BUY/SELL)
- [ ] User can view portfolio balance
- [ ] User can view order history
- [ ] User can cancel open orders
- [ ] UI matches Figma design (dark mode)

**Technical Requirements:**
- [ ] TypeScript strict mode (no `any` types)
- [ ] Responsive design (desktop 1440px, mobile 375px)
- [ ] Cookie-based authentication working
- [ ] Binance API integration working
- [ ] TradingView chart loading < 2s
- [ ] No console errors in production build

---

## 🚀 Deployment

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**Build Commands:**
```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start

# Type check
pnpm check-types

# Lint
pnpm lint
```

---

## 📚 References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [TradingView Charting Library Docs](https://www.tradingview.com/charting-library-docs/)
- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Document Status**: ✅ **APPROVED - Ready for Implementation**
**Estimated Effort**: 3 weeks (1 frontend developer, full-time)
**Next Milestone**: Phase 1 completion (Setup & Authentication)
**Last Updated**: 2026-03-18
