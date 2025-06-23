
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
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
    setIsProcessing(true);
    setUploadedFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast.error('Error parsing CSV file');
          setIsProcessing(false);
          return;
        }

        const data = results.data as SpreadsheetRow[];
        setPreviewData(data.slice(0, 5)); // Show first 5 rows for preview
        setIsProcessing(false);
        toast.success(`Successfully loaded ${data.length} rows`);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV file');
        setIsProcessing(false);
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
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
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleConfirmUpload = () => {
    if (uploadedFile) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as SpreadsheetRow[];
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
      col.toLowerCase().includes('incubator')
    );

    return { total: columns.length, nameColumns: possibleNameColumns };
  };

  const columnsInfo = getColumnsInfo();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Upload Your Spreadsheet</h2>
        <p className="text-gray-600">Upload a CSV file containing the data you want to enrich</p>
      </div>

      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}>
        <CardContent className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="text-center"
          >
            <FileText className={`h-16 w-16 mx-auto mb-4 ${
              isDragOver ? 'text-blue-600' : 'text-gray-400'
            }`} />
            <p className="text-lg font-medium mb-2">
              {isDragOver ? 'Drop your CSV file here' : 'Drag and drop your CSV file here'}
            </p>
            <p className="text-gray-500 mb-4">or</p>
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Browse Files'}
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Info and Preview */}
      {uploadedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              File Loaded: {uploadedFile.name}
            </CardTitle>
            <CardDescription>
              {previewData.length > 0 && (
                <>
                  {previewData.length} rows loaded • {columnsInfo?.total} columns detected
                  {columnsInfo?.nameColumns.length > 0 && (
                    <span className="text-green-600 font-medium">
                      {' '}• Found potential name columns: {columnsInfo.nameColumns.join(', ')}
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
                <h4 className="font-medium">Data Preview (first 5 rows):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData[0]).map((header) => (
                          <th key={header} className="px-4 py-2 text-left text-sm font-medium border-b">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.values(row).map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 text-sm border-b max-w-xs truncate">
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
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No obvious name/company columns detected. The AI will attempt to identify the best column to use for web searches.
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleConfirmUpload} className="w-full">
                  Proceed with This Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
