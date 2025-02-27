import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Pill, Brain, Files } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clinical Decision Support</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard">
            <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
              <CardHeader>
                <Files className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>EHR Management</CardTitle>
              </CardHeader>
              <CardContent>
                Upload and manage patient electronic health records
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard?tab=drug-interactions">
            <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
              <CardHeader>
                <Pill className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Drug Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                Check for potential drug interactions and risks
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard?tab=recommendations">
            <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
              <CardHeader>
                <Brain className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                Get AI-powered treatment recommendations
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard?tab=upload">
            <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
              <CardHeader>
                <Upload className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Upload EHR</CardTitle>
              </CardHeader>
              <CardContent>
                Upload new patient records and data
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}