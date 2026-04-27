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

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>We send you reminders for your wealth practices and milestones.</string>
```

Add more only if you later use those features (camera, photos, location, etc).

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
