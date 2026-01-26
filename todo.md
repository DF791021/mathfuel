# MathFuel TODO

## Core Features
- [x] Home screen with play button and daily streak
- [x] Practice screen with visual math problems
- [x] Adaptive difficulty system
- [x] Results screen with celebration
- [x] Rewards screen with stars and badges
- [x] Parent dashboard with progress overview
- [x] Progress detail screen with analytics
- [x] Settings screen with preferences
- [x] Tab navigation with 4 tabs
- [x] Theme colors (warm, child-friendly palette)
- [x] App logo and branding
- [x] Local data persistence with AsyncStorage

## Branding Updates
- [x] Update app icon with user-provided MathFuel logo
- [x] Update color scheme to match blue/green theme

## Core Reliability (Foundation First)
- [x] Audit and fix problem generation edge cases
- [x] Ensure answer options never have duplicates
- [x] Validate subtraction never produces negative results
- [x] Fix progress data persistence reliability
- [x] Add data validation on load/save
- [x] Improve adaptive difficulty algorithm accuracy
- [x] Track crossing-ten problems separately
- [x] Write comprehensive unit tests for all core logic
- [x] Test edge cases for streak calculation
- [x] Test badge awarding logic thoroughly

## Phase 1: Multi-Child / Admin Portal System
### Authentication
- [x] Admin login via OAuth
- [x] Student profile selection (icon-based)
- [x] Optional 4-digit PIN for students

### Admin Dashboard
- [x] "My Students" primary screen
- [x] Big "Add Child" button
- [x] Child cards showing: Name, Grade, Last activity, Progress indicator
- [x] Add Child flow: First name, Grade dropdown, Avatar, Optional PIN

### Student Experience (Ultra Simple)
- [x] Landing page with role selection (Student vs Parent/Teacher)
- [x] Student profile selection screen
- [x] Single "Start Math" button on student home
- [x] Track: correctness, time to answer, crossing-ten problems

### Data Structure
- [x] Database schema for children and sessions tables
- [x] Server API routes for children CRUD
- [x] Server API routes for session recording
- [x] Child profile: ID, Grade, Learning history, Session history
- [x] Link children to admin account

### Child Detail Screen
- [x] View child progress and stats
- [x] Edit child name, grade, avatar, PIN
- [x] Delete child with confirmation
- [x] View recent session history
- [x] Crossing-ten accuracy tracking

### NOT Building Yet (Explicit)
- Face/visual login
- AI chat interfaces
- Teacher district hierarchy
- Benchmark comparisons
- Advanced dashboards
- Multiple grade switching
- ACT integration


## World-Class UI Redesign
- [x] Premium color palette with gradients and depth
- [x] Landing page with stunning hero design
- [x] Animated transitions and micro-interactions
- [x] Premium card designs with shadows and glassmorphism
- [x] Delightful student experience with playful animations
- [x] Engaging practice screen with visual feedback
- [x] Polished typography hierarchy
- [x] Consistent spacing and visual rhythm
- [x] Professional iconography
- [x] Celebration animations for achievements

## Session Database Connection
- [x] Update practice screen to save session data to server after completion
- [x] Update child detail screen to fetch real session history from database
- [x] Display session stats (accuracy, problems solved, time) on child detail
- [x] Show crossing-ten accuracy from real session data
- [x] Calculate and display progress trends from session history

## Sound Effects
- [x] Download/create correct answer sound (cheerful ding)
- [x] Download/create incorrect answer sound (gentle buzz)
- [x] Download/create celebration sound for session completion
- [x] Integrate sounds into practice screen
- [x] Add celebration sound to results screen
- [x] Respect soundEnabled setting from user preferences
