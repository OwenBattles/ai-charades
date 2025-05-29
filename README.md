# Charaids - Motion-Controlled Charades Game

A modern React Native charades app that uses your phone's motion sensors for an interactive gaming experience!

## 🎮 Features

### Core Gameplay
- **Motion-Controlled Input**: Tilt your phone to play
  - **Tilt Down** (toward floor) = Correct answer → Green screen + "Correct!"
  - **Tilt Up** (toward ceiling) = Skip card → Red screen + "Skip!"
- **Customizable Time Limits**: Choose game duration with interactive slider
- **Real-time Scoring**: Track correct answers and skipped cards
- **Haptic Feedback**: Feel the game with tactile responses

### Content
- **8 Pre-built Categories**: 
  - Historical Figures
  - Countries
  - Fictional Characters
  - Cars
  - Animals
  - Landmarks
  - Cities  
  - Celebrities
- **Custom Categories**: Generate new content via AI API
- **50+ Items per Category**: Extensive content for extended gameplay

### Technical Features
- **Landscape Gameplay**: Automatic orientation switching during games
- **Smooth Animations**: Powered by React Native Reanimated 3
- **Modern UI**: Dark theme with gradient design
- **Cross-Platform**: Works on iOS and Android

## 🛠 Tech Stack

- **React Native** with Expo SDK
- **React Navigation** for screen management
- **Reanimated 3** for smooth animations
- **Expo Sensors** for accelerometer motion detection
- **Expo Haptics** for tactile feedback
- **Linear Gradients** for modern UI design
- **AsyncStorage** for data persistence

## 📱 Installation

### Prerequisites
- Node.js (16+ recommended)
- Expo CLI
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Setup
1. Clone the repository:
```bash
git clone https://github.com/yourusername/charaids.git
cd charaids
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

## 🎯 How to Play

1. **Choose a Category**: Select from pre-built categories or create a custom one
2. **Set Time Limit**: Use the slider to choose game duration (30s - 5min)
3. **Place Phone on Forehead**: Position the phone screen facing outward
4. **Start Playing**: 
   - Other players give clues for the word/phrase on screen
   - **Tilt down** when you guess correctly
   - **Tilt up** to skip difficult words
5. **See Results**: View your score and review all the words

## 🏗 Project Structure

```
charaids/
├── components/           # Reusable UI components
│   ├── Logo.js          # App branding
│   ├── LoadingDeck.js   # Loading animations
│   └── TimeSlider.js    # Time selection component
├── screens/             # App screens
│   ├── HomeScreen.js    # Main menu
│   ├── GameScreen.js    # Core gameplay
│   ├── ResultScreen.js  # Game results
│   └── SavedDecksScreen.js # Saved content
├── constants/           # App constants
│   └── theme.js         # Colors, fonts, sizes
├── data/               # Static data
│   └── defaultDecks.js # Pre-built categories
└── utils/              # Helper functions
    └── storage.js      # Data persistence
```

## 🎨 Design System

The app uses a cohesive dark theme with blue gradients:
- **Primary Colors**: Deep blues and teals
- **Typography**: System fonts with consistent hierarchy  
- **Animations**: Smooth spring-based transitions
- **Layout**: Responsive design adapting to screen sizes

## 🔧 Configuration

### Custom API Integration
The app can generate custom categories via external API. Update the endpoint in `GameScreen.js`:

```javascript
const response = await fetch('https://your-api-endpoint.com/generate-list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ category: categoryName, count: 35 })
});
```

### Motion Sensitivity
Adjust tilt sensitivity in `GameScreen.js`:

```javascript
const TILT_THRESHOLD = 0.7; // Increase for less sensitivity
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Motion detection powered by [Expo Sensors](https://docs.expo.dev/versions/latest/sdk/sensors/)
- Animations by [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

## 📞 Support

Having issues? Please check the [Issues](https://github.com/yourusername/charaids/issues) page or create a new issue.

---

**Ready to play? Download and start guessing!** 🎭 