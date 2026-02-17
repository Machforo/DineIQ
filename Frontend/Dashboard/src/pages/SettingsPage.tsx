import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function SettingsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setSpreadsheetId(localStorage.getItem("dineiq_spreadsheet_id") || "");
    setApiKey(localStorage.getItem("dineiq_api_key") || "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("dineiq_spreadsheet_id", spreadsheetId);
    localStorage.setItem("dineiq_api_key", apiKey);
    toast({ title: "Settings saved", description: "Google Sheets configuration updated" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your Google Sheets connection</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <CardTitle>Google Sheets Integration</CardTitle>
          </div>
          <CardDescription>
            Enter your Google Spreadsheet ID and API Key to connect your data. The spreadsheet should have one tab per entity (Menu, Customer_Auth, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="spreadsheet-id">Spreadsheet ID</Label>
            <Input
              id="spreadsheet-id"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Found in your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
            </p>
          </div>
          <div>
            <Label htmlFor="api-key">Google API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google Cloud API key"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Create an API key in the Google Cloud Console with Sheets API enabled.
            </p>
          </div>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
