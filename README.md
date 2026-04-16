# ResolveHub - Campus Complaint Platform

ResolveHub is a modern, centralized platform designed for college campuses to efficiently raise, track, and manage student complaints. It features a tech-inspired, premium glassmorphism UI and a robust system for routing issues to the correct departments.

## Features

- **Student Portal**: Easily raise, view, and track the status of complaints. Include categories, descriptions, and optional image attachments.
- **Department Dashboard**: A Kanban-style board for department heads to manage incoming issues across "Pending", "In Progress", and "Resolved" states.
- **Automated Routing**: Complaints are routed automatically to the correct departments (IT, Maintenance, Cleaning, Academic, Admin).
- **Public Feed & Analytics**: View transparent analytics and a public feed of all recently reported campus issues.
- **Escalation System**: Students can escalate pending issues directly to the administration.

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Design System with Glassmorphism), and JavaScript.
- **Backend**: Node.js & Express.js architecture.
- **Database**: SQLite3.

## Setup Instructions

1. **Clone the repository**:
   Ensure you have installed [Node.js](https://nodejs.org/) on your machine.

2. **Install dependencies**:
   Run the following command in the root folder to install required Node packages (`express`, `sqlite3`, `cors`):
   ```bash
   npm install
   ```

3. **Run the server**:
   Start the Node server, which also spins up the SQLite database and initializes tables.
   ```bash
   node server.js
   ```

4. **Access the application**:
   Open `index.html` in your web browser. (Note: once the backend static serving is complete, you will be able to access it directly via `http://localhost:3000`).

## Hackathon Goal

ResolveHub was created to streamline campus infrastructure management and improve communication pipelines between students and administration through a fast, reliable, and aesthetically pleasing interface.
