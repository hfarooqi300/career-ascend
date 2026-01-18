import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  const [isVerifying, setIsVerifying] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !orderId) {
        setVerificationError("Missing payment information");
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId, orderId },
        });

        if (error) throw error;

        if (data?.success) {
          setOrder(data.order);
          toast.success("Payment confirmed!");
        } else {
          setVerificationError(data?.message || "Payment verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationError("Failed to verify payment");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, orderId]);

  const handleContinue = () => {
    if (order) {
      navigate(`/intake?order_id=${order.id}`);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Verification Failed</CardTitle>
            <CardDescription>{verificationError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/checkout")} className="w-full">
              Return to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase, {order?.full_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-sm">{order?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">
                {order?.tier?.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                ${(order?.amount_cents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <Button onClick={handleContinue} className="w-full" size="lg">
            Continue to Intake Form
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
