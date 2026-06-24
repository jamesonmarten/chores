---
name: Release Checklist
about: Track required tasks for a mobile/web production release
title: "release: vX.Y.Z"
labels: ["release"]
assignees: []
---

## Release Scope

- Version: vX.Y.Z
- Target date:
- Release owner:
- Included PRs/commits:

## Code And QA

- [ ] Branch is merged to main
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] `npm run smoke` succeeds
- [ ] Manual web sanity on `/app`, `/demo`, `/compare`

## iOS Build And Submission

- [ ] `npm run cap:sync:ios`
- [ ] Xcode project opens and builds on a real device
- [ ] MARKETING_VERSION updated
- [ ] CURRENT_PROJECT_VERSION incremented
- [ ] Archive uploaded to App Store Connect
- [ ] App Store metadata updated
- [ ] Screenshots attached
- [ ] App Privacy answers reviewed
- [ ] Submitted for review or TestFlight

## Android Build And Submission

- [ ] `npm run cap:sync:android`
- [ ] Android Studio release build succeeds
- [ ] `versionName` updated in `android/app/build.gradle`
- [ ] `versionCode` incremented in `android/app/build.gradle`
- [ ] Signed AAB generated
- [ ] Uploaded to Play Console internal/production track
- [ ] Store listing updated
- [ ] Data Safety + content declarations reviewed
- [ ] Release rolled out

## Billing And Deep-Link Validation

- [ ] Stripe checkout success path verified on iOS
- [ ] Stripe checkout cancel path verified on iOS
- [ ] Stripe checkout success path verified on Android
- [ ] Stripe checkout cancel path verified on Android
- [ ] Pro unlock status verified after return to app

## Post-Release

- [ ] Release notes posted
- [ ] Tag created in git
- [ ] First 24h monitoring done (errors, subscription activation)
- [ ] Any hotfixes tracked

## Notes

-
