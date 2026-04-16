const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
const path = require('path');
app.use(express.static(__dirname));

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
                display_name TEXT,
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
            const stmt = db.prepare('INSERT OR IGNORE INTO departments (category, display_name, dept_head_id) VALUES (?, ?, ?)');
            stmt.run('IT', 'IT Support', 'HEAD_IT');
            stmt.run('Maintenance', 'Facility Management', 'HEAD_MAINT');
            stmt.run('Cleaning', 'Janitorial Services', 'HEAD_CLEAN');
            stmt.run('Academic', 'Academic Affairs', 'HEAD_ACAD');
            stmt.run('Admin', 'Administration', 'HEAD_ADMIN');
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
    const { id, category, description, imageUrl, status, isEscalated, date } = req.body;
    
    // Default student_id for prototyping
    const student_id = 'student_1';

    // Lookup department based on category
    db.get('SELECT display_name FROM departments WHERE category = ?', [category], (err, row) => {
        if (err || !row) {
            return res.status(400).json({ error: "Invalid category" });
        }
        
        const department = row.display_name;

        const sql = `INSERT INTO complaints (complaint_id, student_id, category, description, image_url, status, assigned_dept_id, is_escalated, date) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [id, student_id, category, description, imageUrl || null, status, department, isEscalated ? 1 : 0, date];

        db.run(sql, params, function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ message: "Complaint created successfully", id: id, department: department });
        });
    });
});

// Get analytics
app.get('/api/analytics', (req, res) => {
    db.all('SELECT status, is_escalated, assigned_dept_id FROM complaints', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const total = rows.length;
        const resolved = rows.filter(r => r.status === 'Resolved').length;
        const escalated = rows.filter(r => r.is_escalated === 1).length;
        
        const deptCounts = {};
        rows.forEach(r => {
            if (r.assigned_dept_id) {
                deptCounts[r.assigned_dept_id] = (deptCounts[r.assigned_dept_id] || 0) + 1;
            }
        });

        res.json({ total, resolved, escalated, deptCounts });
    });
});

// Get current mock user
app.get('/api/me', (req, res) => {
    res.json({ user_id: 'student_1', role: 'Student' });
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
