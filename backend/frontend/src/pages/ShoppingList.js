import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sparkles, ShoppingCart, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ShoppingList = ({ user, onLogout }) => {
  const [budget, setBudget] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState(null);
  const [savedLists, setSavedLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedLists();
  }, []);

  const fetchSavedLists = async () => {
    try {
      const response = await axios.get('/shopping-lists');
      setSavedLists(response.data);
    } catch (error) {
      toast.error('Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!budget || parseFloat(budget) <= 0) {
      toast.error('Please enter a valid budget');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`/shopping-list/generate?budget=${budget}`);
      setGeneratedList(response.data);
      setSavedLists([response.data, ...savedLists]);
      toast.success('Shopping list generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate list');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" data-testid="shopping-list-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-stone-900 mb-2">
            Smart Shopping List
          </h1>
          <p className="text-lg text-stone-600 font-body">AI-powered shopping suggestions based on your budget</p>
        </div>

        {/* Generator Section */}
        <Card className="bg-gradient-to-br from-primary to-emerald-700 text-white shadow-lg rounded-2xl p-8 mb-8" data-testid="generator-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/20 p-3 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold font-heading">Generate New List</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-emerald-100 text-sm font-body mb-2">Monthly Budget (₹)</label>
              <Input
                type="number"
                placeholder="5000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder:text-emerald-100 focus:border-white focus:ring-2 focus:ring-white/50 rounded-xl px-4 py-6 text-lg font-mono"
                data-testid="budget-input"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-white text-primary hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all rounded-full px-8 py-6 font-bold font-heading h-14"
                data-testid="generate-button"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate List
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Generated List */}
        {generatedList && (
          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6 mb-8" data-testid="generated-list">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold text-stone-900 font-heading">Your Shopping List</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-stone-600 font-body">Budget</p>
                <p className="text-2xl font-bold text-primary font-mono">₹{generatedList.budget.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {generatedList.items.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors"
                  data-testid={`list-item-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-5 h-5 text-stone-400" />
                    <div>
                      <p className="font-semibold text-stone-900 font-body">{item.name}</p>
                      <p className="text-sm text-stone-600 font-body">
                        {item.category} • {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono font-semibold text-stone-900">₹{item.estimated_price.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-stone-200">
              <p className="text-lg font-semibold text-stone-700 font-body">Total Estimated</p>
              <div className="text-right">
                <p className="text-2xl font-bold text-stone-900 font-mono">₹{generatedList.total_estimated.toFixed(2)}</p>
                {generatedList.total_estimated < generatedList.budget && (
                  <p className="text-sm text-primary font-body">
                    ₹{(generatedList.budget - generatedList.total_estimated).toFixed(2)} under budget
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Saved Lists */}
        {savedLists.length > 0 && (
          <div data-testid="saved-lists">
            <h3 className="text-2xl font-bold text-stone-900 font-heading mb-6">Previous Lists</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedLists.slice(0, 4).map((list, idx) => (
                <Card key={list.id} className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-stone-600 font-body">Budget: ₹{list.budget.toFixed(2)}</p>
                      <p className="text-xs text-stone-500 font-body">
                        {new Date(list.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-stone-900 font-mono">₹{list.total_estimated.toFixed(2)}</p>
                      <p className="text-xs text-stone-600 font-body">{list.items.length} items</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {list.items.slice(0, 3).map((item, iidx) => (
                      <p key={iidx} className="text-sm text-stone-700 font-body truncate">
                        • {item.name} - ₹{item.estimated_price.toFixed(2)}
                      </p>
                    ))}
                    {list.items.length > 3 && (
                      <p className="text-xs text-stone-500 font-body">+{list.items.length - 3} more items</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShoppingList;