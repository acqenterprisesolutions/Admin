const marqueeItems = [
  "Landing Pages",
  "Web Development",
  "Mobile Apps",
  "Custom Software",
  "Business Automation",
  "API Integrations",
  "E-commerce",
  "UI/UX Design",
];

const MarqueeBanner = () => {
  return (
    <div className="relative overflow-hidden py-4 bg-secondary border-y border-border">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className="mx-8 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBanner;
