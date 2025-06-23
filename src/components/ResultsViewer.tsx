
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { SpreadsheetRow } from '@/pages/Index';

interface ResultsViewerProps {
  originalData: SpreadsheetRow[];
  processedData: SpreadsheetRow[];
}

export const ResultsViewer = ({ originalData, processedData }: ResultsViewerProps) => {
  const [activeTab, setActiveTab] = useState('summary');

  const downloadCSV = () => {
    if (processedData.length === 0) {
      toast.error('No processed data to download');
      return;
    }

    const csv = Papa.unparse(processedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `enriched_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV file downloaded successfully!');
    }
  };

  const getStatistics = () => {
    if (processedData.length === 0) return null;

    const targetFields = ['contact', 'phone', 'email', 'website', 'location', 'linkedin', 'address'];
    const stats = targetFields.map(field => {
      const populated = processedData.filter(row => 
        row[field] && row[field].toString().trim() !== ''
      ).length;
      
      return {
        field,
        populated,
        percentage: Math.round((populated / processedData.length) * 100)
      };
    });

    const totalPopulated = stats.reduce((sum, stat) => sum + stat.populated, 0);
    const totalPossible = stats.length * processedData.length;
    const overallCompletion = Math.round((totalPopulated / totalPossible) * 100);

    return { stats, overallCompletion };
  };

  const statistics = getStatistics();

  const getChangedRows = () => {
    if (!originalData.length || !processedData.length) return [];

    return processedData.filter((processedRow, index) => {
      const originalRow = originalData[index];
      if (!originalRow) return true;

      return Object.keys(processedRow).some(key => 
        processedRow[key] !== originalRow[key]
      );
    });
  };

  const changedRows = getChangedRows();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Processing Complete</h2>
        <p className="text-gray-600">Your data has been successfully enriched with AI-extracted information</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="data">Data View</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {statistics && (
            <>
              {/* Overall Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Processing Statistics
                  </CardTitle>
                  <CardDescription>
                    Data enrichment completion overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{processedData.length}</div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{changedRows.length}</div>
                      <div className="text-sm text-gray-600">Rows Enhanced</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{statistics.overallCompletion}%</div>
                      <div className="text-sm text-gray-600">Overall Completion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Field Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Field Completion Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {statistics.stats.map(stat => (
                      <div key={stat.field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">{stat.field}</Badge>
                          <span className="text-sm text-gray-600">
                            {stat.populated} of {processedData.length} rows
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12">{stat.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Data View Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enriched Data Preview</CardTitle>
              <CardDescription>
                Showing the first 10 rows of your processed data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(processedData[0]).map((header) => (
                          <th key={header} className="px-4 py-2 text-left text-sm font-medium border-b">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.entries(row).map(([key, value], cellIndex) => {
                            const isNewData = !originalData[index] || 
                              originalData[index][key] !== value;
                            
                            return (
                              <td 
                                key={cellIndex} 
                                className={`px-4 py-2 text-sm border-b max-w-xs truncate ${
                                  isNewData ? 'bg-green-50 text-green-800' : ''
                                }`}
                              >
                                {String(value || '')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {processedData.length > 10 && (
                    <div className="text-center text-sm text-gray-600 mt-4">
                      Showing 10 of {processedData.length} rows. Download the full dataset below.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No processed data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download your enriched dataset in CSV format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Enriched Dataset</h4>
                  <p className="text-sm text-gray-600">
                    {processedData.length} rows • {processedData.length > 0 ? Object.keys(processedData[0]).length : 0} columns
                  </p>
                </div>
                <Button onClick={downloadCSV} disabled={processedData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>

              {changedRows.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Data Enhancement Summary</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Successfully enhanced {changedRows.length} out of {processedData.length} rows with new contact information.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
