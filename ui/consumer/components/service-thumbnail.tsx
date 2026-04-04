type ServiceThumbnailProps = {
  category: string;
  color: string;
  id: string;
};

export function ServiceThumbnail({ category, color, id }: ServiceThumbnailProps) {
  return (
    <div className="h-52 relative overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 50%, ${color}18, transparent 70%), #060a10` }}>
      <svg width="100%" height="100%" viewBox="0 0 400 210" className="absolute inset-0">
        <defs>
          <radialGradient id={`bg-${id}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={color} stopOpacity="0.2"/><stop offset="100%" stopColor={color} stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="400" height="210" fill={`url(#bg-${id})`}/>
        {category === "Finance" ? (<>
          {/* Market Lens — stock candlestick chart */}
          <defs>
            <filter id={`tglow-${id}`}><feGaussianBlur stdDeviation="2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {[52,89,126,163].map(y => <line key={y} x1="60" y1={y} x2="350" y2={y} stroke="rgba(45,212,191,0.08)" strokeWidth="0.5"/>)}
          {/* Candlesticks: [x, open, close, high, low] — close>open = bullish(teal), close<open = bearish(red) */}
          {[
            [85,120,140,115,145],[115,140,110,105,148],[145,110,90,82,118],[175,95,115,90,122],
            [205,115,85,78,120],[235,85,70,62,92],[265,70,55,48,78],[305,55,35,28,60]
          ].map(([x,o,c,hi,lo],i) => {
            const bull = c < o; const clr = bull ? "rgba(45,212,191,0.85)" : "rgba(239,68,68,0.7)";
            const top = Math.min(o,c); const h = Math.abs(c-o) || 2;
            return <g key={i}>
              <line x1={x} y1={hi} x2={x} y2={lo} stroke={clr} strokeWidth="1"/>
              <rect x={x-8} y={top} width="16" height={h} fill={clr} rx="1">
                {i === 7 && <animate attributeName="height" values={`${h};${h+3};${h};${h-2};${h}`} dur="3s" repeatCount="indefinite"/>}
              </rect>
            </g>;
          })}
          {/* Trend line (moving average) */}
          <path d="M85,130 Q115,118 145,100 Q175,105 205,95 Q235,78 265,62 Q285,48 305,40" fill="none" stroke="#2dd4bf" strokeWidth="1.5" filter={`url(#tglow-${id})`} strokeDasharray="300" strokeDashoffset="300">
            <animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" fill="freeze"/>
          </path>
          {/* Ticker */}
          <text x="335" y="38" fill="#2dd4bf" fontSize="11" fontFamily="monospace" opacity="0">↑ 4.2%<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.5s" fill="freeze"/></text>
          {/* Volume bars */}
          {[85,115,145,175,205,235,265,305].map((x,i) => <rect key={`v${i}`} x={x-5} y={190-[8,12,6,10,14,9,11,16][i]} width="10" height={[8,12,6,10,14,9,11,16][i]} fill="rgba(45,212,191,0.1)" rx="1"/>)}
        </>) : category === "Automotive" ? (<>
          {/* Imagine Auto — cyberpunk car / tron grid */}
          <defs>
            <filter id={`cglow-${id}`}><feGaussianBlur stdDeviation="2.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Perspective grid floor */}
          {[150,160,168,175,181,186].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(245,158,11,0.12)" strokeWidth="0.5"/>)}
          {[-120,-70,-30,0,30,70,120,200].map(dx => <line key={dx} x1={200+dx} y1={210} x2={200+dx*0.15} y2={140} stroke="rgba(245,158,11,0.1)" strokeWidth="0.5"/>)}
          {/* Car silhouette — detailed futuristic supercar */}
          <g filter={`url(#cglow-${id})`} stroke="#f59e0b" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Main body — low aggressive roofline */}
            <path d="M80,140 L95,140 L105,118 L130,108 L175,105 L220,105 L245,112 L268,118 L278,130 L290,140 L300,140"/>
            {/* Windshield */}
            <path d="M130,108 L138,118 L175,118 L175,105"/>
            {/* Rear window */}
            <path d="M220,105 L220,118 L245,118 L245,112"/>
            {/* Door lines */}
            <line x1="150" y1="108" x2="150" y2="138" stroke="rgba(245,158,11,0.3)" strokeWidth="0.6"/>
            <line x1="215" y1="108" x2="215" y2="138" stroke="rgba(245,158,11,0.3)" strokeWidth="0.6"/>
            {/* Side skirt / undercarriage */}
            <path d="M95,140 Q190,145 300,140" stroke="rgba(245,158,11,0.4)" strokeWidth="0.8"/>
            {/* Front splitter */}
            <path d="M80,140 L65,140 L68,136" stroke="#f59e0b" strokeWidth="1"/>
            {/* Rear spoiler */}
            <path d="M268,118 L272,112 L285,112 L285,118" stroke="#f59e0b" strokeWidth="1"/>
            {/* Front wheel arch */}
            <path d="M100,138 Q100,128 115,126 Q130,124 133,132 Q134,138 130,140"/>
            {/* Front wheel */}
            <circle cx="117" cy="140" r="14" stroke="#f59e0b" strokeWidth="1.2"/>
            <circle cx="117" cy="140" r="8" stroke="rgba(245,158,11,0.5)" strokeWidth="0.8"/>
            <circle cx="117" cy="140" r="3" fill="rgba(245,158,11,0.4)" stroke="none"/>
            {/* Rear wheel arch */}
            <path d="M258,138 Q258,126 268,124 Q282,122 286,132 Q287,138 282,140"/>
            {/* Rear wheel */}
            <circle cx="272" cy="140" r="14" stroke="#f59e0b" strokeWidth="1.2"/>
            <circle cx="272" cy="140" r="8" stroke="rgba(245,158,11,0.5)" strokeWidth="0.8"/>
            <circle cx="272" cy="140" r="3" fill="rgba(245,158,11,0.4)" stroke="none"/>
            {/* Headlight — sharp angular */}
            <path d="M80,130 L75,127 L78,122 L88,124 L90,130" fill="rgba(245,158,11,0.2)"/>
            {/* Taillight */}
            <path d="M290,128 L295,125 L298,130 L296,135 L290,134" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="0.8"/>
            {/* Air intake details */}
            <line x1="160" y1="118" x2="160" y2="126" stroke="rgba(245,158,11,0.3)" strokeWidth="0.5"/>
            <line x1="167" y1="118" x2="167" y2="126" stroke="rgba(245,158,11,0.3)" strokeWidth="0.5"/>
            <line x1="174" y1="118" x2="174" y2="126" stroke="rgba(245,158,11,0.3)" strokeWidth="0.5"/>
          </g>
          {/* Headlight beams */}
          <polygon points="280,118 360,108 360,128" fill="url(#hbeam)" opacity="0.4"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite"/></polygon>
          <defs><linearGradient id="hbeam" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/></linearGradient></defs>
          {/* Speed lines */}
          <line x1="-200" y1="112" x2="-50" y2="112" stroke="#f59e0b" strokeWidth="0.8" opacity="0.5"><animateTransform attributeName="transform" type="translate" from="-400 0" to="400 0" dur="2s" repeatCount="indefinite"/></line>
          <line x1="-280" y1="120" x2="-180" y2="120" stroke="rgba(245,158,11,0.4)" strokeWidth="0.5"><animateTransform attributeName="transform" type="translate" from="-400 0" to="400 0" dur="2.8s" repeatCount="indefinite"/></line>
          {/* HUD elements */}
          <text x="25" y="30" fill="#f59e0b" fontSize="8" fontFamily="monospace" opacity="0.5">SCAN</text>
          <line x1="330" y1="190" x2="370" y2="190" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
          <line x1="340" y1="196" x2="375" y2="196" stroke="rgba(245,158,11,0.2)" strokeWidth="1"/>
          {/* Grid pull animation */}
          <rect x="0" y="140" width="400" height="70" fill="none"><animateTransform attributeName="transform" type="scale" values="1 1;1.02 1;1 1" dur="6s" repeatCount="indefinite"/></rect>
        </>) : category === "Music" ? (<>
          {/* Spot Splore — audio waveform */}
          {[0,1,2].map(i => <circle key={i} cx="200" cy="105" r={30+i*25} fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="0.5"><animate attributeName="r" values={`${30+i*25};${35+i*25};${30+i*25}`} dur={`${3+i}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.15;0.05;0.15" dur={`${3+i}s`} repeatCount="indefinite"/></circle>)}
          {[135,155,175,190,205,220,235,250,260,170,215,245].map((x,i) => {
            const h = 20 + (Math.sin(i*1.7)*15 + 15); const d = (0.8+i*0.07).toFixed(1);
            return <rect key={i} x={x} y={105-h/2} width="4" height={h} rx="2" fill="rgba(168,85,247,0.6)"><animate attributeName="height" values={`${h};${h*1.6};${h*0.7};${h}`} dur={`${d}s`} repeatCount="indefinite"/><animate attributeName="y" values={`${105-h/2};${105-h*0.8};${105-h*0.35};${105-h/2}`} dur={`${d}s`} repeatCount="indefinite"/></rect>;
          })}
          <circle cx="200" cy="60" r="2" fill="#c084fc" opacity="0.6"><animateTransform attributeName="transform" type="rotate" from="0 200 105" to="360 200 105" dur="6s" repeatCount="indefinite"/></circle>
          <circle cx="200" cy="150" r="1.5" fill="#e879f9" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="180 200 105" to="540 200 105" dur="8s" repeatCount="indefinite"/></circle>
        </>) : (<>
          {/* Smart Meal Planner — food / ingredients / organic */}
          <defs>
            <filter id={`fglow-${id}`}><feGaussianBlur stdDeviation="1.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Plate/bowl circles */}
          <circle cx="170" cy="100" r="55" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.2)" strokeWidth="0.8"><animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite"/></circle>
          <circle cx="215" cy="90" r="45" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.15)" strokeWidth="0.8"><animate attributeName="opacity" values="0.8;1;0.8" dur="3.5s" repeatCount="indefinite" begin="0.5s"/></circle>
          <circle cx="195" cy="120" r="40" fill="rgba(5,150,105,0.1)" stroke="rgba(5,150,105,0.18)" strokeWidth="0.8"><animate attributeName="opacity" values="0.8;1;0.8" dur="4.5s" repeatCount="indefinite" begin="1s"/></circle>
          {/* Leaf-ingredient dots */}
          {[{x:145,y:78,d:"2.5s"},{x:195,y:65,d:"3s"},{x:230,y:88,d:"2.8s"},{x:165,y:125,d:"3.5s"},{x:210,y:115,d:"4s"},{x:185,y:95,d:"2.2s"}].map((p,i) => <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="rgba(16,185,129,0.5)"><animate attributeName="cy" values={`${p.y};${p.y-4};${p.y}`} dur={p.d} repeatCount="indefinite"/></circle>
            <ellipse cx={p.x+4} cy={p.y-3} rx="4" ry="1.5" fill="rgba(34,197,94,0.35)" transform={`rotate(-30 ${p.x+4} ${p.y-3})`}><animate attributeName="cy" values={`${p.y-3};${p.y-7};${p.y-3}`} dur={p.d} repeatCount="indefinite"/></ellipse>
          </g>)}
          {/* Recipe flow line */}
          <path d="M145,78 Q170,70 195,65 Q215,72 230,88 Q220,105 210,115" fill="none" stroke="rgba(16,185,129,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
          {/* Completion ring — top right */}
          <circle cx="320" cy="45" r="18" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="2"/>
          <circle cx="320" cy="45" r="18" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="85" strokeDashoffset="85" strokeLinecap="round" transform="rotate(-90 320 45)"><animate attributeName="stroke-dashoffset" from="85" to="21" dur="2s" fill="freeze"/></circle>
          {/* 7 days label */}
          <text x="85" y="185" fill="rgba(16,185,129,0.4)" fontSize="9" fontFamily="monospace">7 days</text>
        </>)}
      </svg>
      {/* Thumbnail-to-text gradient bleed */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16" style={{ background: "linear-gradient(to top, rgba(15,31,46,0.9), transparent)" }} />
    </div>
  );
}
