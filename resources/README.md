# resources/

Source assets for **native** icon + splash generation.

These files are consumed by `@capacitor/assets` to generate ALL the
platform-specific icon/splash sizes for iOS and Android automatically.

## Files

| File | Purpose | Used as |
|---|---|---|
| `icon-only.png` | App icon (1024×1024) | iOS app icon, Android legacy icon |
| `icon-foreground.png` | Foreground for adaptive icon | Android adaptive icon foreground (background = `#0a0a0f` from config) |
| `splash.png` | Splash screen (2048×2048) | iOS LaunchScreen, Android splash |

All three were derived from the existing PWA icon (`public/pwa-512.png`,
`public/pwa-512-maskable.png`) so the native app matches the installed PWA.

## Regenerating native assets

Run locally (after `git pull` and `npm install`):

```bash
npx @capacitor/assets generate \
  --iconBackgroundColor "#0a0a0f" \
  --splashBackgroundColor "#0a0a0f"
```

This populates `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`
with every required size. Re-run any time you change the source files here.
