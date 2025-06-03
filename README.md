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

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run deploy` - Deploys the app to GitHub Pages
- `npm run lint` - Runs ESLint for code quality checks
- `npm run format` - Formats code using Prettier

## 🏛️ Project Structure

```
thesis-gantt-chart/
├── public/                 # Static files
├── src/
│   ├── components/         # React components
│   │   └── WeeklyGanttChart.js
│   ├── App.js             # Main application component
│   ├── App.css            # Application styles
│   ├── index.js           # Application entry point
│   └── index.css          # Global styles
├── .github/
│   └── workflows/         # GitHub Actions workflows
├── package.json           # Project dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
└── README.md             # Project documentation
```

## 👥 Target Users

1. **PhD Candidate** (Primary): Complete thesis management and daily progress tracking
2. **Supervisor**: Review progress, access uploaded materials, monitor timeline
3. **Viva Commission**: Access final timeline and supporting documentation

## 🎯 Key Features

### Current Features
- Interactive GANTT chart visualization
- Timeline management for thesis tasks
- Responsive design with Tailwind CSS
- GitHub Pages deployment

### Planned Enhancements
- **Row Management**: Edit, add, and delete GANTT chart rows
- **Primary Data Collection**: Integrated research task management
- **Daily Progress Tracking**: Calendar-based documentation system
- **File Management**: Multi-format file upload and organization
- **Collaboration Tools**: Multi-user access and sharing capabilities

## 🔧 Development Guidelines

### Code Style
- Use Prettier for code formatting
- Follow ESLint rules for code quality
- Use meaningful variable and function names
- Write comments for complex logic

### Git Workflow
1. Create feature branches from `main`
2. Make small, focused commits
3. Use descriptive commit messages
4. Create pull requests for code review
5. Merge to `main` after approval

### Testing
- Write unit tests for new components
- Test responsiveness across devices
- Validate accessibility requirements
- Ensure cross-browser compatibility

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement-name`)
3. Commit your changes (`git commit -m 'Add some enhancement'`)
4. Push to the branch (`git push origin feature/enhancement-name`)
5. Open a Pull Request

## 📄 License

This project is private and intended for academic use in thesis management.

## 🤝 Support

For questions, suggestions, or issues, please create an issue in the GitHub repository or contact the development team.

## 🎓 Academic Context

This application is designed specifically for PhD thesis management, incorporating best practices for:
- Research timeline management
- Primary data collection organization
- Supervisor-student collaboration
- Viva preparation and documentation

---

**Version**: 0.1.0  
**Last Updated**: 2024  
**Status**: Active Development 