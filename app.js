// Backend API configuration
const API_BASE = '/api';

// Data Store (Fetched from Backend)
let complaints = [];

// State
let currentView = 'student'; // 'student' | 'department'
let currentDeptFilter = 'All';
let currentAnalyticsTab = 'All';
let notifications = [];
let notifCount = 0;
let currentUser = null;

async function fetchComplaints() {
    try {
        const res = await fetch(`${API_BASE}/complaints`);
        if (res.ok) {
            complaints = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch complaints from server. Make sure it is running.", e);
        pushNotification('⚠️ Check if Backend Server is running at :3000');
    }
}

// DOM Elements
const mainContent = document.getElementById('main-content');
const navStudent = document.getElementById('nav-student');
const navDept = document.getElementById('nav-department');
const navAnalytics = document.getElementById('nav-analytics');
const navFeed = document.getElementById('nav-feed');
const navNotificationsBtn = document.getElementById('nav-notifications');
const notifBadge = document.getElementById('notif-badge');
const toastContainer = document.getElementById('toast-container');

// Templates
const tplStudent = document.getElementById('tpl-student-portal');
const tplDept = document.getElementById('tpl-department-dashboard');
const tplAnalytics = document.getElementById('tpl-analytics');
const tplFeed = document.getElementById('tpl-public-feed');
const tplNotifications = document.getElementById('tpl-notifications');
const tplCard = document.getElementById('tpl-complaint-card');

// Initialization
function init() {
    initAuth();
}

async function initApp() {
    setupNavigation();
    setupSidebarToggle();
    setupNotifications();
    setupFAB();
    await fetchComplaints();
    renderView();
}

function initAuth() {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
        currentUser = JSON.parse(stored);
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';

    const loginRole = document.getElementById('login-role');
    const loginUser = document.getElementById('login-username');
    loginRole.addEventListener('change', () => {
        loginUser.value = (loginRole.value === 'Admin') ? 'admin_1' : 'student_1';
    });
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = loginRole.value;
        const btn = e.target.querySelector('button');
        btn.textContent = 'Logging in...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            if (res.ok) {
                currentUser = await res.json();
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showApp();
            }
        } catch(err) {
            console.error(err);
        } finally {
            btn.textContent = 'Log In';
            btn.disabled = false;
        }
    });
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    const fabBtn = document.getElementById('fab-btn');

    if (currentUser.role === 'Student') {
        navDept.style.display = 'none';
        currentView = 'student';
    } else {
        navStudent.style.display = 'none';
        fabBtn.style.display = 'none';
        currentView = 'department';
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (currentUser.role === 'Student') {
        navStudent.classList.add('active');
    } else {
        navDept.classList.add('active');
    }

    document.getElementById('nav-logout').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        currentUser = null;
        window.location.reload();
    });

    initApp();
}

function setupNavigation() {
    navStudent.addEventListener('click', () => switchView('student', navStudent));
    navDept.addEventListener('click', () => switchView('department', navDept));
    navAnalytics.addEventListener('click', () => switchView('analytics', navAnalytics));
    navFeed.addEventListener('click', () => switchView('feed', navFeed));
    navNotificationsBtn.addEventListener('click', () => switchView('notifications', navNotificationsBtn));
}

function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const mainContent = document.getElementById('main-content');

    function applyCollapsed(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        mainContent.classList.toggle('sidebar-collapsed', collapsed);
    }

    // Restore saved state
    applyCollapsed(localStorage.getItem('sidebarCollapsed') === 'true');

    toggleBtn.addEventListener('click', () => {
        const isNowCollapsed = !sidebar.classList.contains('collapsed');
        applyCollapsed(isNowCollapsed);
        localStorage.setItem('sidebarCollapsed', isNowCollapsed);
    });
}

function switchView(viewName, activeBtn) {
    currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    renderView();
}

function setupNotifications() {
    // Badge starts hidden
    notifBadge.classList.add('hidden');
}

