const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// PayPal setup
const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_SECRET
  )
);

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));
app.use(express.static('public'));

// Initialize database with expanded schema
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      balance DECIMAL(10,2) DEFAULT 0,
      crypto_balance DECIMAL(18,8) DEFAULT 0,
      stripe_customer_id VARCHAR(255),
      mtn_phone VARCHAR(50),
      crypto_wallet_btc VARCHAR(255),
      crypto_wallet_eth VARCHAR(255),
      kyc_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(18,8) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'pending',
      recipient_id INTEGER REFERENCES users(id),
      payment_method VARCHAR(50),
      gateway VARCHAR(50),
      stripe_payment_id VARCHAR(255),
      paypal_order_id VARCHAR(255),
      crypto_tx_hash VARCHAR(255),
      mtn_reference VARCHAR(255),
      flutterwave_tx_id VARCHAR(255),
      paystack_reference VARCHAR(255),
      description TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crypto_addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      currency VARCHAR(10) NOT NULL,
      address VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

initDB().catch(console.error);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ==================== AUTHENTICATION ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await stripe.customers.create({ email });
    
    const result = await pool.query(
      'INSERT INTO users (email, password, stripe_customer_id) VALUES ($1, $2, $3) RETURNING id, email, balance, kyc_status',
      [email, hashedPassword, customer.id]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: result.rows[0] });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        balance: user.balance,
        crypto_balance: user.crypto_balance,
        kyc_status: user.kyc_status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, balance, crypto_balance, kyc_status, mtn_phone FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ==================== STRIPE PAYMENTS ====================

app.post('/api/payments/stripe/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: user.rows[0].stripe_customer_id,
      metadata: { user_id: req.user.id }
    });

    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, payment_method, gateway, stripe_payment_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'deposit', amount, 'USD', 'card', 'stripe', paymentIntent.id]
    );

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// ==================== PAYPAL PAYMENTS ====================

app.post('/api/payments/paypal/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2)
        }
      }]
    });

    const order = await paypalClient.execute(request);
    
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, payment_method, gateway, paypal_order_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'deposit', amount, 'USD', 'paypal', 'paypal', order.result.id]
    );

    res.json({ orderId: order.result.id });
  } catch (error) {
    console.error('PayPal order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

app.post('/api/payments/paypal/capture-order', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const capture = await paypalClient.execute(request);
    
    const transaction = await pool.query(
      'SELECT * FROM transactions WHERE paypal_order_id = $1',
      [orderId]
    );

    if (capture.result.status === 'COMPLETED') {
      await pool.query(
        'UPDATE transactions SET status = $1 WHERE paypal_order_id = $2',
        ['completed', orderId]
      );
      
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [transaction.rows[0].amount, req.user.id]
      );
    }

    res.json({ status: capture.result.status });
  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// ==================== CRYPTO PAYMENTS (Bitcoin/Ethereum) ====================

app.post('/api/payments/crypto/generate-address', authenticateToken, async (req, res) => {
  try {
    const { currency } = req.body; // BTC or ETH
    
    // Generate unique address (in production, use proper crypto wallet API)
    const address = currency === 'BTC' 
      ? `1${crypto.randomBytes(20).toString('hex').substring(0, 33)}`
      : `0x${crypto.randomBytes(20).toString('hex')}`;
    
    await pool.query(
      'INSERT INTO crypto_addresses (user_id, currency, address) VALUES ($1, $2, $3)',
      [req.user.id, currency, address]
    );

    res.json({ address, currency });
  } catch (error) {
    console.error('Crypto address error:', error);
    res.status(500).json({ error: 'Failed to generate crypto address' });
  }
});

app.post('/api/payments/crypto/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, txHash } = req.body;
    
    // In production, verify transaction on blockchain
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, payment_method, gateway, crypto_tx_hash, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [req.user.id, 'deposit', amount, currency, 'crypto', 'blockchain', txHash, 'pending']
    );

    res.json({ success: true, message: 'Crypto deposit pending verification' });
  } catch (error) {
    console.error('Crypto deposit error:', error);
    res.status(500).json({ error: 'Failed to process crypto deposit' });
  }
});

// ==================== MTN MOBILE MONEY ====================

