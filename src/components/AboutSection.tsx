import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const steps = [
  "We map your entire business, analyzing from commercial structure to customer experience.",
  "We identify the ideal customer for your business — the ones actively looking for what you offer.",
  "We monitor your metrics daily and build a personalized strategy to boost your revenue.",
  "Based on validated data, we accelerate your business growth with proven methodologies.",
  "We provide all the resources you need: strategic planning, development, design, and automation.",
];

const AboutSection = () => {
  return (
    <section className="py-24 bg-gradient-dark" id="about">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              What <span className="text-gradient-teal">ACQ Enterprise Solutions</span> Does
            </h2>
            <p className="text-muted-foreground mb-8">
              We are a complete solution for businesses looking to grow with strategy and technology. With operations in Brazil and the United States, we serve companies across multiple industries with excellence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start bg-card/50 rounded-lg p-4 border border-border">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/80">{step}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
