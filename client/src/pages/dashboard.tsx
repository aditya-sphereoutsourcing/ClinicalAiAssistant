import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect as ReactuseEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Upload, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const defaultTab = params.get("tab") || "patients";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="drug-interactions">
              Drug Interactions
            </TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="upload">Upload EHR</TabsTrigger>
          </TabsList>

          <TabsContent value="patients">
            <PatientsList />
          </TabsContent>

          <TabsContent value="drug-interactions">
            <DrugInteractionChecker />
          </TabsContent>

          <TabsContent value="recommendations">
            <TreatmentRecommendations />
          </TabsContent>

          <TabsContent value="upload">
            <EHRUpload />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PatientsList() {
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ["/api/patients"],
  });

  if (isLoading) return <div>Loading patients...</div>;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading patients</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load patients"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {patients?.map((patient) => (
        <Card key={patient.id}>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold">{patient.name}</h3>
            <p className="text-sm text-muted-foreground">
              DOB: {patient.dob}
            </p>
            <div className="mt-4">
              <h4 className="font-medium">Current Medications:</h4>
              <ul className="list-disc list-inside">
                {patient.medications?.map((med, i) => (
                  <li key={i}>{med}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DrugInteractionChecker() {
  const [medications, setMedications] = useState<string[]>([]);
  const [newMed, setNewMed] = useState("");

  const interactionMutation = useMutation({
    mutationFn: async (meds: string[]) => {
      const res = await apiRequest("POST", "/api/drug-interactions", {
        medications: meds,
      });
      return res.json();
    },
  });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {interactionMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error checking drug interactions</AlertTitle>
            <AlertDescription>
              {interactionMutation.error instanceof Error 
                ? interactionMutation.error.message 
                : "Failed to check drug interactions"}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Input
            value={newMed}
            onChange={(e) => setNewMed(e.target.value)}
            placeholder="Enter medication name"
          />
          <Button
            onClick={() => {
              if (newMed) {
                setMedications([...medications, newMed]);
                setNewMed("");
              }
            }}
          >
            Add
          </Button>
        </div>

        <div>
          <h3 className="font-medium mb-2">Current Medications:</h3>
          <ul className="list-disc list-inside">
            {medications.map((med, i) => (
              <li key={i}>{med}</li>
            ))}
          </ul>
        </div>

        <Button
          onClick={() => interactionMutation.mutate(medications)}
          disabled={medications.length < 2 || interactionMutation.isPending}
        >
          Check Interactions
        </Button>

        {interactionMutation.data?.interactions?.map((interaction, i) => (
          <div key={i} className="p-4 border rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">
                  {interaction.drug1} + {interaction.drug2}
                </p>
                <p className="text-sm text-muted-foreground">
                  {interaction.description}
                </p>
                <p className="text-sm font-medium mt-1">
                  Risk Level: {interaction.risk}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TreatmentRecommendations() {
  const [condition, setCondition] = useState("");
  const [medications, setMedications] = useState<string[]>([]);
  const [newMed, setNewMed] = useState("");

  const recommendationMutation = useMutation({
    mutationFn: async (data: { condition: string; medications: string[] }) => {
      const res = await apiRequest("POST", "/api/recommendations", data);
      return res.json();
    },
  });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {recommendationMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error getting recommendations</AlertTitle>
            <AlertDescription>
              {recommendationMutation.error instanceof Error 
                ? recommendationMutation.error.message 
                : "Failed to get recommendations"}
            </AlertDescription>
          </Alert>
        )}

        <Input
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="Enter medical condition"
        />

        <div className="flex gap-2">
          <Input
            value={newMed}
            onChange={(e) => setNewMed(e.target.value)}
            placeholder="Enter current medication"
          />
          <Button
            onClick={() => {
              if (newMed) {
                setMedications([...medications, newMed]);
                setNewMed("");
              }
            }}
          >
            Add
          </Button>
        </div>

        <div>
          <h3 className="font-medium mb-2">Current Medications:</h3>
          <ul className="list-disc list-inside">
            {medications.map((med, i) => (
              <li key={i}>{med}</li>
            ))}
          </ul>
        </div>

        <Button
          onClick={() =>
            recommendationMutation.mutate({ condition, medications })
          }
          disabled={!condition || recommendationMutation.isPending}
        >
          Get Recommendations
        </Button>

        {recommendationMutation.data && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Recommendations:</h3>
              <ul className="list-disc list-inside">
                {recommendationMutation.data.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Warnings:</h3>
              <ul className="list-disc list-inside">
                {recommendationMutation.data.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">References:</h3>
              <ul className="list-disc list-inside">
                {recommendationMutation.data.references.map((ref, i) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EHRUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [patientName, setPatientName] = useState("");
  const [dob, setDob] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/patients", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setFile(null);
      setPatientName("");
      setDob("");
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        {uploadMutation.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error uploading EHR</AlertTitle>
            <AlertDescription>
              {uploadMutation.error instanceof Error 
                ? uploadMutation.error.message 
                : "Failed to upload EHR"}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!file || !patientName || !dob) return;

          const formData = new FormData();
          formData.append("ehrFile", file);
          formData.append("name", patientName);
          formData.append("dob", dob);
          uploadMutation.mutate(formData);
        }} className="space-y-4">
          <Input
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Patient Name"
            required
          />

          <Input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
          />

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="ehr-file"
              accept=".txt,.pdf"
            />
            <label
              htmlFor="ehr-file"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload EHR file"}
              </span>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!file || !patientName || !dob || uploadMutation.isPending}
          >
            Upload EHR
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}