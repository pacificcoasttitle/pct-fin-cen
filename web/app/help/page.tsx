import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, FileText, ExternalLink, HelpCircle, MessageCircle, BookOpen } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background py-12">
      <div className="container max-w-2xl px-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground mt-2">
            Need assistance? We&apos;re here to help.
          </p>
        </div>

        <div className="space-y-4">
          <Card className="border-0 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                Email Support
              </CardTitle>
              <CardDescription>
                For general inquiries and support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href="mailto:support@pctfincen.com">
                  support@pctfincen.com
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <Phone className="h-5 w-5" />
                </div>
                Phone Support
              </CardTitle>
              <CardDescription>
                Available Monday - Friday, 8am - 5pm PST
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href="tel:+15551234567">
                  (555) 123-4567
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <MessageCircle className="h-5 w-5" />
                </div>
                Live Chat
              </CardTitle>
              <CardDescription>
                Get instant help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full sm:w-auto">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                Documentation
              </CardTitle>
              <CardDescription>
                Learn more about FinCEN reporting requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href="https://www.fincen.gov/real-estate" target="_blank" rel="noopener noreferrer">
                  FinCEN Real Estate Rules
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                About PCT FinCEN Solutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pacific Coast Title Company&apos;s FinCEN compliance platform helps title companies 
                and escrow officers efficiently manage Real Estate Reporting requirements under 
                the Corporate Transparency Act.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-center space-y-4">
          <Button asChild size="lg">
            <Link href="/login">Back to Login</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
