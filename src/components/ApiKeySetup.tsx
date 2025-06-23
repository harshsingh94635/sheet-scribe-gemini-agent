
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Key, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const ApiKeySetup = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [isGeminiValid, setIsGeminiValid] = useState(false);
  const [isFirecrawlValid, setIsFirecrawlValid] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isTestingFirecrawl, setIsTestingFirecrawl] = useState(false);

  useEffect(() => {
    // Load saved API keys
    const savedGeminiKey = localStorage.getItem('gemini_api_key');
    const savedFirecrawlKey = localStorage.getItem('firecrawl_api_key');
    
    if (savedGeminiKey) {
      setGeminiApiKey(savedGeminiKey);
      testGeminiKey(savedGeminiKey);
    }
    
    if (savedFirecrawlKey) {
      setFirecrawlApiKey(savedFirecrawlKey);
      testFirecrawlKey(savedFirecrawlKey);
    }
  }, []);

  const testGeminiKey = async (apiKey: string) => {
    if (!apiKey.trim()) return;
    
    setIsTestingGemini(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent('Test');
      const response = await result.response;
      
      if (response.text()) {
        setIsGeminiValid(true);
        localStorage.setItem('gemini_api_key', apiKey);
        toast.success('Gemini API key validated successfully!');
      }
    } catch (error) {
      console.error('Gemini API test failed:', error);
      setIsGeminiValid(false);
      toast.error('Invalid Gemini API key');
    } finally {
      setIsTestingGemini(false);
    }
  };

  const testFirecrawlKey = async (apiKey: string) => {
    if (!apiKey.trim()) return;
    
    setIsTestingFirecrawl(true);
    try {
      const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
      const app = new FirecrawlApp({ apiKey });
      
      // Test with a simple scrape
      const testResponse = await app.scrapeUrl('https://example.com');
      
      if (testResponse.success) {
        setIsFirecrawlValid(true);
        localStorage.setItem('firecrawl_api_key', apiKey);
        toast.success('Firecrawl API key validated successfully!');
      }
    } catch (error) {
      console.error('Firecrawl API test failed:', error);
      setIsFirecrawlValid(false);
      toast.error('Invalid Firecrawl API key');
    } finally {
      setIsTestingFirecrawl(false);
    }
  };

  const handleSaveGeminiKey = () => {
    testGeminiKey(geminiApiKey);
  };

  const handleSaveFirecrawlKey = () => {
    testFirecrawlKey(firecrawlApiKey);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Key className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">API Configuration</h2>
        <p className="text-gray-600">Set up your API keys to enable the AI agent functionality</p>
      </div>

      <div className="grid gap-6">
        {/* Gemini API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Google Gemini API Key
              {isGeminiValid && <CheckCircle className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Required for AI-powered data extraction and processing.{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Get your API key here <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gemini-key">API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSaveGeminiKey} 
              disabled={!geminiApiKey.trim() || isTestingGemini}
              className="w-full"
            >
              {isTestingGemini ? 'Testing...' : 'Save & Validate'}
            </Button>
          </CardContent>
        </Card>

        {/* Firecrawl API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              Firecrawl API Key
              {isFirecrawlValid && <CheckCircle className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Required for web scraping and data extraction from websites.{' '}
              <a 
                href="https://firecrawl.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Get your API key here <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firecrawl-key">API Key</Label>
              <Input
                id="firecrawl-key"
                type="password"
                placeholder="Enter your Firecrawl API key"
                value={firecrawlApiKey}
                onChange={(e) => setFirecrawlApiKey(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSaveFirecrawlKey} 
              disabled={!firecrawlApiKey.trim() || isTestingFirecrawl}
              className="w-full"
            >
              {isTestingFirecrawl ? 'Testing...' : 'Save & Validate'}
            </Button>
          </CardContent>
        </Card>

        {/* Status Alert */}
        {(isGeminiValid && isFirecrawlValid) && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All API keys are configured correctly! You can now proceed to upload and process your data.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
