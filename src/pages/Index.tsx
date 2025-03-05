
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      // Redirect authenticated users to dashboard
      navigate('/auth');
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Manage Your Auto Repair Shop with Ease
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Streamline appointments, manage jobs, and grow your business with our
            all-in-one garage management system.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?type=owner')}>
              Garage Owner Login
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth?type=staff')}>
              Staff Login
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
