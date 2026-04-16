const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                role TEXT,
                department_id TEXT
            )`);

            // Departments Table
            db.run(`CREATE TABLE IF NOT EXISTS departments (
                category TEXT PRIMARY KEY,
                dept_head_id TEXT
            )`);

            // Complaints Table
            db.run(`CREATE TABLE IF NOT EXISTS complaints (
                complaint_id TEXT PRIMARY KEY,
                student_id TEXT,
                category TEXT,
                description TEXT,
                image_url TEXT,
                status TEXT,
                assigned_dept_id TEXT,
                is_escalated INTEGER,
                date TEXT
            )`);

            // Seed Departments
            const stmt = db.prepare('INSERT OR IGNORE INTO departments (category, dept_head_id) VALUES (?, ?)');
            stmt.run('IT', 'HEAD_IT');
            stmt.run('Maintenance', 'HEAD_MAINT');
            stmt.run('Cleaning', 'HEAD_CLEAN');
            stmt.run('Academic', 'HEAD_ACAD');
            stmt.run('Admin', 'HEAD_ADMIN');
            stmt.finalize();
            
            // Seed a default student
            db.run(`INSERT OR IGNORE INTO users (user_id, role, department_id) VALUES ('student_1', 'Student', NULL)`);
        });
    }
});

// API Routes

// Get all complaints
app.get('/api/complaints', (req, res) => {
    db.all('SELECT * FROM complaints ORDER BY rowid DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const mapped = rows.map(r => ({
            id: r.complaint_id,
            category: r.category,
            department: r.assigned_dept_id,
            description: r.description,
            imageUrl: r.image_url,
            status: r.status,
            isEscalated: r.is_escalated === 1,
            date: r.date
        }));
        res.json(mapped);
    });
});

// Create a new complaint
app.post('/api/complaints', (req, res) => {
    const { id, category, department, description, imageUrl, status, isEscalated, date } = req.body;
    
    // Default student_id for prototyping
    const student_id = 'student_1';

    const sql = `INSERT INTO complaints (complaint_id, student_id, category, description, image_url, status, assigned_dept_id, is_escalated, date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [id, student_id, category, description, imageUrl || null, status, department, isEscalated ? 1 : 0, date];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "Complaint created successfully", id: id });
    });
});

// Update complaint status
app.put('/api/complaints/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const sql = `UPDATE complaints SET status = ? WHERE complaint_id = ?`;
    db.run(sql, [status, id], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "Status updated successfully", changes: this.changes });
    });
});

// Escalate complaint
app.put('/api/complaints/:id/escalate', (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE complaints SET is_escalated = 1 WHERE complaint_id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "Escalated successfully", changes: this.changes });
    });
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
