import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MapPin, ArrowLeft, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary relative overflow-hidden px-6">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-accent/10 blur-xl" />
      <div className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-accent/10 blur-xl" />

      {/* Road dashes */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-1 h-8 bg-primary-foreground rounded-full" />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Truck icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-accent/20 flex items-center justify-center">
              <Truck className="h-12 w-12 text-accent" />
            </div>
            <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-destructive flex items-center justify-center">
              <MapPin className="h-4 w-4 text-destructive-foreground" />
            </div>
          </div>
        </div>

        {/* 404 number */}
        <h1 className="text-8xl font-black text-primary-foreground/10 leading-none select-none">
          404
        </h1>

        <div className="space-y-2 -mt-4">
          <h2 className="text-2xl font-bold text-primary-foreground">
            Shipment Not Found
          </h2>
          <p className="text-primary-foreground/50 leading-relaxed">
            Looks like this route doesn't exist in our network. The page at{" "}
            <code className="text-accent font-mono text-sm bg-accent/10 px-1.5 py-0.5 rounded">
              {location.pathname}
            </code>{" "}
            couldn't be located.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-11 px-6">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <Link to="/tracking">
            <Button variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 gap-2 h-11 px-6">
              <MapPin className="h-4 w-4" /> Track Shipment
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