app.post('/api/payments/mtn/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount, phone } = req.body;
    
    // MTN MoMo API integration
    const mtnResponse = await axios.post(
      'https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay',
      {
        amount: amount.toString(),
        currency: 'EUR',
        externalId: crypto.randomUUID(),
        payer: { partyIdType: 'MSISDN', partyId: phone },
        payerMessage: 'SwiftPay deposit',
        payeeNote: 'Deposit to wallet'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MTN_API_KEY}`,
          'X-Reference-Id': crypto.randomUUID(),
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY
        }
      }
    );

    const reference = mtnResponse.headers['x-reference-id'];
    
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, payment_method, gateway, mtn_reference) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'deposit', amount, 'EUR', 'mobile_money', 'mtn', reference]
    );

    res.json({ reference, status: 'pending' });
  } catch (error) {
    console.error('MTN MoMo error:', error);
    res.status(500).json({ error: 'Failed to initiate MTN payment' });
  }
});

app.get('/api/payments/mtn/status/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    
    const mtnResponse = await axios.get(
      `https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MTN_API_KEY}`,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY
        }
      }
    );

    if (mtnResponse.data.status === 'SUCCESSFUL') {
      await pool.query(
        'UPDATE transactions SET status = $1 WHERE mtn_reference = $2',
        ['completed', reference]
      );
      
      const transaction = await pool.query(
        'SELECT * FROM transactions WHERE mtn_reference = $1',
        [reference]
      );
      
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [transaction.rows[0].amount, req.user.id]
      );
    }

    res.json({ status: mtnResponse.data.status });
  } catch (error) {
    console.error('MTN status error:', error);
    res.status(500).json({ error: 'Failed to check MTN status' });
  }
});

// ==================== FLUTTERWAVE ====================

app.post('/api/payments/flutterwave/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    const flwResponse = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: crypto.randomUUID(),
        amount: amount,
        currency: currency || 'USD',
        redirect_url: `${process.env.APP_URL}/api/payments/flutterwave/callback`,
        customer: {
          email: req.user.email
        },
        customizations: {
          title: 'SwiftPay Deposit',
          description: 'Add money to wallet'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
        }
      }
    );

    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, payment_method, gateway, flutterwave_tx_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'deposit', amount, currency, 'card', 'flutterwave', flwResponse.data.data.id]
    );

    res.json({ paymentLink: flwResponse.data.data.link });
  } catch (error) {
    console.error('Flutterwave error:', error);
    res.status(500).json({ error: 'Failed to initiate Flutterwave payment' });
  }
});

// ==================== PAYSTACK ====================

app.post('/api/payments/paystack/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amount * 100, // Paystack uses kobo
        callback_url: `${process.env.APP_URL}/api/payments/paystack/callback`
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, payment_method, gateway, paystack_reference) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, 'deposit', amount, 'NGN', 'card', 'paystack', paystackResponse.data.data.reference]
    );

    res.json({ 
      authorizationUrl: paystackResponse.data.data.authorization_url,
      reference: paystackResponse.data.data.reference
    });
  } catch (error) {
    console.error('Paystack error:', error);
    res.status(500).json({ error: 'Failed to initiate Paystack payment' });
  }
});

// ==================== SEND MONEY ====================

app.post('/api/payments/send', authenticateToken, async (req, res) => {
  try {
    const { recipientEmail, amount, description } = req.body;
    
    const sender = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const recipient = await pool.query('SELECT * FROM users WHERE email = $1', [recipientEmail]);
    
    if (recipient.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    if (sender.rows[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [amount, req.user.id]
    );
    
    await pool.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount, recipient.rows[0].id]
    );
    
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, status, recipient_id, description, gateway) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [req.user.id, 'send', amount, 'USD', 'completed', recipient.rows[0].id, description, 'internal']
    );
    
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, currency, status, recipient_id, description, gateway) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [recipient.rows[0].id, 'receive', amount, 'USD', 'completed', req.user.id, description, 'internal']
    );
    
    await pool.query('COMMIT');
    
    res.json({ success: true, message: 'Money sent successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Send money error:', error);
    res.status(500).json({ error: 'Failed to send money' });
  }
});

// ==================== TRANSACTIONS ====================

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.email as recipient_email 
       FROM transactions t 
       LEFT JOIN users u ON t.recipient_id = u.id 
       WHERE t.user_id = $1 
       ORDER BY t.created_at DESC 
       LIMIT 100`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/kyc/status', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [req.user.id]);
    res.json({ status: user.rows[0].kyc_status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// ==================== WEBHOOKS ====================

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      await pool.query(
        'UPDATE transactions SET status = $1 WHERE stripe_payment_id = $2',
        ['completed', paymentIntent.id]
      );
      
      const transaction = await pool.query(
        'SELECT * FROM transactions WHERE stripe_payment_id = $1',
        [paymentIntent.id]
      );
      
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [transaction.rows[0].amount, transaction.rows[0].user_id]
      );
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

app.post('/api/webhooks/paypal', async (req, res) => {
  try {
    const event = req.body;
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = event.resource.supplementary_data.related_ids.order_id;
      await pool.query(
        'UPDATE transactions SET status = $1 WHERE paypal_order_id = $2',
        ['completed', orderId]
      );
    }
    res.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

app.listen(PORT, () => {
  console.log(`SwiftPay Multi-Gateway Server running on port ${PORT}`);
});
