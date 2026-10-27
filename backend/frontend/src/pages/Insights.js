import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package } from 'lucide-react';
import { toast } from 'sonner';

const Insights = ({ user, onLogout }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await axios.get('/insights');
      setInsights(response.data);
    } catch (error) {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

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
    <div className="min-h-screen bg-stone-50" data-testid="insights-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-stone-900 mb-2">
            Spending Insights
          </h1>
          <p className="text-lg text-stone-600 font-body">Deep dive into your shopping patterns</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="total-spending-stat">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500 uppercase tracking-wider font-body mb-2">Total Spending</p>
                <p className="text-3xl font-bold text-stone-900 font-mono">₹{insights?.total_spending?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="categories-stat">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500 uppercase tracking-wider font-body mb-2">Categories</p>
                <p className="text-3xl font-bold text-stone-900 font-mono">
                  {Object.keys(insights?.category_breakdown || {}).length}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Package className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-emerald-700 text-white shadow-lg rounded-2xl p-6" data-testid="avg-spending-stat">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100 uppercase tracking-wider font-body mb-2">Avg Per Month</p>
                <p className="text-3xl font-bold font-mono">
                  ₹{insights?.monthly_trend?.length > 0 
                    ? (insights.monthly_trend.reduce((sum, m) => sum + m.spending, 0) / insights.monthly_trend.length).toFixed(2)
                    : '0.00'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend */}
          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="monthly-trend-insights">
            <h3 className="text-2xl font-bold text-stone-900 font-heading mb-6">Monthly Spending Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights?.monthly_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#78716c', fontFamily: 'Public Sans' }}
                />
                <YAxis 
                  tick={{ fill: '#78716c', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e7e5e4', 
                    borderRadius: '12px',
                    fontFamily: 'Public Sans'
                  }}
                />
                <Bar dataKey="spending" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Pie Chart */}
          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="category-pie-chart">
            <h3 className="text-2xl font-bold text-stone-900 font-heading mb-6">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={insights?.top_categories || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {(insights?.top_categories || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e7e5e4', 
                    borderRadius: '12px',
                    fontFamily: 'Public Sans'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Categories Table */}
        <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="top-categories-table">
          <h3 className="text-2xl font-bold text-stone-900 font-heading mb-6">Top Spending Categories</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700 uppercase tracking-wider font-body">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-stone-700 uppercase tracking-wider font-body">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-stone-700 uppercase tracking-wider font-body">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {insights?.top_categories?.map((cat, idx) => (
                  <tr key={cat.category} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                        <span className="font-semibold text-stone-900 font-body">{cat.category}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-semibold text-stone-900">
                      ₹{cat.amount?.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="bg-emerald-100 text-primary px-3 py-1 rounded-full text-sm font-mono font-semibold">
                        {cat.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Insights;