import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Bot, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SpreadsheetRow } from '@/pages/Index';
import { GeminiService } from '@/services/GeminiService';
import { FirecrawlService } from '@/services/FirecrawlService';

interface DataProcessorProps {
  data: SpreadsheetRow[];
  onUpdate: (update: { status: 'idle' | 'processing' | 'completed' | 'error'; progress: number }) => void;
  onComplete: (results: SpreadsheetRow[]) => void;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
}

export const DataProcessor = ({ data, onUpdate, onComplete, status, progress }: DataProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [processedResults, setProcessedResults] = useState<SpreadsheetRow[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [targetColumns] = useState([
    'contact', 'phone', 'email', 'website', 'location', 'linkedin', 'address'
  ]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const identifyNameColumn = (data: SpreadsheetRow[]): string => {
    if (data.length === 0) return '';
    
    const columns = Object.keys(data[0]);
    const nameColumns = columns.filter(col => 
      col.toLowerCase().includes('name') || 
      col.toLowerCase().includes('company') ||
      col.toLowerCase().includes('incubator') ||
      col.toLowerCase().includes('organization')
    );
    
    return nameColumns[0] || columns[0];
  };

  const searchAndExtractData = async (entityName: string): Promise<Partial<SpreadsheetRow>> => {
    try {
      addLog(`Searching for: ${entityName}`);
      
      // Use Firecrawl to search and scrape
      const searchQuery = `${entityName} contact email phone website`;
      const firecrawlService = new FirecrawlService();
      
      // Search for the entity
      const searchResults = await firecrawlService.search(searchQuery);
      
      if (!searchResults.success || !searchResults.data?.length) {
        addLog(`No search results found for ${entityName}`);
        return {};
      }

      // Get the top result and scrape it
      const topResult = searchResults.data[0];
      addLog(`Scraping: ${topResult.url}`);
      
      const scrapeResult = await firecrawlService.scrape(topResult.url);
      
      if (!scrapeResult.success) {
        addLog(`Failed to scrape ${topResult.url}`);
        return {};
      }

      // Use Gemini to extract structured data
      const geminiService = new GeminiService();
      const extractedData = await geminiService.extractContactInfo(scrapeResult.data?.content || '', entityName);
      
      addLog(`Extracted data for ${entityName}`);
      return extractedData;
      
    } catch (error) {
      console.error('Error in searchAndExtractData:', error);
      addLog(`Error processing ${entityName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  };

  const processData = async () => {
    if (!data.length) {
      toast.error('No data to process');
      return;
    }

    // Check API keys
    const geminiKey = localStorage.getItem('gemini_api_key');
    const firecrawlKey = localStorage.getItem('firecrawl_api_key');
    
    if (!geminiKey || !firecrawlKey) {
      toast.error('Please configure your API keys first');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    onUpdate({ status: 'processing', progress: 0 });
    addLog('Starting data processing...');

    const nameColumn = identifyNameColumn(data);
    addLog(`Using column "${nameColumn}" for entity names`);

    const results: SpreadsheetRow[] = [];

    for (let i = currentRow; i < data.length; i++) {
      if (isPaused) {
        addLog('Processing paused');
        break;
      }

      setCurrentRow(i);
      const row = data[i];
      const entityName = row[nameColumn];

      if (!entityName || entityName.trim() === '') {
        addLog(`Skipping empty row ${i + 1}`);
        results.push(row);
        continue;
      }

      try {
        const extractedData = await searchAndExtractData(entityName);
        const enrichedRow = { ...row, ...extractedData };
        results.push(enrichedRow);
        
        const progressPercent = ((i + 1) / data.length) * 100;
        onUpdate({ status: 'processing', progress: progressPercent });
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        addLog(`Error processing row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push(row);
      }
    }

    setProcessedResults(results);
    setIsProcessing(false);
    
    if (!isPaused) {
      addLog('Processing completed!');
      onComplete(results);
      toast.success('Data processing completed successfully!');
    }
  };

  const handleStart = () => {
    if (isPaused) {
      setIsPaused(false);
      processData();
    } else {
      setCurrentRow(0);
      setProcessedResults([]);
      setLogs([]);
      processData();
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsProcessing(false);
    addLog('Processing paused by user');
  };

  const handleStop = () => {
    setIsPaused(false);
    setIsProcessing(false);
    setCurrentRow(0);
    onUpdate({ status: 'idle', progress: 0 });
    addLog('Processing stopped by user');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Bot className="h-12 w-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">AI Data Processing</h2>
        <p className="text-gray-600">Automated web browsing and data extraction in progress</p>
      </div>

      {/* Processing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Processing Configuration
          </CardTitle>
          <CardDescription>
            {data.length} rows loaded • Target columns: {targetColumns.join(', ')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Columns */}
          <div className="space-y-2">
            <h4 className="font-medium">Columns to populate:</h4>
            <div className="flex flex-wrap gap-2">
              {targetColumns.map(col => (
                <Badge key={col} variant="secondary">{col}</Badge>
              ))}
            </div>
          </div>

          {/* API Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {localStorage.getItem('gemini_api_key') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Gemini API</span>
            </div>
            <div className="flex items-center gap-2">
              {localStorage.getItem('firecrawl_api_key') ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Firecrawl API</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleStart} 
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isPaused ? 'Resume' : 'Start'} Processing
            </Button>
            
            {isProcessing && (
              <Button 
                onClick={handlePause} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            
            <Button 
              onClick={handleStop} 
              variant="destructive"
              disabled={!isProcessing && !isPaused}
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>

          {/* Progress */}
          {(isProcessing || isPaused) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Row {currentRow + 1} of {data.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Status */}
          {status !== 'idle' && (
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertDescription>
                Status: {status === 'processing' ? 'AI is actively processing your data...' : 
                         status === 'completed' ? 'Processing completed successfully!' : 
                         'Ready to start processing'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Activity Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
