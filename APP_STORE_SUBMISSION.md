# App Store Submission Guide (iOS + Android)

This checklist gets Family Chores into both stores with the current codebase.

App identifiers in this repo:
- iOS bundle id: com.devcabin.familychores
- Android application id: com.devcabin.familychores
- Deep-link return scheme: familychores://pro

## 1. One-Time Accounts And Legal Setup

1. Enroll Apple Developer Program (organization account recommended).
2. Create Google Play Console developer account.
3. Publish a public Privacy Policy URL.
4. Publish Terms of Service URL.
5. Prepare support email and support URL.

Required for both stores:
- App icon (1024x1024)
- Feature graphic (Android)
- Screenshots (phone + tablet)
- App description copy
- Age rating answers

## 2. Pre-Release Engineering Checklist

Run before every submission:

1. Install dependencies.
2. Build production web bundle.
3. Sync native projects.
4. Verify smoke test.
5. Verify checkout flow and deep-link return on real devices.

Commands:

```bash
cd family-chores-more
npm install
npm run build
npm run cap:sync:all
npm run smoke
```

## 3. Versioning Rules Per Release

iOS:
- MARKETING_VERSION = public version (example: 1.0.1)
- CURRENT_PROJECT_VERSION = build number, always increment (example: 5)

Android:
- versionName = public version (example: 1.0.1)
- versionCode = integer build number, always increment (example: 5)

Where to update Android values:
- android/app/build.gradle

## 4. iOS App Store Submission (App Store Connect)

### 4.1 Prepare Binary In Xcode

1. Sync latest web assets:
```bash
npm run cap:sync:ios
```
2. Open iOS project:
```bash
npm run cap:open:ios
```
3. In Xcode:
- Select target App
- Set Team under Signing & Capabilities
- Confirm bundle id is com.devcabin.familychores
- Update Version and Build
- Product -> Archive
- Distribute App -> App Store Connect -> Upload

### 4.2 Configure App Store Connect Listing

1. App Store Connect -> My Apps -> Family Chores
2. Create new version (matches MARKETING_VERSION).
3. Add:
- Subtitle
- Promotional text
- Description
- Keywords
- Support URL
- Marketing URL (optional)
- Privacy Policy URL
4. Upload screenshots for required device classes.
5. Fill age rating questionnaire.
6. Fill App Privacy (data collection + tracking answers).
7. Add build and submit for review.

### 4.3 iOS Review Notes (Recommended)

In Review Notes include:
- Demo account/testing flow if needed
- Stripe checkout behavior and return URL: familychores://pro
- Any region or feature restrictions

## 5. Google Play Submission (Play Console)

### 5.1 Build Signed Android App Bundle (AAB)

1. Sync latest web assets:
```bash
npm run cap:sync:android
```
2. Open Android project:
```bash
npm run cap:open:android
```
3. In Android Studio:
- Confirm applicationId is com.devcabin.familychores
- Update versionCode/versionName in android/app/build.gradle
- Build -> Generate Signed Bundle/APK -> Android App Bundle
- Use release keystore (store securely)

### 5.2 Upload And Configure Play Console

1. Play Console -> App -> Production (or Internal testing first).
2. Upload AAB.
3. Complete Store Listing:
- Short description
- Full description
- Screenshots (phone + tablet)
- Feature graphic
- App icon
4. Complete App Content forms:
- Privacy policy
- Data safety
- Ads declaration
- Content rating
- Target audience and Families policy
5. Create release notes and roll out.

Recommendation:
- Start with Internal testing, then Closed testing, then Production.

## 6. Families Policy And Child-Focused App Checks

Because this app is family/kid-oriented, verify:

1. Play Console target audience settings are accurate.
2. Data safety form is conservative and precise.
3. Any analytics/SDK usage is disclosed correctly.
4. In-app messaging avoids manipulative language for children.

## 7. Stripe Checkout Validation On Native Apps

Must verify before submission:

1. Start checkout from native iOS app.
2. Complete/cancel payment.
3. Confirm app returns correctly and updates Pro status.
4. Repeat on Android.

This repo already supports deep-link callback handling in:
- src/pwa/deeplink.js
- src/stripe/checkout.js

Android deep-link intent filter is configured in:
- android/app/src/main/AndroidManifest.xml

## 8. Release-Day Runbook

1. Merge release commit to main.
2. Tag release in Git (example: v1.0.1).
3. Build and sync native assets.
4. Archive and upload iOS build.
5. Generate and upload Android AAB.
6. Submit both listings with matching release notes.
7. Monitor first 24h:
- Crash reports
- Checkout success rate
- Subscription activation rate

## 9. Store Assets Checklist

Prepare these once per release:

- App icon 1024x1024
- iPhone screenshots (6.7 and 6.5 where required)
- iPad screenshots
- Android phone screenshots
- Android tablet screenshots
- Android feature graphic 1024x500
- Release notes (What is new)
- Privacy policy URL
- Support URL/email

## 10. Quick Commands Reference

```bash
# Build web and sync both platforms
npm run cap:sync:all

# iOS only
npm run cap:sync:ios
npm run cap:open:ios

# Android only
npm run cap:sync:android
npm run cap:open:android
```

## 11. Automation And Copy Assets

- Fastlane setup and lane usage: `FASTLANE_SETUP.md`
- Store listing copy blocks: `STORE_LISTING_COPY.md`
- Team release template: `.github/ISSUE_TEMPLATE/release-checklist.md`
