import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const OAuthCallback = ({ onLogin }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = searchParams.get('token');
        const userJson = searchParams.get('user');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setError('Authentication failed. Please try again.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            return;
        }

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                onLogin(token, user);
                navigate('/dashboard');
            } catch (err) {
                console.error('Failed to parse user data:', err);
                setError('Failed to process authentication data.');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } else {
            setError('Missing authentication data.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        }
    }, [searchParams, navigate, onLogin]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center p-6">
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-12 text-center max-w-md">
                {error ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-heading font-bold text-stone-900">
                            Authentication Failed
                        </h2>
                        <p className="text-stone-600 font-body">{error}</p>
                        <p className="text-sm text-stone-500 font-body">Redirecting to login...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                        <h2 className="text-2xl font-heading font-bold text-stone-900">
                            Completing Sign In
                        </h2>
                        <p className="text-stone-600 font-body">Please wait while we set up your account...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OAuthCallback;
