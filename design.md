# MathFuel App Design Document

## Overview
MathFuel is an adaptive math learning app for 1st grade students. The app features game-based exercises that adjust to each child's learning patterns, with a parent/educator dashboard to track progress and insights.

---

## Screen List

### Student Screens
1. **Home Screen** - Main hub with play button, daily streak, and encouragement
2. **Practice Screen** - Interactive math problems with visual aids
3. **Results Screen** - Celebration screen after completing a session
4. **Rewards Screen** - View earned stars, badges, and achievements

### Parent/Educator Screens
5. **Dashboard Screen** - Overview of child's progress and insights
6. **Progress Detail Screen** - Detailed analytics and learning patterns
7. **Settings Screen** - Adjust difficulty, session length, and preferences

---

## Primary Content and Functionality

### Home Screen
- **Content**: Child's avatar/name, daily streak counter, stars earned today, large "Play" button
- **Functionality**: Start practice session, view rewards, access settings (parent lock)

### Practice Screen
- **Content**: Visual math problems (addition/subtraction with objects), number line, answer options
- **Functionality**: 
  - Tap to select answer
  - Visual feedback (correct = celebration, incorrect = gentle encouragement)
  - Progress bar showing session completion
  - Adaptive difficulty (easier after mistakes, harder after streaks)

### Results Screen
- **Content**: Stars earned, accuracy percentage, encouraging message, "Play Again" button
- **Functionality**: View results, return home, continue practicing

### Rewards Screen
- **Content**: Collection of earned badges, star count, achievement progress
- **Functionality**: View achievements, motivational milestones

### Dashboard Screen (Parent)
- **Content**: Weekly progress chart, accuracy trends, time spent, AI insights
- **Functionality**: View child's learning patterns, see recommendations

### Progress Detail Screen (Parent)
- **Content**: Detailed breakdown by skill (addition, subtraction, place value), response times, areas needing focus
- **Functionality**: Deep dive into specific skills, view historical data

### Settings Screen (Parent)
- **Content**: Session length slider, difficulty mode, sound toggle, notifications
- **Functionality**: Customize learning experience, adjust preferences

---

## Key User Flows

### Flow 1: Daily Practice Session
1. Child opens app → Home Screen
2. Taps "Play" button → Practice Screen
3. Answers 10-15 math problems (adaptive)
4. Completes session → Results Screen
5. Views stars earned → Returns to Home

### Flow 2: Parent Checks Progress
1. Parent taps settings icon (with parent lock)
2. Enters simple PIN → Dashboard Screen
3. Views weekly progress and AI insights
4. Taps "Details" → Progress Detail Screen
5. Reviews specific skill areas

### Flow 3: Adaptive Difficulty Adjustment
1. Child struggles with "crossing ten" problems
2. System detects pattern (slower response, more errors)
3. Next problems become visual/game-based
4. Success improves → difficulty gradually increases

---

## Color Choices

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | #FF6B35 | #FF8C5A | Main accent, buttons, highlights |
| `background` | #FFF8F0 | #1A1A2E | Screen backgrounds |
| `surface` | #FFFFFF | #252542 | Cards, elevated surfaces |
| `foreground` | #2D3436 | #F5F5F5 | Primary text |
| `muted` | #636E72 | #A0A0B0 | Secondary text |
| `border` | #E8E0D8 | #3D3D5C | Borders, dividers |
| `success` | #00B894 | #55EFC4 | Correct answers, achievements |
| `warning` | #FDCB6E | #FFE066 | Hints, attention |
| `error` | #E17055 | #FF7675 | Incorrect answers (gentle) |

### Additional App Colors
- **Star Gold**: #FFD93D - For earned stars and rewards
- **Badge Purple**: #A29BFE - For achievement badges
- **Progress Blue**: #74B9FF - For progress indicators

---

## Visual Design Principles

1. **Large Touch Targets**: All interactive elements minimum 48x48dp
2. **High Contrast**: Text easily readable for young children
3. **Playful but Clean**: Fun illustrations without overwhelming
4. **Consistent Feedback**: Every action has visual/haptic response
5. **Encouraging Language**: "Great try!" instead of "Wrong"

---

## Adaptive Learning Features

1. **Response Time Tracking**: Detect hesitation on specific problem types
2. **Error Pattern Recognition**: Identify systematic mistakes (e.g., crossing ten)
3. **Confidence Monitoring**: Adjust based on engagement patterns
4. **Visual Scaffolding**: Add/remove visual aids based on performance
5. **Session Pacing**: Shorter sessions when attention drops

---

## Tab Navigation Structure

| Tab | Icon | Screen |
|-----|------|--------|
| Home | house.fill | Home Screen |
| Practice | play.circle.fill | Practice Screen |
| Rewards | star.fill | Rewards Screen |
| Parent | person.2.fill | Dashboard (PIN protected) |