function setupFAB() {
    const fabBtn     = document.getElementById('fab-btn');
    const fabOverlay = document.getElementById('fab-overlay');
    const fabClose   = document.getElementById('fab-close');
    const fabForm    = document.getElementById('fab-complaint-form');

    function openFAB() {
        fabBtn.classList.add('open');
        fabOverlay.classList.add('open');
        fabOverlay.setAttribute('aria-hidden', 'false');
        fabOverlay.querySelector('#fab-category').focus();
    }

    function closeFAB() {
        fabBtn.classList.remove('open');
        fabOverlay.classList.remove('open');
        fabOverlay.setAttribute('aria-hidden', 'true');
        fabForm.reset();
    }

    fabBtn.addEventListener('click', () => {
        fabOverlay.classList.contains('open') ? closeFAB() : openFAB();
    });

    fabClose.addEventListener('click', closeFAB);

    // Close on backdrop click (not on the modal itself)
    fabOverlay.addEventListener('click', (e) => {
        if (e.target === fabOverlay) closeFAB();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fabOverlay.classList.contains('open')) closeFAB();
    });

    // Handle form submission
    fabForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = fabForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        const category    = document.getElementById('fab-category').value;
        const description = document.getElementById('fab-description').value;
        const imageFile   = document.getElementById('fab-image').files[0];

        const newComplaint = {
            id:          'TKT-' + Math.floor(1000 + Math.random() * 9000),
            category,
            description,
            status:      'Pending',
            isEscalated: false,
            date:        new Date().toLocaleDateString(),
            imageUrl:    null,
            studentId:   currentUser.user_id
        };

        async function finalize() {
            try {
                const res = await fetch(`${API_BASE}/complaints`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newComplaint)
                });
                if (res.ok) {
                    const resData = await res.json();
                    newComplaint.department = resData.department;
                    complaints.unshift(newComplaint);
                    pushNotification(`✅ New complaint submitted: ${newComplaint.id}`);
                    closeFAB();
                    if (currentView === 'student') renderStudentComplaints();
                    if (currentView === 'department') renderKanban();
                    if (currentView === 'feed') setupPublicFeed();
                    if (currentView === 'analytics') renderAnalytics();
                } else {
                    pushNotification('❌ Failed to save complaint to server.');
                }
            } catch (err) {
                pushNotification('❌ Error communicating with the server.');
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Submit Complaint';
            }
        }

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                newComplaint.imageUrl = ev.target.result;
                finalize();
            };
            reader.readAsDataURL(imageFile);
        } else {
            finalize();
        }
    });
}


function pushNotification(message) {
    const notif = { message, time: new Date().toLocaleTimeString(), read: false };
    notifications.unshift(notif);

    // Show red dot badge
    notifBadge.classList.remove('hidden');

    // Show toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderView() {
    mainContent.innerHTML = '';

    if (currentView === 'student') {
        mainContent.appendChild(tplStudent.content.cloneNode(true));
        setupStudentPortal();
    } else if (currentView === 'department') {
        mainContent.appendChild(tplDept.content.cloneNode(true));
        setupDepartmentDashboard();
    } else if (currentView === 'analytics') {
        mainContent.appendChild(tplAnalytics.content.cloneNode(true));
        setupAnalytics();
    } else if (currentView === 'feed') {
        mainContent.appendChild(tplFeed.content.cloneNode(true));
        setupPublicFeed();
    } else if (currentView === 'notifications') {
        mainContent.appendChild(tplNotifications.content.cloneNode(true));
        setupNotificationsPage();
    }
}

