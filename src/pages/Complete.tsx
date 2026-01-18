import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, Calendar, ArrowRight } from "lucide-react";

const Complete = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const hasBooking = searchParams.get("booking") === "true";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl">You're All Set!</CardTitle>
          <CardDescription className="text-base">
            Your order has been completed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
              <Mail className="h-6 w-6 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Check Your Email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email with all the details of your order.
                </p>
              </div>
            </div>

            {hasBooking && (
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <Calendar className="h-6 w-6 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium">Session Booked</h3>
                  <p className="text-sm text-muted-foreground">
                    Your coaching session has been scheduled. You'll receive a calendar invite shortly.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-secondary/50 rounded-lg p-4">
            <h3 className="font-medium mb-2">What Happens Next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {hasBooking ? (
                <>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    We'll review your intake form and resume
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    You'll receive a calendar invite for your session
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Join the video call at the scheduled time
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    We'll review your intake form and resume
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    You'll receive detailed feedback within 48 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Check your email for actionable recommendations
                  </li>
                </>
              )}
            </ul>
          </div>

          {orderId && (
            <div className="text-center text-sm text-muted-foreground">
              Order ID: <span className="font-mono">{orderId.slice(0, 8)}...</span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Complete;
