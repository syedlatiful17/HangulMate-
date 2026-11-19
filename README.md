# HangulMate — React Native / Expo starter

A beginner-friendly Android + iOS MVP based on the HangulMate SRS (REQ-1 to REQ-9).

## What works in this starter
- Five-tab mobile navigation
- Home dashboard with XP and streak display
- Four survival mission scenarios with Korean audio playback
- Trilingual Korean / English / Bengali dictionary search
- Flashcards with flip, pronunciation, Hard / Good / Easy review actions
- Formal / informal Korean example switcher and etiquette guidance
- Local conversation practice demo
- Quiz Arena with score tracking
- Mistake DNA list based on incorrect answers / Hard flashcard ratings
- SQLite persistence for XP, streak, and mistake history

## Important scope note
This is a functional local MVP, not yet the production release described by the SRS. Login, Google/Apple sign-in, live Gemini conversations, real speech recognition, push notifications, full offline/cloud conflict resolution, biometric authentication, and production SRS scheduling need additional configuration and testing. The chat screen is deliberately labelled DEMO MODE; it does not pretend to call Gemini.

## 1. Install prerequisites
- Install Node.js LTS: https://nodejs.org/
- Install Expo Go on your Android phone (Google Play) for quick testing.
- On Windows, use PowerShell or the VS Code terminal.

## 2. Create the Expo project
Open PowerShell and run:

```bash
npx create-expo-app@latest HangulMate --template blank-typescript
cd HangulMate
```

If Expo asks which SDK to use, choose the latest stable option.

## 3. Install native packages
```bash
npx expo install expo-sqlite expo-speech
```

## 4. Copy the starter files
Unzip this package. Copy its `App.tsx` into the root of your newly created `HangulMate` project, replacing the generated `App.tsx`.

The `supabase/schema.sql` file is optional for the later cloud stage.

## 5. Run the app
```bash
npx expo start
```
Scan the QR code with Expo Go on Android. For an iOS simulator, use a Mac with Xcode installed and press `i`. A physical iPhone can also use Expo Go with the same development server.

## 6. Try the features
- Tap Missions and select a scenario.
- Tap the speaker icons to hear Korean pronunciation.
- Open Study to flip flashcards. Choose Hard to add a word to Mistake DNA.
- Search the dictionary using Korean, English, or Bengali.
- Try the quiz and check your score.
- XP and mistake records are saved locally in SQLite.

## 7. Next production steps
1. Create a Supabase project and apply `supabase/schema.sql`.
2. Add Supabase Auth and user profile screens.
3. Move Gemini calls to a secure server / Supabase Edge Function. Never put a Gemini secret key in the mobile app.
4. Add native speech-to-text and audio recording permissions.
5. Implement real spaced-repetition scheduling and sync queue.
6. Add notifications, biometric sign-in, tests, accessibility, and store builds.

## Reference docs
- Expo project creation: https://docs.expo.dev/get-started/create-a-project/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo Speech: https://docs.expo.dev/versions/latest/sdk/speech/
- Supabase + Expo: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
