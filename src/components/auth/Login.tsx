import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Chrome } from "lucide-react";

export function Login() {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      await loginWithGoogle();
      toast({
        title: "Logged in",
        description: "You have been logged in successfully with Google.",
      });
      // Small delay to ensure state is updated, then navigate
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 100);
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      
      let errorMessage = "Failed to authenticate with Google";
      
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed. Please try again.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized. Please check Firebase settings.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = "Google sign-in is not enabled. Please enable it in Firebase Console.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sign-in Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Curriculum Management System
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleLogin}
            variant="outline"
          >
            <Chrome className="mr-2 h-5 w-5" />
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            If sign-in doesn't work, check the browser console for errors and ensure Google Sign-In is enabled in Firebase Console.
          </p>
        </div>
      </div>
    </div>
  );
}

