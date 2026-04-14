import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "Why choose ACQ Enterprise Solutions?",
    a: "With over 10 years of experience and 1,100+ companies served across multiple industries, we deliver proven results with personalized strategies tailored to your business needs.",
  },
  {
    q: "How can ACQ help grow my business?",
    a: "We create high-converting landing pages and develop custom software solutions that streamline your operations, attract more customers, and scale your revenue.",
  },
  {
    q: "How quickly can I expect results?",
    a: "For landing pages, you can see results within weeks of launch. For software projects, we follow agile methodologies to deliver value incrementally throughout the development process.",
  },
  {
    q: "Do you serve clients outside the USA?",
    a: "Yes! We have offices in the USA and Brazil, serving companies internationally with enterprise-grade technology solutions.",
  },
  {
    q: "What technologies do you use?",
    a: "We work with modern tech stacks including React, Node.js, Python, cloud platforms (AWS, GCP), mobile frameworks, and automation tools to build scalable, future-proof solutions.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-24 bg-gradient-section" id="faq">
      <div className="container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Frequently Asked <span className="text-gradient-teal">Questions</span>
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline hover:text-primary">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
