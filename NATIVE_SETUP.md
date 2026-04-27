# Native Build Setup — Solomon Wealth Code

This guide is for when you take the project out of Lovable and build the
native iOS / Android apps locally.

Everything in the codebase is already wired — this doc only covers the
**one-time native setup** you do outside Lovable, and the platform-specific
files Capacitor doesn't manage automatically.

---

## 1. First-time setup (after `git pull` from your GitHub)

```bash
# Install JS deps
npm install

# Generate native projects (only run ONCE per platform)
npx cap add ios
npx cap add android

# Generate icons + splash from resources/ (run again whenever you change them)
npx @capacitor/assets generate --iconBackgroundColor "#0a0a0f" --splashBackgroundColor "#0a0a0f"

# Build web assets and copy into native projects
npm run build
npx cap sync
```

Required local tools:
- **iOS**: macOS + Xcode 15+ + a paid Apple Developer account ($99/yr)
- **Android**: Android Studio + JDK 17

---

## 2. iOS-specific configuration (Info.plist)

Open `ios/App/App/Info.plist` in Xcode and add:

### 2.1 Permission usage descriptions (REQUIRED — Apple rejects without them)

Apple rejects vague strings. Be specific about *what* the app does and *why
the user benefits*.

```xml
<!-- Required answer to App Store Connect encryption question.
     The app only uses standard HTTPS / system crypto, so this is "false". -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- We do not track users across other apps. Declare it explicitly. -->
<key>NSUserTrackingUsageDescription</key>
<string>Solomon Wealth Code does not track you across other apps or websites.</string>
```

> **Push notifications:** iOS does NOT require a usage string in Info.plist.
> The system prompt fires on `PushNotifications.requestPermissions()`. The
> in-app priming screen (`PushPermissionPrime.tsx`) explains the value first.

Add the strings below **only if** you later add the corresponding feature.
If the key is missing when the API is called, the app will crash at review.

```xml
<!-- Only if you add profile photo capture from camera -->
<key>NSCameraUsageDescription</key>
<string>Used so you can take a profile photo for your Solomon Wealth Code account.</string>

<!-- Only if you add profile photo upload from gallery -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Used so you can choose a profile photo for your Solomon Wealth Code account.</string>

<!-- Required for daily audio playback to continue when phone is locked -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```


### 2.2 OAuth deep-link URL scheme (REQUIRED for Google sign-in on native)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>app.solomonwealthcode.oauth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>app.solomonwealthcode</string>
    </array>
  </dict>
</array>
```

This must match the `scheme` in `capacitor.config.ts` and the redirect URL
configured in Supabase → Authentication → URL Configuration:
```
app.solomonwealthcode://oauth-callback
```

### 2.3 App Transport Security (only if you keep `server.url` for debug)

If you keep the `server` block in `capacitor.config.ts` enabled while debugging
on a real device, you may need:
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```
**Remove this before App Store submission** (and remove the `server` block too).

---

## 3. Android-specific configuration

### 3.1 OAuth deep link (`android/app/src/main/AndroidManifest.xml`)

