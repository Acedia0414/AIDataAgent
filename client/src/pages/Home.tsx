import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Database, MessageSquare, Shield, FileSpreadsheet, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (user) {
      navigate("/chat");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold">D365 F&O Data Agent</h1>
          </div>
          <Button onClick={() => (window.location.href = getLoginUrl())}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 text-sm font-medium">
            <Database className="h-4 w-4" />
            AI-Powered Data Intelligence
          </div>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Query Your D365 Data with Natural Language
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Transform complex SQL queries into simple conversations. Get instant insights from your
            Dynamics 365 Finance and Operations data without writing a single line of code.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="text-lg px-8"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Powerful Features</h3>
          <p className="text-muted-foreground text-lg">
            Everything you need to unlock insights from your ERP data
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Natural Language Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ask questions in plain English. Our AI understands your intent and generates
                accurate SQL queries automatically.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <Database className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Metadata-Driven Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload your D365 table and field metadata to enable context-aware query generation
                with business logic understanding.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <Shield className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Role-Based Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Integrated with Azure AD and D365 security roles to ensure users only access data
                they're authorized to see.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <FileSpreadsheet className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Excel Export</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Export query results to Excel with one click. Perfect for sharing insights and
                further analysis.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16 bg-white/50 rounded-3xl my-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Real-World Use Cases</h3>
          <p className="text-muted-foreground text-lg">
            See how teams use D365 Data Agent to solve everyday challenges
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="space-y-3">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
              1
            </div>
            <h4 className="font-semibold text-lg">Supply Chain Analysis</h4>
            <p className="text-muted-foreground">
              "Which purchase orders could impact our production schedule this week?"
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
              2
            </div>
            <h4 className="font-semibold text-lg">Customer Insights</h4>
            <p className="text-muted-foreground">
              "Why can't we ship to customer XYZ? Show me their account status and credit limit."
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
              3
            </div>
            <h4 className="font-semibold text-lg">Financial Reporting</h4>
            <p className="text-muted-foreground">
              "Show me all invoices over $10,000 from last quarter by customer."
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-4xl font-bold mb-6">Ready to Get Started?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Sign in with your Azure AD account and start querying your D365 data in seconds.
          </p>
          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            className="text-lg px-8"
          >
            Sign In Now <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 D365 F&O Data Agent. Built for enterprise data intelligence.</p>
        </div>
      </footer>
    </div>
  );
}
