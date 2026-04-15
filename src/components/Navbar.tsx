import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const links = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Portfolio", href: "/#portfolio" },
  { label: "About", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-2">
          <img src={logo} alt="ACQ Enterprise Solutions" className="h-10 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </a>
          ))}
          <Link to="/portal" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Client Area
          </Link>
          <a
            href="https://wa.me/5562999953623"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:scale-105 transition-transform"
          >
            Get in Touch
          </a>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-t border-border p-4 space-y-3">
          {links.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-primary">
              {l.label}
            </a>
          ))}
          <Link to="/portal" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-primary">
            Client Area
          </Link>
          <a
            href="https://wa.me/5562999953623"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg"
          >
            Get in Touch
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