// Notifications Page Logic
function setupNotificationsPage() {
    // Hide dot when page is opened
    notifCount = 0;
    notifBadge.classList.add('hidden');

    const list = document.getElementById('notif-page-list');
    const markBtn = document.getElementById('mark-all-read');
    const clearBtn = document.getElementById('clear-all-notifs');

    function renderNotifList() {
        list.innerHTML = '';
        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notif-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <p>You're all caught up! No notifications yet.</p>
                </div>`;
            return;
        }
        notifications.forEach((n, i) => {
            const item = document.createElement('div');
            item.className = 'notif-page-item' + (n.read ? '' : ' unread');
            item.style.animationDelay = `${i * 0.04}s`;
            item.innerHTML = `
                <div class="notif-dot ${n.read ? 'read' : ''}"></div>
                <div class="notif-page-body">
                    <div class="notif-page-msg">${n.message}</div>
                    <div class="notif-page-time">${n.time}</div>
                </div>`;
            list.appendChild(item);
        });
    }

    renderNotifList();

    markBtn.addEventListener('click', () => {
        notifications.forEach(n => n.read = true);
        renderNotifList();
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            notifications = [];
            renderNotifList();
        });
    }
}

// Student Portal Logic
function setupStudentPortal() {
    renderStudentComplaints();
}

function renderStudentComplaints() {
    const list = document.getElementById('student-complaints-list');
    list.innerHTML = '';

    const activeComplaints = complaints.filter(c => c.status === 'Pending' || c.status === 'In Progress');

    if (activeComplaints.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted)">No active complaints at the moment.</p>';
        return;
    }

    activeComplaints.forEach(c => {
        const card = createCardElement(c, false);
        list.appendChild(card);
    });
}

// Department Dashboard Logic
function setupDepartmentDashboard() {
    const filter = document.getElementById('dept-filter');
    filter.value = currentDeptFilter;

    filter.addEventListener('change', (e) => {
        currentDeptFilter = e.target.value;
        renderKanban();
    });

    const tabs = document.querySelectorAll('.dashboard-tabs .tab-btn');
    const columns = document.querySelectorAll('.kanban-board .kanban-column');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetStatus = tab.dataset.target;
            columns.forEach(col => {
                if (col.dataset.status === targetStatus) {
                    col.classList.add('active');
                } else {
                    col.classList.remove('active');
                }
            });
        });
    });

    renderKanban();
}

function renderKanban() {
    const pendingBoard = document.getElementById('board-pending');
    const inProgressBoard = document.getElementById('board-in-progress');
    const resolvedBoard = document.getElementById('board-resolved');

    pendingBoard.innerHTML = '';
    inProgressBoard.innerHTML = '';
    resolvedBoard.innerHTML = '';

    const filtered = currentDeptFilter === 'All'
        ? complaints
        : complaints.filter(c => c.department === currentDeptFilter);

    filtered.forEach(c => {
        const card = createCardElement(c, true);
        if (c.status === 'Pending') pendingBoard.appendChild(card);
        else if (c.status === 'In Progress') inProgressBoard.appendChild(card);
        else if (c.status === 'Resolved') resolvedBoard.appendChild(card);
    });
}

// Shared Card Logic
function createCardElement(data, isDeptView) {
    const clone = tplCard.content.cloneNode(true);
    const card = clone.querySelector('.complaint-card');
    const body = clone.querySelector('.card-body');

    // Show attached image if present
    const img = clone.querySelector('.card-image');
    if (data.imageUrl) {
        img.src = data.imageUrl;
        img.style.display = 'block';
    }

    if (data.isEscalated) {
        card.classList.add('is-escalated');
        body.querySelector('.escalated-badge').style.display = 'inline-block';
    }

    body.querySelector('.category-badge').textContent = data.category;

    const statusBadge = body.querySelector('.status-badge');
    statusBadge.textContent = data.status;
    statusBadge.classList.add(data.status.toLowerCase().replace(' ', '-'));

    body.querySelector('.description').textContent = data.description;
    body.querySelector('.ticket-id').textContent = data.id + ' • ' + (isDeptView ? data.department : 'You');
    body.querySelector('.date').textContent = data.date;

    if (isDeptView) {
        const actionBar = body.querySelector('.action-bar');
        actionBar.style.display = 'block';

        const select = body.querySelector('.status-update');
        select.value = data.status;

        select.addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            const previousStatus = data.status;
            
            // Optimistic update
            data.status = newStatus;
            renderKanban();

            try {
                const res = await fetch(`${API_BASE}/complaints/${data.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (res.ok) {
                    pushNotification(`Complaint ${data.id} status changed to ${newStatus}`);
                } else {
                    data.status = previousStatus;
                    renderKanban();
                    pushNotification('❌ Failed to update status.');
                }
            } catch (err) {
                data.status = previousStatus;
                renderKanban();
                pushNotification('❌ Server error. Status reverted.');
                console.error(err);
            }
        });
    } else {
        if (data.status === 'Pending' && !data.isEscalated) {
            const escalateBar = body.querySelector('.escalate-bar');
            escalateBar.style.display = 'block';

            const escalateBtn = body.querySelector('.escalate-btn');
            escalateBtn.addEventListener('click', async () => {
                try {
                    const res = await fetch(`${API_BASE}/complaints/${data.id}/escalate`, { method: 'PUT' });
                    if (res.ok) {
                        data.isEscalated = true;
                        pushNotification(`Complaint ${data.id} has been escalated to administration.`);
                        renderView();
                    } else {
                        pushNotification('❌ Failed to escalate complaint.');
                    }
                } catch (err) {
                    pushNotification('❌ Server error while escalating.');
                    console.error(err);
                }
            });
        }
    }

    return card;
}

