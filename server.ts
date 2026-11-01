/**
 * SmartSpend - Full Stack Node & Express Server
 * Coordinates the Python SQLite database layer (database/db_operations.py) with the web application.
 * Mounts Vite in development mode and serves the application on port 3000.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Helper to execute Python SQLite database commands safely
function callPythonDb(command: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'database', 'db_operations.py');
    const cliArgs = [pythonScript, command, ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))];

    execFile('python3', cliArgs, { maxBuffer: 15 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Database error executing ${command}:`, stderr || error.message);
        return reject(new Error(stderr || error.message));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.status === 'error') {
          return reject(new Error(parsed.message));
        }
        resolve(parsed.data !== undefined ? parsed.data : parsed);
      } catch (e: any) {
        console.error(`Failed to parse python output for ${command}:`, stdout);
        reject(new Error(`Failed to parse response: ${e.message}`));
      }
    });
  });
}

// Active session token storage with support for stateless fallback
const activeSessions: Record<string, number> = {
  'demo-token': 1
};

function getUserId(req: Request): number {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (token) {
    if (activeSessions[token]) return activeSessions[token];
    // Check for self-contained token format: token-<userId>-<timestamp>
    if (token.startsWith('token-')) {
      const parts = token.split('-');
      const parsedId = parseInt(parts[1], 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        activeSessions[token] = parsedId;
        return parsedId;
      }
    }
  }
  return 0; // 0 indicates unauthenticated
}

// Middleware to enforce authentication on private endpoints
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/auth/login' || req.path === '/auth/register') {
    return next();
  }
  const userId = getUserId(req);
  if (!userId || userId <= 0) {
    return res.status(401).json({ success: false, authenticated: false, error: 'Authentication required. Please log in.' });
  }
  next();
});

// ----------------- AUTHENTICATION API -----------------

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const user = await callPythonDb('auth', { email, password });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const token = 'token-' + user.id + '-' + Date.now();
    activeSessions[token] = user.id;
    res.json({ success: true, user, token });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    const user = await callPythonDb('register', { name, email, password, currency: 'INR' });
    const token = 'token-' + user.id + '-' + Date.now();
    activeSessions[token] = user.id;
    res.status(201).json({ success: true, user, token });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId || userId <= 0) {
      return res.status(401).json({ authenticated: false, error: 'Not authenticated' });
    }
    const user = await callPythonDb('get_user', userId);
    if (!user) {
      return res.status(401).json({ authenticated: false, error: 'User not found' });
    }
    res.json({
      authenticated: true,
      user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    delete activeSessions[token];
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/profile', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const updated = await callPythonDb('update_profile', userId, req.body);
    res.json({ success: true, user: updated, message: 'Profile updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------- DASHBOARD API -----------------

app.get('/api/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const data = await callPythonDb('dashboard', userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- TRANSACTIONS API -----------------

app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filters = {
      search: req.query.search || '',
      type: req.query.type || '',
      category: req.query.category || '',
      payment_method: req.query.payment_method || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
      sort_by: req.query.sort_by || 'date',
      sort_order: req.query.sort_order || 'desc',
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0
    };
    const result = await callPythonDb('get_transactions', userId, filters);
    res.json({ success: true, data: result.records, total: result.total });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { title, amount, type, category, date, payment_method, notes } = req.body;

    if (!title || !amount || !type || !category || !date) {
      return res.status(400).json({ success: false, error: 'Please fill all required transaction fields' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
    }

    const payload = {
      title: title.trim(),
      amount: Math.round(numAmount * 100) / 100,
      type: String(type).toLowerCase(),
      category: category.trim(),
      date: date.trim(),
      payment_method: payment_method || 'UPI',
      notes: notes || ''
    };

    const newTx = await callPythonDb('add_transaction', userId, payload);
    res.status(201).json({ success: true, message: 'Transaction recorded successfully', data: newTx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const txId = parseInt(req.params.id, 10);
    const { title, amount, type, category, date, payment_method, notes } = req.body;

    const payload = {
      title: title.trim(),
      amount: parseFloat(amount),
      type: String(type).toLowerCase(),
      category: category.trim(),
      date: date.trim(),
      payment_method: payment_method || 'UPI',
      notes: notes || ''
    };

    const updated = await callPythonDb('update_transaction', userId, txId, payload);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction updated successfully', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const txId = parseInt(req.params.id, 10);
    const result = await callPythonDb('delete_transaction', userId, txId);
    if (!result.deleted) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- CATEGORIES API -----------------

app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const categories = await callPythonDb('get_categories', userId);
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const newCat = await callPythonDb('add_category', userId, req.body);
    res.status(201).json({ success: true, data: newCat });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------- BUDGETS API -----------------

app.get('/api/budgets', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const budgetsData = await callPythonDb('get_budgets', userId, month);
    res.json({ success: true, data: budgetsData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/budgets', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { month, category, amount } = req.body;
    await callPythonDb('set_budget', userId, { month, category, amount: parseFloat(amount) });
    res.json({ success: true, message: `Budget for ${category} saved successfully` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/budgets/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const bId = parseInt(req.params.id, 10);
    const result = await callPythonDb('delete_budget', userId, bId);
    res.json({ success: true, deleted: result.deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- SAVINGS GOALS API -----------------

app.get('/api/savings-goals', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const goals = await callPythonDb('get_savings_goals', userId);
    res.json({ success: true, data: goals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/savings-goals', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const goalId = await callPythonDb('add_savings_goal', userId, req.body);
    res.status(201).json({ success: true, goal_id: goalId, message: 'Savings goal created' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/savings-goals/:id/contribute', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const goalId = parseInt(req.params.id, 10);
    const { amount, date, notes } = req.body;
    const result = await callPythonDb('add_savings_contribution', userId, {
      goal_id: goalId,
      amount: parseFloat(amount),
      date,
      notes
    });
    res.json({ success: true, message: 'Deposit recorded', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/savings-goals/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const goalId = parseInt(req.params.id, 10);
    const result = await callPythonDb('delete_savings_goal', userId, goalId);
    res.json({ success: true, deleted: result.deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- RECURRING TRANSACTIONS API -----------------

app.get('/api/recurring', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const items = await callPythonDb('get_recurring', userId);
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/recurring', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const recId = await callPythonDb('add_recurring', userId, req.body);
    res.status(201).json({ success: true, id: recId, message: 'Recurring rule created' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/recurring/process', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const resCount = await callPythonDb('process_recurring', userId);
    res.json({ success: true, processed_count: resCount.processed_count, message: `Processed ${resCount.processed_count} due transaction(s)` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/recurring/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const rId = parseInt(req.params.id, 10);
    const result = await callPythonDb('delete_recurring', userId, rId);
    res.json({ success: true, deleted: result.deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- ANALYTICS & CSV EXPORT API -----------------

app.get('/api/analytics', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const start = (req.query.start_date as string) || '';
    const end = (req.query.end_date as string) || '';
    const data = await callPythonDb('analytics', userId, start, end);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/export/csv', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await callPythonDb('get_transactions', userId, { limit: 10000 });
    let csv = 'ID,Date (YYYY-MM-DD),Title,Type,Category,Amount (INR),Payment Method,Notes,Created At\n';
    for (const t of result.records) {
      const escTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
      const escNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
      csv += `${t.id},${t.date},${escTitle},${t.type},${t.category},${t.amount.toFixed(2)},${t.payment_method || 'UPI'},${escNotes},${t.created_at || ''}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartspend_transactions.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- VITE INTEGRATION -----------------

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartSpend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
