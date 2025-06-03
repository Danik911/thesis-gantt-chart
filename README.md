# Thesis GANTT Chart Enhancement

An enhanced thesis management application that provides comprehensive dissertation organization tools for PhD candidates, supervisors, and viva commission members.

## 🎯 Project Overview

This project enhances the existing thesis GANTT chart application to provide advanced dissertation management capabilities. The enhanced application serves as a comprehensive thesis organization tool with the following key features:

- **Enhanced GANTT Chart Management**: Edit/rename rows, add new tasks, maintain timeline integrity
- **Primary Data Collection Module**: Systematic research management integration
- **Daily Progress Tracking**: Calendar-based documentation with file upload capabilities
- **Collaboration Features**: Multi-user access for supervisors and commission members

## 🚀 Live Demo

Visit the live application: [https://danik911.github.io/thesis-gantt-chart/](https://danik911.github.io/thesis-gantt-chart/)

## 🛠️ Technology Stack

- **Frontend**: React 18.2.0, JavaScript, HTML5, CSS3
- **Styling**: Tailwind CSS 3.3.5
- **Charts**: Recharts 2.15.2
- **Build Tools**: React Scripts 5.0.1
- **Deployment**: GitHub Pages
- **Version Control**: Git/GitHub

## 📋 Development Roadmap

### Phase 1: Foundation Enhancement (Current)
- ✅ Enhanced repository setup with development tools
- 🔄 Core GANTT improvements (row editing, dynamic creation/deletion)
- 🔄 Primary data collection module integration
- 🔄 Maintain existing timeline functionality

### Phase 2: Daily Progress System
- 📅 Calendar interface implementation (June 1 - September 1)
- 📁 Multi-file upload capability (PDF, M4A, WAV)
- 📝 Text note creation and management
- 🗂️ Tab-based navigation system

### Phase 3: GitHub Integration
- 🔐 GitHub OAuth authentication
- ☁️ Automated file storage system
- 🔗 Link generation for uploaded files
- 👥 Collaboration features

### Phase 4: Advanced Features
- 🎵 Audio file transcoding and optimization
- 📄 PDF metadata extraction and search
- 📊 Export capabilities for viva presentation
- 📱 Mobile responsiveness improvements

## 🏗️ Development Setup

### Prerequisites

- Node.js (v14.17.0 or later)
- npm (v6.14.13 or later)
- Git
- GitHub account for OAuth setup

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/thesis-gantt-chart.git
cd thesis-gantt-chart
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:

Create a `.env` file in the root directory with the following variables:

```env
# GitHub OAuth Configuration
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id_here
REACT_APP_GITHUB_CLIENT_SECRET=your_github_client_secret_here
REACT_APP_GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Important**: Never commit your `.env` file to version control. Add it to `.gitignore`.

4. Start the development server:
```bash
npm start
```