// Analytics Logic
function setupAnalytics() {
    const tabs = document.querySelectorAll('#analytics-tabs .tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentAnalyticsTab = tab.dataset.target;
            analyticsOpenPanel = null; // close any open complaint list when switching dept tab
            renderAnalytics();
        });
    });

    // Ensure the state matches the active tab visually on load
    currentAnalyticsTab = 'All';
    analyticsOpenPanel = null;
    renderAnalytics();
}

// Track which stat panel is open ('all' | 'Resolved' | 'Pending' | null)
let analyticsOpenPanel = null;

function renderAnalytics() {
    const chartContainer = document.getElementById('analytics-chart-container');
    if (!chartContainer) return;

    const filtered = currentAnalyticsTab === 'All' 
        ? complaints 
        : complaints.filter(c => c.department === currentAnalyticsTab);
    
    const total = filtered.length;
    const resolved = filtered.filter(c => c.status === 'Resolved').length;
    const pending = filtered.filter(c => c.status === 'Pending').length;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-resolved').textContent = resolved;
    document.getElementById('stat-pending').textContent = pending;

    // Wire up stat card clicks (once per render — remove old listeners by replacing nodes)
    ['stat-card-total', 'stat-card-resolved', 'stat-card-pending'].forEach(cardId => {
        const card = document.getElementById(cardId);
        if (!card) return;
        // Clone to drop any old listeners
        const fresh = card.cloneNode(true);
        card.parentNode.replaceChild(fresh, card);
        fresh.addEventListener('click', () => {
            const filter = fresh.dataset.filter; // 'all' | 'Resolved' | 'Pending'
            if (analyticsOpenPanel === filter) {
                // Toggle off
                analyticsOpenPanel = null;
                document.querySelectorAll('.stat-card-clickable').forEach(c => c.classList.remove('stat-card-active'));
                closeAnalyticsComplaintList();
            } else {
                analyticsOpenPanel = filter;
                document.querySelectorAll('.stat-card-clickable').forEach(c => c.classList.remove('stat-card-active'));
                fresh.classList.add('stat-card-active');
                const pool = filtered.filter(c => filter === 'all' || c.status === filter);
                showAnalyticsComplaintList(pool, filter === 'all' ? 'All Complaints' : filter + ' Complaints');
            }
        });
    });

    // Re-apply active state if a panel was open before a tab switch
    if (analyticsOpenPanel) {
        const activeCard = document.querySelector(`[data-filter="${analyticsOpenPanel}"]`);
        if (activeCard) {
            activeCard.classList.add('stat-card-active');
            const pool = filtered.filter(c => analyticsOpenPanel === 'all' || c.status === analyticsOpenPanel);
            showAnalyticsComplaintList(pool, analyticsOpenPanel === 'all' ? 'All Complaints' : analyticsOpenPanel + ' Complaints');
        }
    } else {
        closeAnalyticsComplaintList();
    }

    if (currentAnalyticsTab === 'All') {
        chartContainer.style.display = 'block';
        
        const deptCounts = {};
        filtered.forEach(r => {
            if (r.department) {
                deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
            }
        });
        
        const barsContainer = document.getElementById('chart-bars');
        barsContainer.innerHTML = '';
        
        const counts = Object.values(deptCounts);
        const maxVal = counts.length > 0 ? Math.max(...counts) : 1;

        Object.entries(deptCounts).forEach(([dept, count]) => {
            const pct = (count / maxVal) * 100;
            const row = document.createElement('div');
            row.className = 'bar-row';
            row.innerHTML = `
                <div class="bar-label">${dept}</div>
                <div class="bar-track"><div class="bar-fill" style="width: 0%"></div></div>
                <div class="bar-value">${count}</div>
            `;
            barsContainer.appendChild(row);

            setTimeout(() => {
                row.querySelector('.bar-fill').style.width = pct + '%';
            }, 50);
        });
    } else {
        chartContainer.style.display = 'none';
    }
}

