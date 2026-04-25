/**
 * OAuth shim. Conecta direto no Supabase Auth.
 *
 * Em web: usa `window.location.origin` (https://app.com/).
 * Em nativo (Capacitor, futuro): precisa retornar via deep link
 *   tipo `app.lovable.5b8e1afd3df944d686520dc552bb9a80://oauth-callback`.
 *
 * Quando ativar Capacitor:
 *   1. Configurar deep link no `capacitor.config.ts`:
 *        appId: "app.lovable.5b8e1afd3df944d686520dc552bb9a80"
 *   2. Adicionar essa URL na lista de "Redirect URLs" do Supabase Auth.
 *   3. Trocar a constante `NATIVE_OAUTH_REDIRECT` abaixo se quiseres outro path.
 *   4. Tratar o callback com `@capacitor/app` listener `appUrlOpen` no main.tsx.
 */
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform } from "@/lib/nativeStorage";

type OAuthProvider = "google" | "github" | "apple";

interface OAuthOptions {
  redirect_uri?: string;
}

interface OAuthResult {
  error?: { message: string };
}

const NATIVE_OAUTH_REDIRECT =
  "app.lovable.5b8e1afd3df944d686520dc552bb9a80://oauth-callback";

const resolveRedirect = (override?: string): string => {
  if (override) return override;
  if (isNativePlatform()) return NATIVE_OAUTH_REDIRECT;
  return `${window.location.origin}/`;
};

export const lovable = {
  auth: {
    async signInWithOAuth(provider: OAuthProvider, opts: OAuthOptions = {}): Promise<OAuthResult> {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: resolveRedirect(opts.redirect_uri),
        },
      });
      if (error) return { error: { message: error.message } };
      return {};
    },
  },
};
