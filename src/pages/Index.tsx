import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, Zap, Target } from "lucide-react";
import { TIERS } from "@/lib/tiers";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Career Coaching by Industry Experts
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Land Your Dream Role
            <span className="block text-primary/80">With Expert Guidance</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get personalized feedback on your resume, LinkedIn profile, and career positioning 
            from professionals who've hired at top tech companies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/checkout")}>
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/checkout?tier=coaching")}>
              Book a Coaching Session
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Signal?</h2>
            <p className="text-muted-foreground">
              We've helped hundreds of professionals level up their careers
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Targeted Feedback",
                description: "Get specific, actionable recommendations tailored to your target roles",
              },
              {
                icon: Star,
                title: "Industry Experts",
                description: "Learn from professionals who've worked at Google, Meta, Amazon, and more",
              },
              {
                icon: Zap,
                title: "Fast Turnaround",
                description: "Receive detailed feedback within 48 hours to keep your momentum going",
              },
            ].map((feature, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">
              Choose the level of support that's right for you
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {Object.values(TIERS).map((tier) => (
              <Card 
                key={tier.id} 
                className={`relative ${tier.id === "coaching" ? "ring-2 ring-primary" : ""}`}
              >
                {tier.id === "coaching" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardContent className="pt-8">
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-muted-foreground mb-4">{tier.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground"> one-time</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={tier.id === "coaching" ? "default" : "outline"}
                    onClick={() => navigate(`/checkout?tier=${tier.id}`)}
                  >
                    Get {tier.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Accelerate Your Career?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Join hundreds of professionals who've landed their dream roles with our help.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate("/checkout")}
          >
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Signal Career Coaching. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