function showAnalyticsComplaintList(pool, title) {
    const container = document.getElementById('analytics-complaint-list');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = '';

    // Header row
    const header = document.createElement('div');
    header.className = 'analytics-list-header';
    header.innerHTML = `
        <h3>${title} <span class="analytics-list-count">${pool.length}</span></h3>
        <button class="analytics-list-close" title="Close" id="analytics-list-close-btn">✕</button>
    `;
    container.appendChild(header);

    document.getElementById('analytics-list-close-btn').addEventListener('click', () => {
        analyticsOpenPanel = null;
        document.querySelectorAll('.stat-card-clickable').forEach(c => c.classList.remove('stat-card-active'));
        closeAnalyticsComplaintList();
    });

    if (pool.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'analytics-list-empty';
        empty.textContent = 'No complaints in this category.';
        container.appendChild(empty);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'complaints-list';
    pool.forEach(c => {
        const clone = tplCard.content.cloneNode(true);
        const card = clone.querySelector('.complaint-card');
        if (c.isEscalated) {
            card.classList.add('is-escalated');
            clone.querySelector('.escalated-badge').style.display = 'inline-block';
        }
        clone.querySelector('.category-badge').textContent = c.category;
        const sb = clone.querySelector('.status-badge');
        sb.textContent = c.status;
        sb.classList.add(c.status.toLowerCase().replace(' ', '-'));
        clone.querySelector('.description').textContent = c.description;
        clone.querySelector('.ticket-id').textContent = c.id + ' • ' + (c.department || '—');
        clone.querySelector('.date').textContent = c.date;
        grid.appendChild(card);
    });
    container.appendChild(grid);

    // Smooth scroll to list
    setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function closeAnalyticsComplaintList() {
    const container = document.getElementById('analytics-complaint-list');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// Public Feed Logic
function setupPublicFeed() {
    const list = document.getElementById('public-feed-list');
    list.innerHTML = '';

    if (complaints.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted)">No issues reported yet.</p>';
        return;
    }

    complaints.forEach(c => {
        const clone = tplCard.content.cloneNode(true);
        const card = clone.querySelector('.complaint-card');

        if (c.isEscalated) {
            card.classList.add('is-escalated');
            clone.querySelector('.escalated-badge').style.display = 'inline-block';
        }

        clone.querySelector('.category-badge').textContent = c.category;

        const statusBadge = clone.querySelector('.status-badge');
        statusBadge.textContent = c.status;
        statusBadge.classList.add(c.status.toLowerCase().replace(' ', '-'));

        clone.querySelector('.description').textContent = c.description;
        clone.querySelector('.ticket-id').textContent = c.id + ' • ' + c.department;
        clone.querySelector('.date').textContent = c.date;

        list.appendChild(card);
    });
}

// Start
init();
