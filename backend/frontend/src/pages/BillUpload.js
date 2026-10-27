import { useState, useRef } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Upload, FileImage, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const BillUpload = ({ user, onLogout }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setAnalysis(null);
    } else {
      toast.error('Please select a valid image file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a bill image first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/bills/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAnalysis(response.data);
      toast.success('Bill analyzed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload bill');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50" data-testid="bill-upload-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-stone-900 mb-2">
            Upload Your Bill
          </h1>
          <p className="text-lg text-stone-600 font-body">Scan and compare prices instantly</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div>
            <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-8" data-testid="upload-section">
              <div
                className={`bill-upload-zone rounded-2xl p-12 text-center cursor-pointer ${dragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                  data-testid="file-input"
                />
                
                {preview ? (
                  <div className="space-y-4">
                    <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-lg" />
                    <p className="text-sm text-stone-600 font-body">{file.name}</p>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                      }}
                      variant="outline"
                      size="sm"
                      data-testid="change-file-button"
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <FileImage className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-stone-900 font-heading">Drop your bill here</p>
                      <p className="text-sm text-stone-600 font-body mt-1">or click to browse</p>
                    </div>
                    <p className="text-xs text-stone-500 font-body">Supports JPG, PNG formats</p>
                  </div>
                )}
              </div>

              {file && !analysis && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full mt-6 bg-primary text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-full px-8 py-6 font-bold tracking-wide font-heading"
                  data-testid="analyze-button"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Analyze Bill
                    </span>
                  )}
                </Button>
              )}
            </Card>
          </div>

          {/* Results Section */}
          {analysis && (
            <div className="space-y-6" data-testid="analysis-results">
              {/* Bill Summary */}
              <Card className="bg-gradient-to-br from-primary to-emerald-700 text-white shadow-lg rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                  <h3 className="text-xl font-bold font-heading">Analysis Complete</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-emerald-100 text-sm font-body mb-1">Original Total</p>
                    <p className="text-2xl font-bold font-mono">₹{analysis.bill.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100 text-sm font-body mb-1">Potential Savings</p>
                    <p className="text-2xl font-bold font-mono">₹{analysis.total_savings_potential.toFixed(2)}</p>
                  </div>
                </div>
              </Card>

              {/* Price Comparisons */}
              <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6">
                <h3 className="text-xl font-bold text-stone-900 font-heading mb-4">Price Comparison</h3>
                <div className="space-y-4">
                  {analysis.items_with_prices.map((item, idx) => (
                    <div key={idx} className="price-battle-card bg-stone-50 rounded-xl p-4" data-testid={`price-comparison-${idx}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-stone-900 font-heading">{item.name}</h4>
                          <p className="text-sm text-stone-600 font-body">{item.category}</p>
                        </div>
                        {item.max_savings > 0 && (
                          <span className="savings-badge text-white text-xs px-3 py-1 rounded-full font-mono">
                            Save ₹{item.max_savings.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm pb-2 border-b border-stone-200">
                          <span className="text-stone-600 font-body">Your Price</span>
                          <span className="font-mono font-semibold text-stone-900">₹{item.original_price.toFixed(2)}</span>
                        </div>
                        
                        {item.platform_prices.slice(0, 3).map((platform, pidx) => (
                          <div key={pidx} className="flex items-center justify-between text-sm">
                            <span className="text-stone-700 font-body flex items-center gap-2">
                              {platform.platform}
                              {platform.url && (
                                <a href={platform.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </span>
                            <span className={`font-mono font-semibold ${
                              platform.price < item.original_price ? 'text-primary' : 'text-stone-900'
                            }`}>
                              ₹{platform.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BillUpload;