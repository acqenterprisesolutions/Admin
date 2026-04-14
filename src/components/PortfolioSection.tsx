import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import portfolio1 from "@/assets/portfolio-1.jpg";
import portfolio2 from "@/assets/portfolio-2.jpg";
import portfolio3 from "@/assets/portfolio-3.jpg";
import portfolio4 from "@/assets/portfolio-4.jpg";

const projects = [
  {
    title: "Vegas Tour",
    category: "Institutional Website - Tourism",
    image: portfolio1,
    url: "https://vegastourbr.com/",
  },
  {
    title: "Yara EcoSafari",
    category: "Institutional Website - Tourism",
    image: portfolio2,
    url: "https://yaraecosafari.com/pt_br/",
  },
  {
    title: "LPA Law Firm",
    category: "Institutional Website - Law",
    image: portfolio3,
    url: "https://lpaadv.com/",
  },
  {
    title: "Auxel Fashion",
    category: "E-commerce - Clothing Store",
    image: portfolio4,
    url: "https://auxel.com.br/",
  },
];

const PortfolioSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.querySelector(".portfolio-card")?.clientWidth || 300;
    const gap = 24;
    const amount = direction === "left" ? -(cardWidth + gap) : cardWidth + gap;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="py-24 bg-gradient-dark" id="portfolio">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2">Portfolio</p>
          <h2 className="text-3xl md:text-5xl font-bold">
            Check Out Some of Our <span className="text-gradient-teal">Work</span>
          </h2>
        </motion.div>

        <div className="relative flex items-center">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center hover:bg-primary transition-colors shadow-lg mr-2 md:mr-4"
            aria-label="Previous project"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Scrollable Cards */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="portfolio-card flex-shrink-0 w-[260px] md:w-[300px] snap-center flex flex-col"
              >
                {/* Screenshot */}
                <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card group hover:border-primary/60 transition-all duration-500">
                  <div className="h-[340px] md:h-[400px] overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      width={600}
                      height={800}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Info below card */}
                <div className="pt-5 pb-2 text-center flex flex-col items-center gap-2">
                  <h3 className="text-lg font-bold">{project.title}</h3>
                  <p className="text-sm text-muted-foreground">{project.category}</p>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm"
                  >
                    Visit Site
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center hover:bg-primary transition-colors shadow-lg ml-2 md:ml-4"
            aria-label="Next project"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
