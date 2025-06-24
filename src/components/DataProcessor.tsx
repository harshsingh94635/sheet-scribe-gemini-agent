import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Bot, Globe, AlertCircle, CheckCircle, Sparkles, Zap, Target } from 'lucide-react';
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
  const [successCount, setSuccessCount] = useState(0);
  const [targetColumns] = useState([
    'contact', 'phone', 'email', 'website', 'location', 'linkedin', 'address', 'twitter', 'facebook'
  ]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
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
      addLog(`🔍 Processing entity: ${entityName}`);
      console.log(`Starting data extraction for: ${entityName}`);
      
      const firecrawlService = new FirecrawlService();
      
      const scrapeResult = await firecrawlService.searchAndScrapeEntity(entityName);
      
      if (!scrapeResult.success) {
        addLog(`❌ Failed to scrape data for ${entityName}`);
        console.log(`Scraping failed for ${entityName}:`, scrapeResult.error);
        return {};
      }

      if (!scrapeResult.data?.content) {
        addLog(`⚠️ No content found for ${entityName}`);
        return {};
      }

      console.log(`Content extracted for ${entityName}, length: ${scrapeResult.data.content.length}`);
      addLog(`📄 Content extracted, analyzing with Gemini AI...`);

      const geminiService = new GeminiService();
      const extractedData = await geminiService.extractContactInfo(scrapeResult.data.content, entityName);
      
      const fieldsExtracted = Object.keys(extractedData).length;
      if (fieldsExtracted > 0) {
        setSuccessCount(prev => prev + 1);
        addLog(`✅ Successfully extracted ${fieldsExtracted} fields for ${entityName}`);
      } else {
        addLog(`⚠️ No data extracted for ${entityName}`);
      }
      
      console.log(`Extracted data for ${entityName}:`, extractedData);
      
      return extractedData;
      
    } catch (error) {
      console.error('Error in searchAndExtractData:', error);
      addLog(`💥 Error processing ${entityName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  };

  const processData = async () => {
    if (!data.length) {
      toast.error('No data to process');
      return;
    }

    const geminiKey = localStorage.getItem('gemini_api_key');
    const firecrawlKey = localStorage.getItem('firecrawl_api_key');
    
    if (!geminiKey || !firecrawlKey) {
      toast.error('Please configure your API keys first in the API Setup tab');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setSuccessCount(0);
    onUpdate({ status: 'processing', progress: 0 });
    addLog('🚀 Starting AI-powered data processing...');

    const nameColumn = identifyNameColumn(data);
    addLog(`🎯 Using column "${nameColumn}" for entity names`);
    console.log(`Processing ${data.length} rows, using column: ${nameColumn}`);

    const results: SpreadsheetRow[] = [];

    for (let i = currentRow; i < data.length; i++) {
      if (isPaused) {
        addLog('⏸️ Processing paused by user');
        break;
      }

      setCurrentRow(i);
      const row = data[i];
      const entityName = row[nameColumn];

      if (!entityName || entityName.trim() === '') {
        addLog(`⏭️ Skipping empty row ${i + 1}`);
        results.push(row);
        continue;
      }

      try {
        addLog(`🔄 Processing row ${i + 1}/${data.length}: ${entityName}`);
        const extractedData = await searchAndExtractData(entityName);
        
        const enrichedRow = { ...row, ...extractedData };
        results.push(enrichedRow);
        
        console.log(`Row ${i + 1} processed:`, enrichedRow);
        
        const progressPercent = ((i + 1) / data.length) * 100;
        onUpdate({ status: 'processing', progress: progressPercent });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        addLog(`💥 Error processing row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push(row);
      }
    }

    console.log('Processing completed, total results:', results.length);
    setProcessedResults(results);
    setIsProcessing(false);
    
    if (!isPaused) {
      addLog(`🎉 Processing completed! Enhanced ${results.length} rows with ${successCount} successful extractions`);
      onComplete(results);
      toast.success(`🎊 Data processing completed! Successfully enhanced ${successCount} entries.`);
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
    addLog('⏸️ Processing paused by user');
  };

  const handleStop = () => {
    setIsPaused(false);
    setIsProcessing(false);
    setCurrentRow(0);
    onUpdate({ status: 'idle', progress: 0 });
    addLog('⏹️ Processing stopped by user');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full shadow-lg animate-pulse">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <Sparkles className="h-6 w-6 text-yellow-500 animate-bounce" />
          <Zap className="h-6 w-6 text-blue-500 animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          🤖 AI Data Processing Engine
        </h2>
        <p className="text-gray-600 text-lg">Advanced web intelligence and data extraction in progress ✨</p>
      </div>

      {/* Enhanced Processing Overview */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-6 w-6 text-purple-600" />
            🎯 Processing Configuration
          </CardTitle>
          <CardDescription className="text-lg">
            📊 {data.length} rows loaded • 🎯 {targetColumns.length} target columns • 🚀 AI-powered extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Target Columns */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              📋 Information to Extract:
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {targetColumns.map(col => (
                <Badge key={col} variant="secondary" className="p-2 text-center bg-gradient-to-r from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 transition-all duration-200">
                  {col === 'contact' && '📞'} 
                  {col === 'phone' && '☎️'} 
                  {col === 'email' && '📧'} 
                  {col === 'website' && '🌐'} 
                  {col === 'location' && '📍'} 
                  {col === 'linkedin' && '💼'} 
                  {col === 'address' && '🏢'} 
                  {col === 'twitter' && '🐦'} 
                  {col === 'facebook' && '📘'}
                  {' '}{col}
                </Badge>
              ))}
            </div>
          </div>

          {/* Enhanced API Status */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                {localStorage.getItem('gemini_api_key') ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <span className="font-medium">🧠 Gemini AI</span>
                  <p className="text-xs text-gray-500">Data extraction engine</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                {localStorage.getItem('firecrawl_api_key') ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <span className="font-medium">🕷️ Firecrawl</span>
                  <p className="text-xs text-gray-500">Web scraping service</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Success Statistics */}
          {isProcessing && (
            <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between">
                <span className="font-medium">✅ Successful Extractions</span>
                <span className="text-2xl font-bold text-green-600">{successCount}</span>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Processing Controls */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            🎮 Processing Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleStart} 
              disabled={isProcessing}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <Play className="h-4 w-4" />
              {isPaused ? '▶️ Resume Magic' : '🚀 Start AI Processing'}
            </Button>
            
            {isProcessing && (
              <Button 
                onClick={handlePause} 
                variant="outline"
                className="flex items-center gap-2 hover:bg-orange-50 border-orange-300"
              >
                <Pause className="h-4 w-4" />
                ⏸️ Pause
              </Button>
            )}
            
            <Button 
              onClick={handleStop} 
              variant="destructive"
              disabled={!isProcessing && !isPaused}
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              ⏹️ Stop
            </Button>
          </div>

          {/* Enhanced Progress Display */}
          {(isProcessing || isPaused) && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>🔄 Row {currentRow + 1} of {data.length}</span>
                <span className="text-blue-600">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full h-3 bg-gray-200">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300" />
              </Progress>
              <div className="text-center text-sm text-gray-600">
                ✅ {successCount} successful extractions so far
              </div>
            </div>
          )}

          {/* Enhanced Status */}
          {status !== 'idle' && (
            <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <Bot className="h-4 w-4 text-blue-600" />
              <AlertDescription className="font-medium">
                {status === 'processing' && '🤖 AI is actively processing your data with advanced web intelligence...'}
                {status === 'completed' && '🎉 Processing completed successfully! Your data has been enriched.'}
                {status === 'error' && '❌ An error occurred during processing.'}
                {status === 'idle' && '⚡ Ready to start AI-powered data enhancement'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Activity Logs */}
      {logs.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              📊 Live Activity Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-48 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1 opacity-80 hover:opacity-100 transition-opacity">
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
