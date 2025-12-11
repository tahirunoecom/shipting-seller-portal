# Shipting Seller Portal

A modern React-based seller portal for the Shipting e-commerce platform. Built with React, Vite, and Tailwind CSS.

## Features

- 📊 **Dashboard** - Overview of orders, products, and revenue
- 📦 **Product Management** - Add, edit, and manage products
- 🛒 **Order Management** - View and process customer orders
- 💬 **WhatsApp Integration** - Configure WhatsApp bot settings
- 💳 **Payment Integration** - Stripe Connect for payments
- ⚙️ **Settings** - Profile, store, and notification settings

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Recharts** - Charts
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tahirunoecom/shipting-seller-portal.git
cd shipting-seller-portal
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
VITE_API_BASE_URL=https://stageshipperapi.thedelivio.com/api
VITE_BASIC_AUTH_USERNAME=5
VITE_BASIC_AUTH_PASSWORD=your_basic_auth_password
```

5. Start development server:
```bash
npm run dev
```

6. Open http://localhost:3000 in your browser

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── ui/              # Base UI components (Button, Input, Card, etc.)
│   ├── layout/          # Layout components (Sidebar, Header)
│   └── forms/           # Form components
├── pages/               # Page components
│   ├── auth/            # Login, Register
│   ├── dashboard/       # Dashboard
│   ├── products/        # Products management
│   ├── orders/          # Orders management
│   └── settings/        # Settings
├── services/            # API service layer
├── store/               # Zustand stores
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── App.jsx              # Main app with routing
```

## API Integration

The portal integrates with the Shipting API:

- **Base URL**: `https://stageshipperapi.thedelivio.com/api`
- **Auth**: Basic Auth + Bearer Token
- **Key Endpoints**:
  - `POST /login` - User authentication
  - `POST /getSellerProducts` - Get products
  - `POST /getShipperOrders` - Get orders
  - `POST /OrderAccept` - Accept order
  - `POST /EditProductsToShipper` - Edit product

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API base URL |
| `VITE_BASIC_AUTH_USERNAME` | Basic auth username |
| `VITE_BASIC_AUTH_PASSWORD` | Basic auth password |

## Development

### Code Style

- ESLint for linting
- Prettier for formatting (recommended)
- Follow React best practices

### Adding New Pages

1. Create page component in `src/pages/[category]/`
2. Add route in `src/App.jsx`
3. Add sidebar link in `src/components/layout/Sidebar.jsx`

### Adding New API Endpoints

1. Add function in appropriate service file (`src/services/`)
2. Export from `src/services/index.js`

## Deployment

### Deploy to seller.shipting.com

1. Build the project:
```bash
npm run build
```

2. Upload `dist` folder contents to server

3. Configure Apache/Nginx for SPA routing:
```apache
<Directory /var/www/seller.shipting.com>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</Directory>
```

## License

Private - All rights reserved

## Support

For support, contact the development team.
