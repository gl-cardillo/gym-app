# Gym App

An offline workout tracker built with **React Native + Expo** (TypeScript). All
data lives on the device via AsyncStorage: no account, no backend.

## Features

### Plans
- Create / edit routines with exercise sets, reps, rest, target time, target distance
- Reorder exercises: link consecutive exercises into **supersets / circuits**
- 4 tracking modes per exercise: **weighted**, **bodyweight (+added weight)**, **duration**, **cardio (distance & time)**

### Workout sessions
- Live logging of weight / reps / time / distance, with warm-up sets and for set **RPE + notes**
- Add or remove sets and exercises mid-session: start a planless **Quick Workout**
- Values prefilled from your last session for the same plan
- **Progressive-overload suggestions** ("last 60×8, try 65") based on previous performance
- **Rest timer**: auto starts on set completion, 15s / skip, fires a local notification, survives app restarts
- Live **estimated 1RM** and workout volume total
- **PR detection** on finish, with haptic feedback and an alert

### Progress & history
- **Dashboard**: total workouts, week streak, workouts this week, PRs this week, last workout, and a this-week muscle group volume chart
- **History**: workout list with set counts + volume, plus a 16-week activity **heatmap**
- **Records**: exercise bests (top weight, best reps, est. 1RM, longest hold, farthest distance)
- **Exercise progress**: metric line charts across sessions + full history
- **Bodyweight log** and **body measurements** (8 sites) with trend charts

### Exercise library
- Auto populated from plans and logged workouts, autocomplete in all forms
- Tag muscle group and tracking mode: rename (remaps plans + history), merge duplicates, delete
- Usage counts (how many plans / logs reference each exercise)

### Settings & data
- Weight (lbs/kg), length (in/cm) and distance (mi/km) units  switching **converts stored data** automatically
- Light / dark / system theme
- **Backup**: JSON export via the share sheet, paste to restore import
- Haptic feedback throughout

## Running

```bash
npm install
npm start        # then press i / a, or scan with Expo Go
```
