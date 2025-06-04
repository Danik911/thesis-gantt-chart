# Thesis GANTT Chart Enhancement

An enhanced thesis management application that provides comprehensive dissertation organization tools for PhD candidates, supervisors, and viva commission members.

## 🎯 Project Overview

This project enhances the existing thesis GANTT chart application (originally from [Danik911/thesis-gantt-chart](https://github.com/danik911/thesis-gantt-chart)) to provide advanced dissertation management capabilities. The enhanced application serves as a comprehensive thesis organization tool with the following key features:

- **Enhanced GANTT Chart Management**: Edit/rename rows, add new tasks, maintain timeline integrity, dynamic task creation/deletion
- **Primary Data Collection Module**: Systematic research management integration
- **Daily Progress Tracking**: Calendar-based documentation with file upload capabilities (PDF, M4A, WAV)
- **Collaboration Features**: Multi-user access for supervisors and commission members via GitHub OAuth
- **Audio Processing**: Advanced transcoding and optimization for audio files
- **File Management**: Automated GitHub-based storage with link generation

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
- ✅ Enhanced repository setup with development tools (ESLint, Prettier, GitHub Actions)
- ✅ GitHub Pages deployment configuration
- ✅ Development environment with live-reload capability
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
git clone https://github.com/danik911/thesis-gantt-chart.git
cd thesis-gantt-chart
```

2. Create and switch to enhancement branch:
```bash
git checkout -b enhancement-phase-1
```

3. Install dependencies:
```bash
npm install
```

4. Set up your environment variables:

Create a `.env` file in the root directory with the following variables:

```env
# GitHub OAuth Configuration
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id_here
REACT_APP_GITHUB_CLIENT_SECRET=your_github_client_secret_here
REACT_APP_GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Important**: Never commit your `.env` file to version control. Add it to `.gitignore`.

5. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000` with live-reload enabled for development.

## 🏗️ Enhancement Goals

This enhanced version builds upon the original thesis-gantt-chart with the following improvements:

### Repository & Development Setup ✅
- Forked and enhanced repository structure
- Configured GitHub Actions for CI/CD
- Set up GitHub Pages for enhanced version deployment
- Integrated ESLint and Prettier for code quality
- Established development environment with live-reload

### Core GANTT Enhancements 🔄
- Editable row names and task descriptions
- Dynamic task creation and deletion capabilities
- Enhanced timeline integrity maintenance
- Improved user interaction patterns

### Data Collection Integration 🔄
- Primary data collection module integration
- Systematic research management capabilities
- Data organization and categorization features

### Daily Progress System 📋
- Calendar-based progress tracking (June 1 - September 1 timeline)
- Multi-file upload support (PDF, M4A, WAV files)
- Text note creation and management
- Tab-based navigation for different content types

### GitHub Integration 🔗
- OAuth authentication system
- Automated file storage in GitHub repositories
- Link generation for uploaded content
- Collaborative features for supervisors and commission members

### Advanced Features 🚀
- Audio transcoding and optimization
- PDF metadata extraction and search
- Export capabilities for viva presentations
- Enhanced mobile responsiveness

## 📊 Live Deployment

The enhanced application is automatically deployed via GitHub Actions to GitHub Pages:
- **Production URL**: [https://danik911.github.io/thesis-gantt-chart/](https://danik911.github.io/thesis-gantt-chart/)
- **Auto-deploy**: Triggered on push to `main` branch
- **CI/CD**: Full build, lint, and deployment pipeline

<!-- Trigger deploy -->