import { Phone, Mail, MapPin } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="py-16 border-t border-border">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          <div>
            <h3 className="text-2xl font-bold mb-4">
              ACQ <span className="text-gradient-teal">Enterprise Solutions</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Over 10 years accelerating business results in the USA and Brazil.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <a href="tel:+5562999953623" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-primary" /> +55 (62) 9 9995-3623
              </a>
              <a href="mailto:lucas@acqent.solutions" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-primary" /> lucas@acqent.solutions (USA)
              </a>
              <a href="mailto:contato@acqsolucoes.com" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-primary" /> contato@acqsolucoes.com (BRA)
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Offices</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> United States
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Brazil
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ACQ Enterprise Solutions. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
