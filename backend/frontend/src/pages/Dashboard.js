import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Card } from '../components/ui/card';
import { TrendingUp, TrendingDown, ShoppingCart, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Dashboard = ({ user, onLogout }) => {
  const [insights, setInsights] = useState(null);
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [insightsRes, billsRes] = await Promise.all([
        axios.get('/insights'),
        axios.get('/bills'),
      ]);
      setInsights(insightsRes.data);
      setRecentBills(billsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

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
    <div className="min-h-screen bg-stone-50" data-testid="dashboard">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-stone-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-lg text-stone-600 font-body">Here's your spending overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="stat-card bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="total-spending-card">
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

          <Card className="stat-card bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="bills-analyzed-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500 uppercase tracking-wider font-body mb-2">Bills Analyzed</p>
                <p className="text-3xl font-bold text-stone-900 font-mono">{recentBills.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="stat-card bg-gradient-to-br from-primary to-emerald-700 text-white border-0 shadow-lg rounded-2xl p-6" data-testid="savings-potential-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100 uppercase tracking-wider font-body mb-2">Savings Potential</p>
                <p className="text-3xl font-bold font-mono">₹{(insights?.total_spending * 0.12).toFixed(2) || '0.00'}</p>
                <p className="text-xs text-emerald-100 mt-1 font-body">~12% avg savings</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="monthly-trend-chart">
            <h3 className="text-xl font-bold text-stone-900 font-heading mb-4">Monthly Spending Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={insights?.monthly_trend || []}>
                <defs>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e7e5e4', 
                    borderRadius: '12px',
                    fontFamily: 'Public Sans'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="spending" 
                  stroke="#059669" 
                  strokeWidth={2}
                  fill="url(#colorSpending)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Breakdown */}
          <Card className="bg-white border border-stone-100 shadow-sm rounded-2xl p-6" data-testid="category-breakdown-chart">
            <h3 className="text-xl font-bold text-stone-900 font-heading mb-4">Category Breakdown</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={insights?.top_categories || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
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
            </div>
            <div className="mt-4 space-y-2">
              {insights?.top_categories?.slice(0, 5).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-stone-600 font-body">{cat.category}</span>
                  </div>
                  <span className="font-mono text-stone-900 font-semibold">₹{cat.amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/upload" data-testid="upload-bill-action">
            <Card className="bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-primary hover:-translate-y-1 transition-all rounded-2xl p-6 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 font-heading mb-1">Upload New Bill</h4>
                  <p className="text-sm text-stone-600 font-body">Scan and analyze receipt</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </Card>
          </Link>

          <Link to="/insights" data-testid="view-insights-action">
            <Card className="bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-primary hover:-translate-y-1 transition-all rounded-2xl p-6 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 font-heading mb-1">View Insights</h4>
                  <p className="text-sm text-stone-600 font-body">Detailed analytics</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </Card>
          </Link>

          <Link to="/shopping-list" data-testid="generate-list-action">
            <Card className="bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-primary hover:-translate-y-1 transition-all rounded-2xl p-6 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 font-heading mb-1">Generate List</h4>
                  <p className="text-sm text-stone-600 font-body">AI shopping suggestions</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;