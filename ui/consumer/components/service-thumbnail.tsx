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
        </>) : category === "Productivity" ? (<>
          {/* Productivity — checklist / task board */}
          {/* Background dots */}
          {[0,1,2,3,4,5,6,7,8,9].map(r => [0,1,2,3,4,5,6,7,8,9,10,11].map(c =>
            <circle key={`d${r}-${c}`} cx={40+c*32} cy={20+r*20} r="0.8" fill={`${color}15`}/>
          ))}
          {/* Task items */}
          {[{y:55,w:180,done:true},{y:82,w:140,done:true},{y:109,w:200,done:false},{y:136,w:160,done:false}].map((t,i) => <g key={i}>
            <rect x="110" y={t.y-5} width="12" height="12" rx="2" fill={t.done ? `${color}90` : "none"} stroke={t.done ? color : `${color}40`} strokeWidth="1"/>
            {t.done && <path d={`M113,${t.y+1} l3,3 l5,-5`} stroke="#060a10" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}
            <rect x="132" y={t.y-1} width={t.w} height="4" rx="2" fill={t.done ? `${color}30` : `${color}12`}/>
          </g>)}
          {/* Progress bar */}
          <rect x="110" y="170" width="200" height="6" rx="3" fill={`${color}15`}/>
          <rect x="110" y="170" width="130" height="6" rx="3" fill={`${color}60`}>
            <animate attributeName="width" values="0;130" dur="1.5s" fill="freeze"/>
          </rect>
          <text x="318" y="175" fill={`${color}80`} fontSize="9" fontFamily="monospace">65%</text>
        </>) : category === "Education" ? (<>
          {/* Education — open book with lightbulb */}
          <defs>
            <filter id={`eglow-${id}`}><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Open book */}
          <path d="M130,135 L200,145 L270,135 L270,80 L200,90 L130,80 Z" fill={`${color}08`} stroke={`${color}25`} strokeWidth="1"/>
          <line x1="200" y1="90" x2="200" y2="145" stroke={`${color}20`} strokeWidth="1"/>
          {/* Page lines — left */}
          {[95,102,109,116,123].map(y => <line key={`l${y}`} x1="142" y1={y} x2="190" y2={y+5} stroke={`${color}12`} strokeWidth="0.8"/>)}
          {/* Page lines — right */}
          {[95,102,109,116,123].map(y => <line key={`r${y}`} x1="210" y1={y+5} x2="258" y2={y} stroke={`${color}12`} strokeWidth="0.8"/>)}
          {/* Lightbulb */}
          <g filter={`url(#eglow-${id})`}>
            <circle cx="200" cy="50" r="16" fill={`${color}15`} stroke={color} strokeWidth="1"/>
            <path d="M194,48 Q200,38 206,48" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            <line x1="196" y1="56" x2="204" y2="56" stroke={`${color}60`} strokeWidth="1"/>
            <line x1="197" y1="59" x2="203" y2="59" stroke={`${color}40`} strokeWidth="1"/>
          </g>
          {/* Knowledge particles */}
          {[{x:175,y:40,d:"3s"},{x:225,y:35,d:"2.5s"},{x:185,y:28,d:"3.5s"},{x:215,y:30,d:"2.8s"},{x:200,y:22,d:"4s"}].map((p,i) =>
            <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} opacity="0.4"><animate attributeName="opacity" values="0.2;0.6;0.2" dur={p.d} repeatCount="indefinite"/></circle>
          )}
        </>) : category === "Creative" ? (<>
          {/* Creative — paintbrush / design */}
          {/* Canvas outline */}
          <rect x="100" y="40" width="200" height="130" rx="4" fill="none" stroke={`${color}15`} strokeWidth="1" strokeDasharray="4 4"/>
          {/* Brush stroke */}
          <path d="M130,140 Q170,80 200,100 Q230,120 270,60" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6" strokeDasharray="200" strokeDashoffset="200">
            <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" fill="freeze"/>
          </path>
          {/* Palette circles */}
          {[{x:320,y:70,o:0.7},{x:335,y:90,o:0.5},{x:325,y:112,o:0.35},{x:340,y:130,o:0.2}].map((c,i) =>
            <circle key={i} cx={c.x} cy={c.y} r="8" fill={color} opacity={c.o}><animate attributeName="r" values="7;9;7" dur={`${3+i*0.5}s`} repeatCount="indefinite"/></circle>
          )}
          {/* Splatter dots */}
          {[{x:155,y:95},{x:185,y:75},{x:220,y:110},{x:245,y:80},{x:175,y:120},{x:250,y:95}].map((s,i) =>
            <circle key={i} cx={s.x} cy={s.y} r={1+Math.random()*2} fill={color} opacity={0.15+Math.random()*0.2}/>
          )}
        </>) : category === "Health" ? (<>
          {/* Health — heart rate / pulse */}
          <defs>
            <filter id={`hglow-${id}`}><feGaussianBlur stdDeviation="2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Heartbeat rings */}
          {[0,1,2].map(i =>
            <circle key={i} cx="200" cy="105" r={25+i*20} fill="none" stroke={`${color}10`} strokeWidth="0.5"><animate attributeName="r" values={`${25+i*20};${30+i*20};${25+i*20}`} dur={`${3+i}s`} repeatCount="indefinite"/></circle>
          )}
          {/* Heart / plus symbol */}
          <g filter={`url(#hglow-${id})`}>
            <rect x="194" y="92" width="12" height="26" rx="2" fill={`${color}40`}/>
            <rect x="187" y="99" width="26" height="12" rx="2" fill={`${color}40`}/>
          </g>
          {/* ECG pulse line */}
          <path d="M60,105 L140,105 L155,105 L165,75 L175,130 L185,90 L195,115 L205,105 L260,105 L340,105" fill="none" stroke={color} strokeWidth="1.5" filter={`url(#hglow-${id})`} strokeLinecap="round" strokeDasharray="350" strokeDashoffset="350">
            <animate attributeName="stroke-dashoffset" from="350" to="0" dur="2s" fill="freeze"/>
          </path>
          {/* Pulse dot */}
          <circle cx="340" cy="105" r="3" fill={color} opacity="0"><animate attributeName="opacity" values="0;0.8;0" dur="2s" begin="1.8s" repeatCount="indefinite"/></circle>
        </>) : (<>
          {/* Other / default — abstract neural network */}
          <defs>
            <filter id={`nglow-${id}`}><feGaussianBlur stdDeviation="2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Concentric circles */}
          {[0,1,2].map(i =>
            <circle key={i} cx="200" cy="105" r={35+i*30} fill="none" stroke={`${color}08`} strokeWidth="0.5"/>
          )}
          {/* Network nodes */}
          {[{x:200,y:105,r:6,main:true},{x:140,y:70,r:3.5},{x:260,y:75,r:3.5},{x:150,y:145,r:3},{x:255,y:140,r:3},{x:200,y:50,r:3}].map((n,i) => <g key={i}>
            {/* Connections to center */}
            {!n.main && <line x1="200" y1="105" x2={n.x} y2={n.y} stroke={`${color}15`} strokeWidth="0.8"/>}
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.main ? `${color}30` : `${color}20`} stroke={n.main ? color : `${color}40`} strokeWidth={n.main ? 1.2 : 0.8}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur={`${2.5+i*0.4}s`} repeatCount="indefinite"/>
            </circle>
          </g>)}
          {/* Cross-connections */}
          <line x1="140" y1="70" x2="260" y2="75" stroke={`${color}08`} strokeWidth="0.5"/>
          <line x1="150" y1="145" x2="255" y2="140" stroke={`${color}08`} strokeWidth="0.5"/>
          <line x1="140" y1="70" x2="150" y2="145" stroke={`${color}08`} strokeWidth="0.5"/>
          <line x1="260" y1="75" x2="255" y2="140" stroke={`${color}08`} strokeWidth="0.5"/>
          {/* Center glow */}
          <circle cx="200" cy="105" r="12" fill={`${color}08`} filter={`url(#nglow-${id})`}><animate attributeName="r" values="10;14;10" dur="4s" repeatCount="indefinite"/></circle>
        </>)}
      </svg>
      {/* Thumbnail-to-text gradient bleed */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16" style={{ background: "linear-gradient(to top, rgba(15,31,46,0.9), transparent)" }} />
    </div>
  );
}
