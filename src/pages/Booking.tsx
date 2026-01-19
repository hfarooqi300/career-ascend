import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay } from "date-fns";

const TIME_SLOTS = [
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "10:00 AM", hour: 10, minute: 0 },
  { label: "11:00 AM", hour: 11, minute: 0 },
  { label: "1:00 PM", hour: 13, minute: 0 },
  { label: "2:00 PM", hour: 14, minute: 0 },
  { label: "3:00 PM", hour: 15, minute: 0 },
  { label: "4:00 PM", hour: 16, minute: 0 },
];

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDate = addDays(new Date(), 2);
  const maxDate = addDays(new Date(), 30);

  const handleBooking = async () => {
    if (!orderId || !selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledAt = setMinutes(
      setHours(selectedDate, selectedTime.hour),
      selectedTime.minute
    );

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, scheduledAt: scheduledAt.toISOString() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create booking");

      toast.success("Booking confirmed! Check your email for the calendar invite.");

      navigate(`/complete?order_id=${orderId}&booking=true`);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Access</CardTitle>
            <CardDescription>
              Please complete checkout first to book a session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/checkout")} className="w-full">
              Go to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Book Your Session</h1>
          <p className="text-muted-foreground text-lg">
            Choose a date and time that works for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  isBefore(date, minDate) ||
                  isBefore(maxDate, date) ||
                  date.getDay() === 0 ||
                  date.getDay() === 6
                }
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Select Time
              </CardTitle>
              {selectedDate && (
                <CardDescription>
                  Available slots for {format(selectedDate, "MMMM d, yyyy")}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="grid grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.label}
                      variant={
                        selectedTime?.hour === slot.hour
                          ? "default"
                          : "outline"
                      }
                      className="h-12"
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Please select a date first
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedDate && selectedTime && (
          <Card className="mt-8 max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Confirm Your Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {TIME_SLOTS.find((s) => s.hour === selectedTime.hour)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">60 minutes</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleBooking}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Booking;
