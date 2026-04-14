import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden" id="contact">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Accelerate Your <span className="text-gradient-teal">Growth?</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Take your business to the next level. Click below and our team of specialists will reach out to start your transformation.
          </p>
          <a
            href="https://wa.me/5562999953623"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-bold text-lg rounded-lg glow-teal transition-all hover:scale-105"
          >
            Let's Talk
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
