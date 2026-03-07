# 💳 SwiftPay - Multi-Gateway Payment Platform

**The Ultimate All-in-One Payment Solution**

SwiftPay is a comprehensive fintech payment platform that integrates **ALL major payment gateways** including traditional processors, mobile money, and cryptocurrency.

## 🌟 Supported Payment Gateways

### 💳 Traditional Payment Processors
- **Stripe** - Credit/Debit Cards, ACH, Apple Pay, Google Pay
- **PayPal** - PayPal Balance, Credit Cards, PayPal Credit

### 📱 Mobile Money
- **MTN Mobile Money** - Africa's leading mobile payment solution

### 🌍 African Payment Gateways
- **Flutterwave** - Pan-African payment gateway (Cards, Mobile Money, Bank Transfers)
- **Paystack** - Nigerian payment gateway (Cards, Bank Transfers, USSD)

### ₿ Cryptocurrency
- **Bitcoin (BTC)** - Decentralized digital currency
- **Ethereum (ETH)** - Smart contract platform and cryptocurrency

### 🔄 Internal Transfers
- **Peer-to-Peer** - Instant transfers between SwiftPay users

## 🚀 Features

✅ **Multi-Gateway Support** - Accept payments from anywhere in the world
✅ **Cryptocurrency Integration** - Bitcoin & Ethereum support
✅ **Mobile Money** - MTN Mobile Money integration
✅ **Instant P2P Transfers** - Send money to other users instantly
✅ **Transaction History** - Complete audit trail of all transactions
✅ **KYC Management** - Built-in Know Your Customer verification
✅ **Webhook Support** - Real-time payment notifications
✅ **Secure Authentication** - JWT-based authentication system
✅ **PostgreSQL Database** - Reliable and scalable data storage
✅ **Beautiful UI** - Modern black & gold themed interface

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database
- API keys for payment gateways you want to use

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/BermudaLocals/swiftpay.git
cd swiftpay
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Set Up Database
The database tables will be created automatically on first run.

### 5. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3000`

## 🔑 API Keys Setup Guide

### Stripe
1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API keys
3. Set up webhooks at Dashboard → Developers → Webhooks

### PayPal
1. Create account at [developer.paypal.com](https://developer.paypal.com)
2. Create an app in Dashboard → My Apps & Credentials
3. Get Client ID and Secret

### MTN Mobile Money
1. Register at [momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Subscribe to Collections product
3. Generate API User and API Key

### Flutterwave
1. Sign up at [flutterwave.com](https://flutterwave.com)
2. Get API keys from Settings → API
3. Configure webhook URL

### Paystack
1. Create account at [paystack.com](https://paystack.com)
2. Get API keys from Settings → Developer/API
3. Set up webhook endpoint

### Cryptocurrency
For production crypto payments, integrate with:
- **BlockCypher** - Blockchain API service
- **Coinbase Commerce** - Crypto payment processor
- **BTCPay Server** - Self-hosted crypto payment processor

## 🌐 Deployment on Railway

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "SwiftPay multi-gateway platform"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `BermudaLocals/swiftpay`
   - Railway will auto-detect and deploy

3. **Add PostgreSQL Database**
   - In your Railway project, click "New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

4. **Configure Environment Variables** (See section below)

5. **Set Up Webhooks**
   - Stripe: `https://your-app.railway.app/api/webhooks/stripe`
   - PayPal: `https://your-app.railway.app/api/webhooks/paypal`

### Method 2: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## 🔐 Railway Environment Variables

Add these in Railway Dashboard → Variables:

```env
# Server
PORT=3000
NODE_ENV=production
APP_URL=https://your-app.railway.app

# Database (Auto-set by Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
PAYPAL_MODE=live

# MTN Mobile Money
MTN_API_KEY=your-mtn-api-key
MTN_SUBSCRIPTION_KEY=your-mtn-subscription-key
MTN_API_USER=your-mtn-api-user
MTN_API_SECRET=your-mtn-api-secret
MTN_ENVIRONMENT=production

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK...

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...

# Cryptocurrency
CRYPTO_API_KEY=your-crypto-api-key
CRYPTO_WEBHOOK_SECRET=your-crypto-webhook-secret
BTC_NETWORK=mainnet
ETH_NETWORK=mainnet
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/user/profile` - Get user profile

### Stripe Payments
- `POST /api/payments/stripe/create-intent` - Create payment intent

### PayPal Payments
- `POST /api/payments/paypal/create-order` - Create PayPal order
- `POST /api/payments/paypal/capture-order` - Capture PayPal payment

### Cryptocurrency
- `POST /api/payments/crypto/generate-address` - Generate crypto address
- `POST /api/payments/crypto/deposit` - Record crypto deposit

### MTN Mobile Money
- `POST /api/payments/mtn/initiate` - Initiate MTN payment
- `GET /api/payments/mtn/status/:reference` - Check payment status

### Flutterwave
- `POST /api/payments/flutterwave/initiate` - Initiate Flutterwave payment

### Paystack
- `POST /api/payments/paystack/initiate` - Initiate Paystack payment

### Transfers
- `POST /api/payments/send` - Send money to another user

### Transactions
- `GET /api/transactions` - Get transaction history
- `GET /api/kyc/status` - Get KYC verification status

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paypal` - PayPal webhook handler

## 🎨 Frontend Features

- **Login/Register** - Secure authentication
- **Dashboard** - Overview of balance and recent transactions
- **Add Money** - Multiple payment gateway options
- **Send Money** - P2P transfers to other users
- **Transaction History** - Complete transaction log
- **Responsive Design** - Works on all devices

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- SQL injection protection
- CORS configuration
- Rate limiting (ready to implement)
- Webhook signature verification

## 📊 Database Schema

### Users Table
- id, email, password, balance, crypto_balance
- stripe_customer_id, mtn_phone
- crypto_wallet_btc, crypto_wallet_eth
- kyc_status, created_at

### Transactions Table
- id, user_id, type, amount, currency, status
- recipient_id, payment_method, gateway
- stripe_payment_id, paypal_order_id
- crypto_tx_hash, mtn_reference
- flutterwave_tx_id, paystack_reference
- description, metadata, created_at

### Crypto Addresses Table
- id, user_id, currency, address, created_at

## 🧪 Testing

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### Test PayPal
Use PayPal sandbox accounts from developer.paypal.com

### Test MTN Mobile Money
Use MTN sandbox environment with test phone numbers

## 📝 License

MIT License - feel free to use for commercial projects

## 🤝 Support

For issues and questions:
- GitHub Issues: [github.com/BermudaLocals/swiftpay/issues](https://github.com/BermudaLocals/swiftpay/issues)
- Email: support@swiftpay.com

## 🚀 Roadmap

- [ ] Add more cryptocurrency support (Litecoin, Ripple, etc.)
- [ ] Implement recurring payments/subscriptions
- [ ] Add invoice generation
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Admin panel
- [ ] Two-factor authentication
- [ ] Email notifications
- [ ] SMS notifications

---

**Built with ❤️ by the SwiftPay Team**

*Making global payments accessible to everyone*
