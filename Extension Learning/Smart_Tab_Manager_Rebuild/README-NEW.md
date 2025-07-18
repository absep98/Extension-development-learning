# 🚀 Smart Tab Manager Pro

A comprehensive Chrome Extension for intelligent tab management with AI-powered productivity insights, advanced analytics, and personalized browsing analysis.

## ✨ Features

### 🎯 **Core Tab Management**
- 🔍 **Live Search**: Filter open tabs by title or URL with instant results
- 📌 **Pin/Unpin Tabs**: Quick tab pinning for important pages
- ❌ **Smart Close**: Close tabs directly from the extension popup
- ⭐ **Favorites System**: Bookmark tabs under a special `Smart Tab Bookmarks` folder
- 🧠 **Duplicate Prevention**: Intelligent bookmarking that prevents duplicates

### 📊 **Advanced Analytics & AI Insights**
- 🤖 **AI-Powered Analysis**: GPT-4 style productivity insights from real browsing data
- 📈 **Time Tracking**: Accurate tab usage tracking with periodic backups
- 🏆 **Top Websites**: See your most visited sites with time breakdowns
- ⏰ **Peak Hours**: Discover your most productive time periods
- 📋 **Category Breakdown**: Automatic categorization (Productivity, Entertainment, Social, Education, News)
- 📅 **Weekly Trends**: Compare this week vs last week usage patterns

### 🎯 **Personalization & Customization**
- ⚙️ **Custom Categories**: Add your own domains to productivity/entertainment categories
- 💡 **Smart Suggestions**: AI suggests categories for uncategorized domains
- 🎨 **Visual Interface**: Clean, intuitive UI with emoji categorization
- 🔄 **Import/Export**: Backup and restore all your extension data

### 🔒 **Focus Mode & Productivity**
- 🚫 **Website Blocking**: Block distracting sites during focus sessions
- ⏰ **Temporary Unblocks**: Allow sites for specific time periods
- 🛡️ **Instant Blocking**: Network-level blocking using declarativeNetRequest API
- 📊 **Usage Analytics**: Track how focus mode improves your productivity

### 🛠️ **Advanced Features**
- 🎹 **Keyboard Shortcuts**: Quick actions (Ctrl+K for search, Ctrl+G for grouping)
- 👥 **Tab Grouping**: Automatically group tabs by domain
- 🔄 **Session Management**: Save and restore browsing sessions
- 🌙 **Dark Mode**: Automatic dark theme support
- ♿ **Accessibility**: Full keyboard navigation and screen reader support

## 🏗️ Architecture

### 📁 Project Structure
```
Smart_Tab_Manager_Rebuild/
├── manifest.json              # Extension configuration
├── popup.html                 # Main popup interface
├── popup.css                  # Styling and themes
├── popup.js                   # Main popup logic
├── background.js              # Service worker for tracking
├── settings.html              # Domain categorization settings
├── settings.js                # Settings page logic
├── analytics.html             # Analytics dashboard
├── analytics.js               # Charts and visualizations
├── blocked.html               # Focus mode blocked page
├── debug.html                 # Development testing tools
└── utils/
    ├── aiInsights.js          # AI analysis engine
    ├── aiInsightsUI.js        # AI insights UI components
    ├── bookmarks.js           # Bookmark management
    ├── focusMode.js           # Website blocking logic
    ├── grouping.js            # Tab grouping utilities
    ├── renderFavorites.js     # Favorites rendering
    ├── common.js              # Shared utilities & error handling
    ├── advanced-features.js   # Tab operations & data management
    ├── security.js            # Privacy & security features
    ├── performance.js         # Performance monitoring
    └── testing.js             # Automated testing suite
```

### 🔧 Technical Stack
- **Manifest V3**: Latest Chrome extension standard
- **JavaScript ES6+**: Modern JavaScript with modules
- **Chrome APIs**: tabs, storage, bookmarks, tabGroups, declarativeNetRequest
- **Chart.js**: Beautiful analytics visualizations
- **CSS3**: Modern styling with gradients and animations

## 📦 Installation

### For Development
1. Clone the repository:
   ```bash
   git clone https://github.com/absep98/Extension-development-learning.git
   cd "Extension Learning/Smart_Tab_Manager_Rebuild"
   ```

2. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable **Developer Mode**
   - Click **Load unpacked**
   - Select the project folder

