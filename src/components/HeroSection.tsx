import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import portfolio1 from "@/assets/portfolio-1.jpg";
import portfolio2 from "@/assets/portfolio-2.jpg";
import portfolio3 from "@/assets/portfolio-3.jpg";
import { Target, TrendingUp, DollarSign } from "lucide-react";

function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

const floatingImages = [portfolio1, portfolio2, portfolio3];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="ACQ Enterprise Solutions" className="w-full h-full object-cover opacity-30" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
      </div>

      {/* Floating project images on the right */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block overflow-hidden">
        {floatingImages.map((img, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.3, duration: 0.8 }}
            className="absolute"
            style={{
              top: `${15 + i * 25}%`,
              right: `${5 + i * 12}%`,
              zIndex: 3 - i,
            }}
          >
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-xl overflow-hidden border border-border shadow-2xl glow-teal"
              style={{ width: `${280 - i * 30}px` }}
            >
              <img
                src={img}
                alt="Project preview"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="container relative z-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            We Accelerate Your{" "}
            <span className="text-gradient-teal">Business Results.</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            With over 10 years of experience and 1,100+ companies served, ACQ Enterprise Solutions delivers strategic technology solutions to drive your business growth.
          </p>

          <div className="flex flex-wrap gap-4 mb-10">
            <a
              href="https://wa.me/5562999953623"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg glow-teal transition-all hover:scale-105"
            >
              Get Started
            </a>
          </div>

          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-secondary/80 backdrop-blur-sm border border-glow rounded-lg px-6 py-3 text-center">
              <div className="text-2xl font-bold text-primary">
                <AnimatedCounter end={10} suffix="+" />
              </div>
              <div className="text-xs text-muted-foreground">Years in market</div>
            </div>
            <div className="bg-secondary/80 backdrop-blur-sm border border-glow rounded-lg px-6 py-3 text-center">
              <div className="text-2xl font-bold text-primary">
                <AnimatedCounter end={1100} suffix="+" />
              </div>
              <div className="text-xs text-muted-foreground">Companies served</div>
            </div>
            <div className="bg-secondary/80 backdrop-blur-sm border border-glow rounded-lg px-6 py-3 text-center">
              <div className="text-2xl font-bold text-primary">
                <AnimatedCounter end={50} suffix="M+" />
              </div>
              <div className="text-xs text-muted-foreground">Revenue generated</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Strategy</span>
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Results</span>
            <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Growth</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
