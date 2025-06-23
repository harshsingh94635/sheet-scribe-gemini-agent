import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { DataProcessor } from '@/components/DataProcessor';
import { ResultsViewer } from '@/components/ResultsViewer';
import { ApiKeySetup } from '@/components/ApiKeySetup';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, FileSpreadsheet, Globe, Zap } from 'lucide-react';

export interface SpreadsheetRow {
  [key: string]: string;
}

export interface ProcessedData {
  originalData: SpreadsheetRow[];
  processedData: SpreadsheetRow[];
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
}

const Index = () => {
  const [processedData, setProcessedData] = useState<ProcessedData>({
    originalData: [],
    processedData: [],
    status: 'idle',
    progress: 0
  });

  const [uploadedData, setUploadedData] = useState<SpreadsheetRow[]>([]);
  const [activeTab, setActiveTab] = useState('upload');

  const handleDataUploaded = (data: SpreadsheetRow[]) => {
    setUploadedData(data);
    setProcessedData(prev => ({
      ...prev,
      originalData: data,
      processedData: [],
      status: 'idle',
      progress: 0
    }));
    setActiveTab('process');
  };

  const handleProcessingUpdate = (update: { status: 'idle' | 'processing' | 'completed' | 'error'; progress: number }) => {
    setProcessedData(prev => ({ ...prev, ...update }));
  };

  const handleProcessingComplete = (results: SpreadsheetRow[]) => {
    setProcessedData(prev => ({
      ...prev,
      processedData: results,
      status: 'completed',
      progress: 100
    }));
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Spreadsheet Agent
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Automate data population in spreadsheets using AI-powered web browsing and data extraction
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <FileSpreadsheet className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Data Processing</h3>
            <p className="text-gray-600 text-sm">Upload CSV files and let AI automatically identify columns to populate</p>
          </Card>
          <Card className="p-6 text-center border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <Globe className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Web Intelligence</h3>
            <p className="text-gray-600 text-sm">Browse the web intelligently to find accurate contact information</p>
          </Card>
          <Card className="p-6 text-center border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <Zap className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gemini AI Powered</h3>
            <p className="text-gray-600 text-sm">Leverages Google's Gemini 1.5 Flash for intelligent data extraction</p>
          </Card>
        </div>

        {/* Main Application */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="setup">API Setup</TabsTrigger>
              <TabsTrigger value="upload">Upload Data</TabsTrigger>
              <TabsTrigger value="process" disabled={uploadedData.length === 0}>Process</TabsTrigger>
              <TabsTrigger value="results" disabled={processedData.status !== 'completed'}>Results</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="p-6">
              <ApiKeySetup />
            </TabsContent>

            <TabsContent value="upload" className="p-6">
              <FileUploader onDataUploaded={handleDataUploaded} />
            </TabsContent>

            <TabsContent value="process" className="p-6">
              <DataProcessor 
                data={uploadedData}
                onUpdate={handleProcessingUpdate}
                onComplete={handleProcessingComplete}
                status={processedData.status}
                progress={processedData.progress}
              />
            </TabsContent>

            <TabsContent value="results" className="p-6">
              <ResultsViewer 
                originalData={processedData.originalData}
                processedData={processedData.processedData}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Index;
