
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { SpreadsheetRow } from '@/pages/Index';

interface FileUploaderProps {
  onDataUploaded: (data: SpreadsheetRow[]) => void;
}

export const FileUploader = ({ onDataUploaded }: FileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<SpreadsheetRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback((file: File) => {
    console.log('Processing file:', file.name, file.type);
    setIsProcessing(true);
    setUploadedFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parsing complete:', results);
        
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast.error('Error parsing CSV file: ' + results.errors[0].message);
          setIsProcessing(false);
          return;
        }

        const data = results.data as SpreadsheetRow[];
        console.log('Parsed data:', data);
        
        if (data.length === 0) {
          toast.error('No data found in CSV file');
          setIsProcessing(false);
          return;
        }

        setPreviewData(data.slice(0, 5)); // Show first 5 rows for preview
        setIsProcessing(false);
        toast.success(`Successfully loaded ${data.length} rows`);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV file: ' + error.message);
        setIsProcessing(false);
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);
    
    const csvFile = files.find(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv')
    );

    if (csvFile) {
      processFile(csvFile);
    } else {
      toast.error('Please upload a CSV file');
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed:', e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name, file.type, file.size);
      processFile(file);
    }
  }, [processFile]);

  const handleBrowseClick = useCallback(() => {
    console.log('Browse button clicked');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('File input not found');
    }
  }, []);

  const handleConfirmUpload = () => {
    if (uploadedFile) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as SpreadsheetRow[];
          console.log('Uploading data to parent:', data.length, 'rows');
          onDataUploaded(data);
          toast.success('Data uploaded successfully!');
        }
      });
    }
  };

  const getColumnsInfo = () => {
    if (previewData.length === 0) return null;
    
    const columns = Object.keys(previewData[0]);
    const possibleNameColumns = columns.filter(col => 
      col.toLowerCase().includes('name') || 
      col.toLowerCase().includes('company') ||
      col.toLowerCase().includes('incubator') ||
      col.toLowerCase().includes('organization')
    );

    return { total: columns.length, nameColumns: possibleNameColumns };
  };

  const columnsInfo = getColumnsInfo();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg">
            <Upload className="h-8 w-8 text-white" />
          </div>
          <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Upload Your Spreadsheet
        </h2>
        <p className="text-gray-600 text-lg">Upload a CSV file and watch AI magic happen ✨</p>
      </div>

      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-all duration-300 transform hover:scale-[1.02] ${
        isDragOver 
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg' 
          : 'border-gray-300 hover:border-blue-400 hover:shadow-md'
      }`}>
        <CardContent className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="text-center"
          >
            <div className={`transition-all duration-300 ${isDragOver ? 'scale-110' : ''}`}>
              <FileText className={`h-20 w-20 mx-auto mb-4 transition-colors duration-300 ${
                isDragOver ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <p className="text-xl font-medium mb-2">
              {isDragOver ? '🎯 Drop your CSV file here!' : '📁 Drag and drop your CSV file here'}
            </p>
            <p className="text-gray-500 mb-6">or</p>
            
            <Button 
              onClick={handleBrowseClick}
              variant="outline" 
              className="cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg px-8 py-3" 
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Processing...' : '🚀 Browse Files'}
            </Button>
            
            <input
              id="file-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Info and Preview */}
      {uploadedFile && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="text-green-700">✅ File Loaded: {uploadedFile.name}</span>
            </CardTitle>
            <CardDescription className="text-lg">
              {previewData.length > 0 && (
                <>
                  📊 {previewData.length} rows loaded • 📈 {columnsInfo?.total} columns detected
                  {columnsInfo?.nameColumns.length > 0 && (
                    <span className="text-green-600 font-medium">
                      {' '}• 🎯 Found name columns: {columnsInfo.nameColumns.join(', ')}
                    </span>
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Preview Table */}
            {previewData.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-lg">📋 Data Preview (first 5 rows):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg bg-white shadow-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <tr>
                        {Object.keys(previewData[0]).map((header) => (
                          <th key={header} className="px-4 py-3 text-left text-sm font-semibold border-b text-gray-700">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="hover:bg-blue-50 transition-colors duration-150">
                          {Object.values(row).map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-3 text-sm border-b max-w-xs truncate">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Column Analysis */}
                {columnsInfo?.nameColumns.length === 0 && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700">
                      ⚠️ No obvious name/company columns detected. The AI will attempt to identify the best column for web searches.
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleConfirmUpload} 
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg transform hover:scale-[1.02] transition-all duration-200 py-4 text-lg"
                >
                  🚀 Proceed with This Data & Start AI Magic!
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
