# App Store Setup Checklist

## ✅ Completed

1. **App Name Updated**
   - Changed display name to "SLATE" across iOS and Android

2. **Bundle IDs Aligned**
   - Both iOS and Android now use: `co.opsapp.slate`

3. **Location Permission Removed**
   - Removed unused NSLocationWhenInUseUsageDescription from Info.plist

4. **Privacy Manifest Created**
   - Created `ios/SlateApp/PrivacyInfo.xcprivacy`
   - ✅ Added to Xcode project (confirmed by user)

5. **Android Release Signing Configured**
   - ✅ Generated production keystore: `android/app/slate-release-key.keystore`
   - ✅ Created `android/gradle.properties` with keystore credentials
   - Updated build.gradle to use production keystore
   - Added gradle.properties to .gitignore

6. **Google OAuth Setup**
   - ✅ Android Client ID created and added to .env
   - iOS Client ID: `1001959826984-omej1s1478oi2ub1j6hdqs130auibq5m.apps.googleusercontent.com`
   - Android Client ID: `748032911358-7p84m3jlv29dg0njis3d2ch5t73dp2pi.apps.googleusercontent.com`
   - SHA-1 Fingerprint: `D9:1D:7B:2A:14:C0:DA:73:74:07:21:0A:80:5D:9A:DF:DE:71:0C:94`

7. **Environment Security**
   - Confirmed .env is in .gitignore and not tracked

8. **Privacy Policy URL**
   - Using: https://opsapp.co/legal

---

## 📋 Ready to Build!

All critical setup is complete. You can now build release versions:

### iOS Build (for TestFlight/App Store)

**Option 1: Using Xcode**
1. Open `ios/SlateApp.xcworkspace` in Xcode
2. Select "Any iOS Device (arm64)" as target
3. Product → Archive
4. Once archived, click "Distribute App"
5. Choose "App Store Connect"
6. Follow prompts to upload

**Option 2: Command Line**
```bash
cd ios
xcodebuild -workspace SlateApp.xcworkspace -scheme SlateApp -configuration Release -sdk iphoneos archive -archivePath build/SlateApp.xcarchive
```

### Android Build (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

AAB file will be at: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📱 App Store Connect Setup

When you create your App Store Connect listing, you'll need:

### App Information
- **App Name**: SLATE
- **Bundle ID**: co.opsapp.slate
- **Primary Language**: English
- **Category**: Productivity (or your choice)
- **Privacy Policy URL**: https://opsapp.co/legal
- **Support URL**: (what URL should we use?)

### Screenshots Required

For iPhone:
- 6.7" display (iPhone 15 Pro Max): 1290 x 2796 px
- 6.5" display (iPhone 14 Plus): 1284 x 2778 px
- 5.5" display (iPhone 8 Plus): 1242 x 2208 px

You need 3-10 screenshots per size.

### App Description

You'll need to prepare:
- **Short description** (170 characters max)
- **Full description** (4000 characters max)
- **Keywords** (100 characters max, comma-separated)
- **What's new in this version** (for future updates)
- **App icon** (1024x1024 px) - ✅ Already have this at `ios/SlateApp/Images.xcassets/AppIcon.appiconset/1024.png`

### App Review Information
- Demo account credentials (if login required for review)
- Contact information
- Notes for reviewer

---

## 🔍 Pre-Submission Testing Checklist

Before submitting to stores:

- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Verify Google sign-in works on both platforms
- [ ] Test all app permissions (microphone, speech recognition)
- [ ] Verify app icon displays correctly
- [ ] Test offline functionality
- [ ] Ensure privacy policy is accessible at https://opsapp.co/legal
- [ ] Take all required screenshots
- [ ] Write app descriptions and metadata

---

## 📊 Version Management

Current versions:
- **iOS**: 1.0 (build 1)
- **Android**: 1.0 (versionCode 1)

### To Update Versions

**iOS (in Xcode):**
1. Select project in navigator
2. Select SlateApp target
3. Update "Version" (MARKETING_VERSION) - e.g., 1.1
4. Update "Build" (CURRENT_PROJECT_VERSION) - increment for each upload

**Android:**
Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.1"    // User-facing version
}
```

---

## 🔐 Security Notes

### Protected Files (DO NOT COMMIT):
- ✅ `.env` (in .gitignore)
- ✅ `android/gradle.properties` (in .gitignore)
- ✅ `android/app/slate-release-key.keystore` (in .gitignore)

### Keystore Backup
**CRITICAL**: Back up your keystore file securely!
- File: `android/app/slate-release-key.keystore`
- Password: `theRiver`
- Alias: `slate-key-alias`

**If you lose this keystore, you cannot update your Android app!** Store it in:
- Secure cloud storage (encrypted)
- Password manager
- Offline backup

---

## 🚀 Next Steps

1. **Take Screenshots**
   - Use iOS Simulator and Android Emulator
   - Capture key screens: Home, Chat, Settings, etc.
   - Resize to required dimensions

2. **Write App Description**
   - Highlight key features
   - Explain what makes SLATE unique
   - Keep it concise and user-friendly

3. **Test Builds**
   - Create release builds for both platforms
   - Test on real devices
   - Fix any issues that arise

4. **Create App Store Connect Listing**
   - Go to https://appstoreconnect.apple.com
   - Create new app with bundle ID: co.opsapp.slate
   - Fill in all metadata

5. **Create Google Play Console Listing**
   - Go to https://play.google.com/console
   - Create new app with package: co.opsapp.slate
   - Fill in all metadata

6. **Submit for Review**
   - Upload builds
   - Complete all required fields
   - Submit to both stores

---

## 📞 Support

Need help? Check:
- React Native docs: https://reactnative.dev/docs/publishing-to-app-store
- iOS submission guide: https://developer.apple.com/app-store/submissions/
- Android submission guide: https://developer.android.com/studio/publish
