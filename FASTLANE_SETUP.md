# Fastlane Setup (TestFlight + Play Internal)

This repository includes Fastlane lanes for:
- iOS TestFlight upload
- Android Google Play internal-track upload

## 1. Install Ruby deps

```bash
cd family-chores-more
bundle install
```

## 2. Required environment variables

### iOS / App Store Connect

- `APPLE_ID` (your Apple login email)
- `APPLE_TEAM_ID` (developer team id)
- `APP_STORE_CONNECT_TEAM_ID` (App Store Connect team id)
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` (if required for upload auth)

Recommended modern auth:
- `APP_STORE_CONNECT_API_KEY_PATH` (path to App Store Connect API key JSON/p8 config)

### Android / Play Console

- `GOOGLE_PLAY_JSON_KEY_PATH` (path to service account JSON key with Play access)

## 3. Lanes

iOS TestFlight:
```bash
npm run fastlane:ios:beta
```

Android Internal testing:
```bash
npm run fastlane:android:internal
```

## 4. What lanes do

`ios beta` lane:
1. Runs `npm run cap:sync:ios`
2. Builds archive from `ios/App/App.xcworkspace` scheme `App`
3. Uploads build to TestFlight

`android internal` lane:
1. Runs `npm run cap:sync:android`
2. Builds release AAB via Gradle
3. Uploads AAB to Play internal track

## 5. First-time checks

1. Confirm signing works locally in Xcode for Release.
2. Confirm Android release signing/keystore is configured.
3. Confirm App Store Connect app exists for bundle id `com.devcabin.familychores`.
4. Confirm Play Console app exists for package `com.devcabin.familychores`.

## 6. CI/CD note

These lanes can run in GitHub Actions once secrets are added.
Use environment secrets for all credentials and key paths.
