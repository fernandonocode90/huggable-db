/**
 * OAuth shim. The original project used @lovable.dev/cloud-auth-js for Google sign-in,
 * but here we connect directly to an external Supabase project, so we route OAuth
 * through Supabase's own provider flow.
 */
import { supabase } from "@/integrations/supabase/client";

type OAuthProvider = "google" | "github" | "apple";

interface OAuthOptions {
  redirect_uri?: string;
}

interface OAuthResult {
  error?: { message: string };
}

export const lovable = {
  auth: {
    async signInWithOAuth(provider: OAuthProvider, opts: OAuthOptions = {}): Promise<OAuthResult> {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts.redirect_uri ?? `${window.location.origin}/`,
        },
      });
      if (error) return { error: { message: error.message } };
      return {};
    },
  },
};
