import { GoogleLogin } from '@react-oauth/google';
import { toast } from "sonner";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { storeGoogleTokens } from "@/utils/googleAuth";

export const GoogleAuthButton = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const session = useSession();

  const handleGoogleSuccess = async (response: any) => {
    if (!session?.user?.id) {
      toast.error("Please login to continue");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('exchange-google-token', {
        body: { 
          code: response.code, // Changed from credential to code
          userId: session.user.id
        }
      });

      if (error) {
        console.error('Token exchange error:', error);
        toast.error("Failed to authenticate with Google");
        return;
      }

      if (!data?.tokens) {
        toast.error("No tokens received from Google");
        return;
      }

      await storeGoogleTokens(data.tokens, session.user.id);
      toast.success("Successfully connected to Google Colab");
      onAuthSuccess();
    } catch (error) {
      console.error('Error during Google authentication:', error);
      toast.error("Failed to connect to Google Colab");
    }
  };

  return (
    <div className="flex justify-center mb-6">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => {
          console.error("Google Sign In Failed");
          toast.error("Google Sign In Failed");
        }}
        flow="auth-code"
        scope="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile"
      />
    </div>
  );
};