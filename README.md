# ❄️ AdverticeAF (adverticeaf.com)

> **Ads That Go Viral AF. Cold Hard Measurable ROI.**  
> The next-generation creative laboratory and growth agency turning boring brands into cultural phenomenons with high-converting short-form, 3D CGI, and AI-optimized ad hooks.

---

## ⚡ What is AdverticeAF?

AdverticeAF solves the #1 problem killing performance marketing: **ad creative fatigue and boring corporate ads**. 

Instead of traditional slow agency models, AdverticeAF operates with high creative velocity:
- **0.6s Thumb-Stop Hooks**: Engineered pattern interrupts tailored for TikTok, Meta Reels, and YouTube Shorts.
- **AI-Powered "Ad Roaster"**: Live interactive diagnostic tool grading ad hook psychology and generating 3 viral alternative angles.
- **3D CGI & Culture-Jacking**: Hyper-real product spectacle, ASMR tactile audio, and native UGC creator partnerships.
- **Interactive ROI Simulator**: Live financial model projecting impressions, creative variations, and incremental ROAS lift.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Library**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + Cyber-Frost Design System
- **Icons**: [Lucide React](https://lucide.dev)
- **FX**: Canvas Confetti & custom backdrop-blur glassmorphism
- **Language**: TypeScript

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20
- npm >= 10

### Installation

```bash
# Clone the repository
git clone https://github.com/Leeshwaan04/adverticeaf.git
cd adverticeaf

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Project Architecture

```
adverticeaf/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with SEO metadata & cyber-dark theme
│   │   ├── page.tsx           # Home page assembling interactive components
│   │   └── globals.css        # Tailwind v4 theme, animations & glass styles
│   └── components/
│       ├── Navbar.tsx         # Sticky glass navbar with mobile drawer & audit trigger
│       ├── Hero.tsx           # Dynamic rotating headline, metrics & trust signals
│       ├── AdRoaster.tsx      # Interactive AI Roaster & viral hook generation lab
│       ├── BoringVsAF.tsx     # Interactive comparison: Traditional ads vs AdverticeAF
│       ├── CreativeShowcase.tsx # Filterable format gallery (UGC, 3D CGI, Memes, Landers)
│       ├── RoiCalculator.tsx  # Dynamic ad spend & profit simulator
│       ├── Pricing.tsx        # Transparent high-velocity growth tiers
│       ├── LeadModal.tsx      # Multi-step consultation booking modal with confetti
│       └── Footer.tsx         # Brand manifesto, links & newsletter subscription
```

---

## 📈 Roadmap

- [x] High-converting cyber-frost landing page with responsive layout
- [x] 38,450+ Global Agency & Meme Directory with live multi-dimensional search
- [x] Interactive AI Ad Roaster & Hook Lab lead magnet
- [x] Boring vs. AdverticeAF side-by-side comparison slider
- [x] Dynamic ROI & Spend Growth Simulator
- [x] Multi-step audit & consultation booking modal
- [x] CI/CD Pipeline via GitHub Actions
- [x] Cloudflare Pages production configuration with edge security headers
- [ ] Direct Gemini Multimodal Vision API integration for live URL & screenshot analysis
- [ ] Client portal for creative asset review and Figma/Frame.io handoffs
- [ ] Stripe checkout for self-serve Creative Sprints

---

## ☁️ Cloudflare Pages Production Deployment

### Option 1: Cloudflare Git Integration (Recommended)
1. Go to your **Cloudflare Dashboard** -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select your repository: `Leeshwaan04/adverticeaf`.
3. Set build configuration:
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Node.js version**: `22` (Set environment variable `NODE_VERSION` = `22`)
4. Click **Save and Deploy**. Cloudflare automatically builds and deploys to production on every push to `main` with instant preview URLs on pull requests.
5. In **Custom Domains**, bind `adverticeaf.com` with automatic free SSL/TLS encryption.

### Option 2: Automated GitHub Actions Workflow
The repository includes `.github/workflows/deploy.yml`. To enable automated deployments via GitHub Actions:
1. In your GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add two repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API Token with Pages edit permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found on your Cloudflare dashboard overview).
3. Every commit to `main` triggers automated linting, testing, and deployment to Cloudflare Pages.

