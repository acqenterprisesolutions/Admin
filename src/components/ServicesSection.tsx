import { motion } from "framer-motion";
import { Globe, Code2 } from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "Landing Pages for Local Businesses",
    description: "High-converting, beautifully designed landing pages tailored for local businesses. We help you attract more customers, build trust, and grow your online presence with pages optimized for performance and conversions.",
    features: ["Custom responsive design", "SEO optimized", "Fast loading speed", "Lead capture forms", "Google Analytics integration", "Mobile-first approach"],
  },
  {
    icon: Code2,
    title: "Systems, Software, Apps & Automations",
    description: "End-to-end development of custom systems, software platforms, mobile applications, and business automations. We transform your ideas into powerful digital solutions that streamline operations and scale your business.",
    features: ["Custom software development", "Mobile apps (iOS & Android)", "Business process automation", "API integrations", "Cloud-based solutions", "Ongoing support & maintenance"],
  },
];

const ServicesSection = () => {
  return (
    <section className="py-24 bg-gradient-section" id="services">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Our <span className="text-gradient-teal">Services</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We specialize in two core areas to help your business thrive in the digital landscape.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="group bg-card border border-border hover:border-primary/40 rounded-xl p-8 transition-all duration-300 hover:glow-teal"
            >
              <service.icon className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
              <p className="text-muted-foreground mb-6">{service.description}</p>
              <ul className="grid grid-cols-2 gap-2">
                {service.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
