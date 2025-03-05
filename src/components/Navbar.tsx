
import { Link } from "react-router-dom";
import { GarageSwitcher } from "./garage/GarageSwitcher";
import { useAuth } from "./auth/AuthProvider";

export function Navbar() {
  const { user } = useAuth();
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link to="/" className="text-xl font-bold text-gray-900">
          Garage Manager
        </Link>
        
        <div className="flex items-center gap-4">
          {user && <GarageSwitcher />}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/features" className="text-gray-700 hover:text-gray-900">
              Features
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-gray-900">
              Pricing
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-gray-900">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
