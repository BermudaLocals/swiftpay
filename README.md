# ⚡ SwiftPay - Lightning-Fast Payment Platform

A modern fintech payment platform built with Stripe and PayPal integration for secure, compliant transactions.

## 🚀 Features

- **User Authentication** - Secure JWT-based login and registration
- **Multiple Payment Methods** - Stripe (cards) and PayPal integration
- **Peer-to-Peer Transfers** - Send money between SwiftPay users
- **Wallet System** - Track balance and transaction history
- **KYC Integration** - Stripe handles identity verification
- **Real-time Webhooks** - Automatic payment status updates
- **Beautiful UI** - Black and gold themed responsive design

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Payments**: Stripe, PayPal SDK
- **Auth**: JWT, bcrypt
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- Stripe account (test/live keys)
- PayPal developer account

## 🔧 Environment Variables

Add these to your Railway project:

```env
DATABASE_URL=postgresql://user:password@host:port/database
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
PORT=3000
```

## 🚀 Deployment to Railway

1. **Connect Repository**
   - Go to Railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `BermudaLocals/swiftpay`

2. **Add Environment Variables**
   - Go to project settings → Variables
   - Add all required environment variables listed above

3. **Add PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set DATABASE_URL

4. **Deploy**
   - Railway will automatically build and deploy
   - Your app will be live at: `https://swiftpay-production.up.railway.app`

## 💻 Local Development

```bash
# Install dependencies
npm install

# Create .env file with your credentials
cp .env.example .env

# Run development server
npm run dev

# Or production mode
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account
- `GET /api/user/profile` - Get user profile (requires auth)

### Payments
- `POST /api/payments/stripe/create-intent` - Create Stripe payment
- `POST /api/payments/paypal/create-order` - Create PayPal order
- `POST /api/payments/paypal/capture-order` - Capture PayPal payment
- `POST /api/payments/send` - Send money to another user

### Transactions
- `GET /api/transactions` - Get transaction history
- `GET /api/kyc/status` - Get KYC verification status

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paypal` - PayPal webhook handler

## 🔐 Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection protection with parameterized queries
- CORS enabled for secure cross-origin requests
- Environment variable protection
- Stripe customer isolation

## 📊 Database Schema

### Users Table
```sql
id SERIAL PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password VARCHAR(255) NOT NULL
balance DECIMAL(10,2) DEFAULT 0
stripe_customer_id VARCHAR(255)
kyc_status VARCHAR(50) DEFAULT 'pending'
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Transactions Table
```sql
id SERIAL PRIMARY KEY
user_id INTEGER REFERENCES users(id)
type VARCHAR(50) NOT NULL
amount DECIMAL(10,2) NOT NULL
status VARCHAR(50) DEFAULT 'pending'
recipient_id INTEGER REFERENCES users(id)
payment_method VARCHAR(50)
stripe_payment_id VARCHAR(255)
paypal_order_id VARCHAR(255)
description TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## 🎨 Frontend Features

- Responsive design (mobile-first)
- Real-time balance updates
- Transaction history table
- Multiple payment method selection
- Form validation
- Error handling with user-friendly messages
- Loading states and animations

## 📝 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

## 📧 Support

For issues or questions, open a GitHub issue or contact the team.

---

**Built with ⚡ by the SwiftPay Team**