Inside `<activity android:name=".MainActivity" ...>`, add:

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="app.solomonwealthcode" />
</intent-filter>
```

### 3.2 Notification permission (Android 13+)

`AndroidManifest.xml` `<manifest>` root:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 4. Supabase configuration

In Supabase Dashboard → Authentication → URL Configuration → **Redirect URLs**,
add (in addition to your existing web URLs):

```
app.solomonwealthcode://oauth-callback
```

Without this, Google sign-in on native will fail with "redirect not allowed".

---

## 5. Capgo Live Updates (OTA) — optional

Plugin is already installed. To activate:

1. Sign up at https://capgo.app (15-day free trial → ~$14/mo Solo plan)
2. Locally:
   ```bash
   npx @capgo/cli init
   ```
   It prints your `appId`.
3. Paste it into `src/lib/liveUpdates.ts` → `CAPGO_APP_ID`.
4. Push the first OTA bundle:
   ```bash
   npm run build
   npx @capgo/cli bundle upload --channel production
   ```

From then on, every `bundle upload` reaches users on next app open — no
store re-submission needed (for JS/CSS/HTML changes only).

**You still need to re-submit to the stores when you:**
- Add or remove a Capacitor plugin
- Change permissions, icon, splash, or app name
- Bump Capacitor version

---

## 6. Production build checklist

Before submitting to App Store / Google Play:

- [ ] Comment out the `server` block in `capacitor.config.ts` (otherwise
      the production app loads from the Lovable preview instead of the
      bundled assets)
- [ ] Remove `NSAllowsArbitraryLoads` from `Info.plist` if you added it
- [ ] Run `npm run build && npx cap sync`
- [ ] iOS: `npx cap open ios` → Product → Archive → upload via Xcode Organizer
- [ ] Android: `npx cap open android` → Build → Generate Signed Bundle/APK

---

## 7. iOS App Store payment compliance (already handled in code)

Apple Rule 3.1.1 forbids selling digital subscriptions via Stripe inside the
iOS app. The codebase already handles this:

- `src/pages/Upgrade.tsx` and `src/pages/WelcomePaywall.tsx` automatically
  hide Stripe buttons when running on iOS native (`platform === "ios"`) and
  show "Subscribe on the web" instead.
- When you're ready to sell subscriptions on iOS, integrate **RevenueCat**
  (`npm install @revenuecat/purchases-capacitor`) — this layer is what
  Apple requires, and Lovable left the gate ready for it.

Android (Google Play) has the same rule — same fix applies via RevenueCat.

---

## 8. Useful Capacitor commands

```bash
npx cap sync          # After every web build, copies dist/ into native
npx cap update ios    # Update native iOS dependencies
npx cap open ios      # Open Xcode workspace
npx cap run ios       # Build + run on simulator / device
npx cap doctor        # Diagnose native setup issues
```

---

## 9. App Privacy Manifest (iOS) — REQUIRED since 2024

Apple rejects apps without `PrivacyInfo.xcprivacy`. Create this file in
Xcode at `ios/App/App/PrivacyInfo.xcprivacy` with the content below.

It declares what data the app collects and what "required reason APIs" it
uses. The values below match what Solomon Wealth Code actually does today
— update if you add features that collect different data.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- Email for Supabase auth -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        <string>NSPrivacyCollectedDataTypePurposeAccountManagement</string>
      </array>
    </dict>
    <!-- Name (optional, for personalization) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <!-- Crash data (only if you enable Sentry) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeCrashData</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <false/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>

  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- @capacitor/preferences uses UserDefaults -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
    <!-- File timestamps (Capacitor uses these for caching) -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
  </array>

  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

If you later add **Sentry**, **RevenueCat**, **Capgo**, or any other SDK,
each one publishes its own `PrivacyInfo.xcprivacy` — you must MERGE their
declared APIs into yours, OR (easier) just include the SDK and Xcode
auto-aggregates them at build time. Sentry docs:
https://docs.sentry.io/platforms/apple/data-management/apple-privacy-manifest/

---

## 10. Store listing assets (when submitting)

You'll need to prepare these OUTSIDE the codebase before submitting. Most
should reuse content from your landing page at https://www.solomonwealthcode.com:

### App Store (iOS)
- App icon 1024×1024 (PNG, no alpha) — same crown
- Screenshots: 6.7" iPhone (1290×2796), 6.5" (1242×2688), 5.5" (1242×2208)
- Optional: 12.9" iPad Pro
- App description (4000 chars) — pull from landing
- Keywords (100 chars)
- Promotional text (170 chars)
- Support URL: https://www.solomonwealthcode.com (or `/support` on landing)
- **Privacy Policy URL: https://app.solomonwealthcode.com/privacy-policy** ✅ live
- **Terms of Service URL: https://app.solomonwealthcode.com/terms** ✅ live
- Marketing URL: https://www.solomonwealthcode.com
- Category: Lifestyle (primary), Education or Reference (secondary)
- Age rating: 4+ (no objectionable content)

### Google Play
- App icon 512×512 (PNG)
- Feature graphic 1024×500
- Phone screenshots (min 2, max 8) — at least 1080px on the short side
- 7" tablet screenshots (recommended)
- Short description (80 chars), full description (4000 chars)
- Privacy policy URL (REQUIRED)
- Content rating questionnaire
- Target audience: 18+

### Reuse from landing
- Brand copy / value proposition
- Hero screenshots → can be reframed as App Store screenshots
- About text / mission statement

---

## 11. Crash reporting (Sentry) — optional, dormant

Plugin `@sentry/react` is installed and `src/lib/sentry.ts` is wired into
`main.tsx`. To activate:

1. Sign up at https://sentry.io (free: 5k errors/month)
2. Create a React project, copy the DSN
3. Paste it into `src/lib/sentry.ts` → `SENTRY_DSN`
4. (Native crash capture, optional) Follow https://docs.sentry.io/platforms/javascript/guides/capacitor/
   to wire `@sentry/capacitor` in Xcode/Android Studio for Swift/Kotlin crashes

Until SENTRY_DSN is set, this is fully dormant — zero network calls.

---

## 12. Push notification priming

The app uses a "priming sheet" (`<PushPermissionPrime>`) BEFORE calling
the native iOS/Android permission prompt. You only get one shot at the
native prompt — if the user denies, you can't ask again. The priming
sheet boosts opt-in from ~30% to ~80%.

Already wired — add `<PushPermissionPrime trigger="onboarding-finished" />`
at the right moment in your onboarding flow when you're ready to ship
push notifications. Backend (FCM/APNs) setup is separate and only needed
once you have signing certificates from Apple/Google.

---

## 13. Pre-submission final checklist

- [ ] Bumped `APP_VERSION` in `src/lib/appVersion.ts` AND in Xcode/Android
- [ ] Commented out `server` block in `capacitor.config.ts`
- [ ] Removed `NSAllowsArbitraryLoads` from Info.plist if added
- [ ] `PrivacyInfo.xcprivacy` present (iOS)
- [ ] All permission usage strings present in Info.plist (iOS)
- [ ] Privacy Policy + Terms hosted publicly (use landing page)
- [ ] Support email reachable (`support@solomonwealthcode.com`)
- [ ] Tested on a REAL device (not just simulator) — simulators hide many bugs
- [ ] Tested offline behavior (airplane mode) doesn't crash
- [ ] Tested cold-start with no Supabase session
- [ ] Tested OAuth (Google sign-in) deep link round trip