### For Production
- Install from Chrome Web Store (coming soon)

## 🎮 Usage

### Basic Tab Management
1. **Search Tabs**: Type in the search box to filter open tabs
2. **Quick Actions**: Click tab entries to switch, use buttons to pin/close
3. **Favorites**: Click the star button to bookmark important tabs

### AI Insights
1. **View Analytics**: Click "📈 View Analytics" for detailed insights
2. **Customize Categories**: Click "⚙️ Settings" to add your domains
3. **Real-time Analysis**: All insights are generated from your actual browsing data

### Focus Mode
1. **Activate Focus**: Toggle focus mode in the popup
2. **Block Sites**: Add domains to block (e.g., `youtube.com`)
3. **Temporary Access**: Set unblock timers when needed

### Advanced Features
1. **Keyboard Shortcuts**:
   - `Ctrl+K`: Open search
   - `Ctrl+G`: Group tabs by domain
   - `Ctrl+E`: Export data
   - `Escape`: Clear search

2. **Data Management**:
   - Export backup from settings
   - Import previous backups
   - Auto-purge old data for privacy

## 🔒 Privacy & Security

### Data Handling
- ✅ **Local Storage Only**: All data stays on your device
- ✅ **No Network Requests**: Zero external data transmission
- ✅ **Anonymization Options**: Built-in data anonymization
- ✅ **Data Purging**: Automatic cleanup of old tracking data
- ✅ **Export Control**: Full control over your data

### Security Features
- 🛡️ **Input Sanitization**: All user inputs are properly sanitized
- 🔐 **Permission Validation**: Minimal required permissions
- 🕵️ **Privacy Reports**: See exactly what data is stored
- 🗑️ **Complete Wipe**: Option to delete all extension data

## 🧪 Testing

The extension includes a comprehensive testing suite:

```javascript
// Run tests in development
window.runTests();
```

### Test Coverage
- ✅ Storage operations
- ✅ Tab management
- ✅ AI categorization
- ✅ Performance benchmarks
- ✅ Security validation
- ✅ Privacy compliance
- ✅ UI component presence

## 📈 Performance

### Optimizations
- **Debounced Storage**: Prevents excessive write operations
- **Caching System**: Smart caching for frequently accessed data
- **Lazy Loading**: Components load only when needed
- **Memory Monitoring**: Built-in memory usage tracking

### Benchmarks
- Tab search: < 50ms
- Analytics generation: < 2s
- Category updates: < 100ms
- Storage operations: < 10ms

## 🎯 Resume Highlights

This project demonstrates:

### **Advanced Chrome Extension Development**
- ✅ Manifest V3 service workers
- ✅ Complex Chrome API integrations
- ✅ Real-time data processing
- ✅ Advanced user interface design

### **AI & Machine Learning Integration**
- ✅ GPT-4 style productivity insights
- ✅ Behavioral pattern recognition
- ✅ Real-time browsing analytics
- ✅ Personalized recommendations

### **Full-Stack Capabilities**
- ✅ Frontend: Modern JavaScript, CSS3, responsive design
- ✅ Backend: Service worker architecture, data management
- ✅ Database: Chrome storage API with caching
- ✅ Security: Privacy controls, data encryption

### **Professional Development Practices**
- ✅ Modular architecture with ES6 modules
- ✅ Comprehensive error handling
- ✅ Automated testing suite
- ✅ Performance monitoring
- ✅ Security best practices
- ✅ Accessibility compliance

## 🛣️ Roadmap

### Phase 1: Core Features ✅
- [x] Tab management and search
- [x] Time tracking system
- [x] AI-powered insights
- [x] Custom categorization

### Phase 2: Advanced Features ✅
- [x] Focus mode with blocking
- [x] Data export/import
- [x] Keyboard shortcuts
- [x] Dark mode support

### Phase 3: Enterprise Features 🔄
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Integration with productivity tools
- [ ] Cross-browser compatibility

### Phase 4: AI Enhancement 📋
- [ ] Natural language tab search
- [ ] Predictive tab suggestions
- [ ] Meeting detection and optimization
- [ ] Advanced productivity coaching

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chrome Extension APIs documentation
- Chart.js for beautiful visualizations
- AI insights inspired by modern productivity tools
- Community feedback and testing

---

**⭐ If this project helped you, please give it a star!**

*Built with ❤️ for productivity enthusiasts*
