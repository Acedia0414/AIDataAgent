import React from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { RAGAdmin } from '@/components/RAGAdmin';
import { Loader2 } from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function Admin() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        window.location.href = getLoginUrl();
        return null;
    }

    // Check if user is admin (you can adjust this based on your role system)
    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <Navigation />
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-md mx-auto text-center space-y-4">
                        <div className="text-4xl">🔒</div>
                        <h1 className="text-2xl font-bold">Access Denied</h1>
                        <p className="text-gray-600">You need admin privileges to access this page.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navigation />
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="space-y-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>
                        <p className="text-gray-600 mt-2">Manage system configuration and indexing</p>
                    </div>

                    {/* RAG Control Panel */}
                    <div>
                        <RAGAdmin />
                    </div>

                    {/* Future: Other admin panels */}
                    <div className="text-center text-gray-500 text-sm py-8">
                        More admin controls coming soon...
                    </div>
                </div>
            </div>
        </div>
    );
}
