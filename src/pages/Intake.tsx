import { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Intake = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setResumeFile(file);
    }
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile || !orderId) return null;

    setIsUploading(true);
    try {
      const fileExt = resumeFile.name.split(".").pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resume");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderId) {
      toast.error("Invalid order. Please start from checkout.");
      return;
    }

    if (!fullName || !email || !currentStatus || !targetRoles || !biggestChallenge) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      let resumeUrl = null;
      if (resumeFile) {
        resumeUrl = await uploadResume();
      }

      const { data, error } = await supabase.functions.invoke("submit-intake", {
        body: {
          orderId,
          fullName,
          email,
          currentStatus,
          targetRoles,
          biggestChallenge,
          resumeUrl,
        },
      });

      if (error) throw error;

      toast.success("Intake form submitted successfully!");

      if (data?.nextStep === "booking") {
        navigate(`/booking?order_id=${orderId}`);
      } else {
        navigate(`/complete?order_id=${orderId}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit form. Please try again.");
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
              Please complete checkout first to access the intake form.
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
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Intake Form</h1>
          <p className="text-muted-foreground text-lg">
            Help us understand your background so we can provide tailored guidance
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentStatus">Current Status *</Label>
                <Input
                  id="currentStatus"
                  placeholder="e.g., Software Engineer at Google, 3 years experience"
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetRoles">Target Roles *</Label>
                <Input
                  id="targetRoles"
                  placeholder="e.g., Senior Product Manager, Staff Engineer"
                  value={targetRoles}
                  onChange={(e) => setTargetRoles(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biggestChallenge">Biggest Challenge *</Label>
                <Textarea
                  id="biggestChallenge"
                  placeholder="What's holding you back from landing your dream role?"
                  value={biggestChallenge}
                  onChange={(e) => setBiggestChallenge(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Resume (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{resumeFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setResumeFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">
                        Drag and drop your resume or click to browse
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? "Uploading..." : "Submitting..."}
                  </>
                ) : (
                  "Submit & Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Intake;
