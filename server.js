const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const { Pool } = require('pg');

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
app.use(express.static('public'));

// Initialize database
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      balance DECIMAL(10,2) DEFAULT 0,
      stripe_customer_id VARCHAR(255),
      kyc_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      recipient_id INTEGER REFERENCES users(id),
      payment_method VARCHAR(50),
      stripe_payment_id VARCHAR(255),
      paypal_order_id VARCHAR(255),
      description TEXT,
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

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create Stripe customer
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

// User Login
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
        kyc_status: user.kyc_status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get User Profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, balance, kyc_status FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create Stripe Payment Intent
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
      'INSERT INTO transactions (user_id, type, amount, payment_method, stripe_payment_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'deposit', amount, 'stripe', paymentIntent.id]
    );

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Create PayPal Order
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
      'INSERT INTO transactions (user_id, type, amount, payment_method, paypal_order_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'deposit', amount, 'paypal', order.result.id]
    );

    res.json({ orderId: order.result.id });
  } catch (error) {
    console.error('PayPal order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// Capture PayPal Order
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

// Send Money
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
      'INSERT INTO transactions (user_id, type, amount, status, recipient_id, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'send', amount, 'completed', recipient.rows[0].id, description]
    );
    
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, status, recipient_id, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [recipient.rows[0].id, 'receive', amount, 'completed', req.user.id, description]
    );
    
    await pool.query('COMMIT');
    
    res.json({ success: true, message: 'Money sent successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Send money error:', error);
    res.status(500).json({ error: 'Failed to send money' });
  }
});

// Get Transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.email as recipient_email 
       FROM transactions t 
       LEFT JOIN users u ON t.recipient_id = u.id 
       WHERE t.user_id = $1 
       ORDER BY t.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get KYC Status
app.get('/api/kyc/status', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [req.user.id]);
    res.json({ status: user.rows[0].kyc_status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// Stripe Webhook
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

// PayPal Webhook
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
  console.log(`SwiftPay server running on port ${PORT}`);
});
