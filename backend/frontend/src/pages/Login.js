import { useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { ShoppingBag, TrendingDown, Sparkles } from 'lucide-react';
import OAuthButtons from '../components/OAuthButtons';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(endpoint, payload);
      onLogin(response.data.token, response.data.user);
      toast.success(`Welcome ${response.data.user.name}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-3 rounded-2xl shadow-lg">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-heading font-extrabold text-stone-900">
              SmartSpend AI
            </h1>
          </div>

          <h2 className="text-3xl md:text-4xl font-heading font-bold text-stone-800 leading-tight">
            Save Money on Every
            <span className="text-primary"> Purchase</span>
          </h2>

          <p className="text-lg text-stone-600 font-body leading-relaxed">
            Scan your bills, compare prices across platforms, and discover savings you never knew existed.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 font-heading">Smart Price Comparison</h3>
                <p className="text-sm text-stone-600 font-body">Compare prices across Amazon, Flipkart & Meesho instantly</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 font-heading">AI-Powered Insights</h3>
                <p className="text-sm text-stone-600 font-body">Get personalized shopping recommendations based on your habits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8" data-testid="login-card">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-heading font-bold text-stone-900">
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h3>
              <p className="text-stone-600 font-body mt-2">
                {isLogin ? 'Sign in to your account' : 'Create your free account'}
              </p>
            </div>

            {/* OAuth Buttons */}
            <OAuthButtons loading={loading} />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-stone-500 font-body">OR</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2 font-body">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                    className="bg-stone-50 border-stone-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3"
                    data-testid="name-input"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2 font-body">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-stone-50 border-stone-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3"
                  data-testid="email-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2 font-body">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-stone-50 border-stone-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3"
                  data-testid="password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-full px-8 py-6 font-bold tracking-wide font-heading text-base"
                data-testid="submit-button"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-stone-600 hover:text-primary transition-colors font-body"
                data-testid="toggle-auth-mode"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;