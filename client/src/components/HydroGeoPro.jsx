import { useState, useRef, useMemo, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════
// HYDROGEO PRO v2 — With Real Maps, Georeferencing, Overlay
// ═══════════════════════════════════════════════════════════════════════

const T = {
  bg: "#060a10", surface: "rgba(100,180,255,0.03)", border: "rgba(100,180,255,0.08)",
  water: "#0ea5e9", waterLight: "#7dd3fc", aquifer: "#06b6d4",
  clean: "#10b981", warn: "#f59e0b", danger: "#ef4444", plume: "#a855f7",
  text: "#e2e8f0", muted: "rgba(255,255,255,0.35)",
  font: "'Sora', system-ui", mono: "'Fira Code', monospace",
};
const inp = (w) => ({ background:"rgba(100,180,255,0.05)", border:`1px solid ${T.border}`, color:"#fff", borderRadius:7, padding:"7px 10px", fontSize:12, fontFamily:T.mono, width:w||"100%", boxSizing:"border-box", outline:"none" });
const btn = (c=T.water,s) => ({ background:`${c}15`, border:`1px solid ${c}35`, color:c, borderRadius:8, padding:s?"5px 12px":"9px 18px", cursor:"pointer", fontSize:s?10:12, fontFamily:T.mono, fontWeight:600, whiteSpace:"nowrap" });
const lbl = { fontSize:9, color:T.muted, fontFamily:T.mono, textTransform:"uppercase", letterSpacing:1.2, marginBottom:4, display:"block" };
const card = { background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16, marginBottom:12 };
const badge = (c) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:6, fontSize:10, fontFamily:T.mono, background:`${c}12`, border:`1px solid ${c}25`, color:c });
function genId(){ return Math.random().toString(36).substr(2,9); }

// ─── TILE PROVIDERS ──────────────────────────────────────────────────
const TILES = {
  "ESRI Satellite": { url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr:"ESRI" },
  "OpenStreetMap": { url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr:"OSM" },
  "CartoDB Dark": { url:"https://basemaps-server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr:"ESRI" },
  "OpenTopo": { url:"https://tile.opentopomap.org/{z}/{x}/{y}.png", attr:"OpenTopo" },
};

const LITHOLOGIES = [
  { id:"fill", name:"Riporto", color:"#6B5B3E", pattern:"dots" },
  { id:"topsoil", name:"Terreno vegetale", color:"#5A7247", pattern:"grass" },
  { id:"asphalt", name:"Asfalto/CLS", color:"#444", pattern:"solid" },
  { id:"gravel", name:"Ghiaia", color:"#B8A080", pattern:"circles" },
  { id:"sand_c", name:"Sabbia grossa", color:"#D4B896", pattern:"dots_sp" },
  { id:"sand", name:"Sabbia", color:"#E8D5B0", pattern:"dots_d" },
  { id:"sand_f", name:"Sabbia fine", color:"#F0E0C0", pattern:"stipple" },
  { id:"silt_s", name:"Sabbia limosa", color:"#C8B898", pattern:"dash_dot" },
  { id:"silt", name:"Limo", color:"#A0967E", pattern:"dashes" },
  { id:"silt_c", name:"Limo argilloso", color:"#8E8068", pattern:"brick_d" },
  { id:"clay_s", name:"Argilla limosa", color:"#7A6E58", pattern:"clay_d" },
  { id:"clay", name:"Argilla", color:"#6B5F48", pattern:"brick" },
  { id:"peat", name:"Torba", color:"#3D3528", pattern:"waves" },
  { id:"rock", name:"Substrato", color:"#787068", pattern:"cross" },
];

const GW_CONTAMINANTS = [
  { key:"benzene", label:"Benzene", unit:"µg/L", lim:1 },
  { key:"toluene", label:"Toluene", unit:"µg/L", lim:15 },
  { key:"mtbe", label:"MTBE", unit:"µg/L", lim:40 },
  { key:"hcTot", label:"HC tot", unit:"µg/L", lim:350 },
  { key:"crVI", label:"Cr VI", unit:"µg/L", lim:5 },
  { key:"as", label:"As", unit:"µg/L", lim:10 },
  { key:"pceTce", label:"Σ PCE+TCE", unit:"µg/L", lim:10 },
];

// ─── INTERPOLATION (IDW + Marching Squares) ──────────────────────────
function idwInterpolate(pts, gx, gy, key, power=2) {
  let sw=0, swv=0;
  pts.forEach(p => {
    const d = Math.sqrt((gx-p.x)**2+(gy-p.y)**2) || 0.0001;
    const w = 1/(d**power);
    sw += w; swv += w * (p[key]||0);
  });
  return swv/sw;
}

function buildContours(pts, key, gridN=40) {
  if (pts.length < 3) return { contours:[], gridData:null };
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const pad = 5;
  const mnX=Math.min(...xs)-pad, mxX=Math.max(...xs)+pad;
  const mnY=Math.min(...ys)-pad, mxY=Math.max(...ys)+pad;
  const dx=(mxX-mnX)/gridN, dy=(mxY-mnY)/gridN;

  const grid=[];
  for(let j=0;j<=gridN;j++){
    const row=[];
    for(let i=0;i<=gridN;i++){
      const gx=mnX+i*dx, gy=mnY+j*dy;
      row.push({ x:gx, y:gy, v:idwInterpolate(pts,gx,gy,key) });
    }
    grid.push(row);
  }

  const vals = pts.map(p=>p[key]||0);
  const minV=Math.min(...vals), maxV=Math.max(...vals);
  const range = maxV-minV;
  if(range < 0.01) return { contours:[], gridData:grid };
  const step = range < 1 ? 0.1 : range < 5 ? 0.5 : range < 20 ? 1 : range < 100 ? 5 : 10;
  const levels=[];
  for(let v=Math.ceil(minV/step)*step; v<=maxV; v+=step) levels.push(parseFloat(v.toFixed(2)));

  const contours = levels.map(lev => {
    const segs=[];
    for(let j=0;j<gridN;j++){
      for(let i=0;i<gridN;i++){
        const c=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];
        const cv=c.map(p=>p.v);
        const above=cv.map(v=>v>=lev);
        const edges=[];
        for(let e=0;e<4;e++){
          const n=(e+1)%4;
          if(above[e]!==above[n]){
            const t=(lev-cv[e])/(cv[n]-cv[e]);
            edges.push({ x:c[e].x+t*(c[n].x-c[e].x), y:c[e].y+t*(c[n].y-c[e].y) });
          }
        }
        if(edges.length>=2) segs.push({a:edges[0],b:edges[1]});
        if(edges.length===4){ segs.push({a:edges[0],b:edges[1]}); segs.push({a:edges[2],b:edges[3]}); }
      }
    }
    return { level:lev, segments:segs };
  });
  return { contours, gridData:grid };
}

function computeFlowDir(pts, key) {
  if(pts.length<3) return null;
  const n=pts.length;
  let sx=0,sy=0,sz=0,sxx=0,syy=0,sxy=0,sxz=0,syz=0;
  pts.forEach(p=>{const x=p.x,y=p.y,z=p[key]||0;sx+=x;sy+=y;sz+=z;sxx+=x*x;syy+=y*y;sxy+=x*y;sxz+=x*z;syz+=y*z;});
  const D=n*(sxx*syy-sxy*sxy)-sx*(sx*syy-sxy*sy)+sy*(sx*sxy-sxx*sy);
  if(Math.abs(D)<1e-10) return null;
  const dzdx=(n*(sxz*syy-syz*sxy)-sz*(sx*syy-sxy*sy)+sy*(sx*syz-sxz*sy))/D;
  const dzdy=(n*(syz*sxx-sxz*sxy)-sx*(syz*sx-sxz*sy)+sz*(sx*sxy-sxx*sy))/D;
  const mag=Math.sqrt(dzdx*dzdx+dzdy*dzdy);
  const angle=Math.atan2(-dzdy,-dzdx)*180/Math.PI;
  return { dzdx, dzdy, mag, angle, deg:(angle+360)%360 };
}

// ═══════════════════════════════════════════════════════════════════════
// INTERACTIVE MAP WITH LEAFLET-STYLE TILE RENDERING
// Using pure canvas + tile fetching — no external map lib needed
// ═══════════════════════════════════════════════════════════════════════
function TileMap({ center, zoom, tileUrl, children, style, onMapClick, overlayImage, overlayOpacity, overlayRotation, overlayBounds }) {
  const containerRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [offset, setOffset] = useState({x:0,y:0});
  const [curZoom, setCurZoom] = useState(zoom||15);
  const [curCenter, setCurCenter] = useState(center||[45.41,9.26]);

  const tileSize = 256;
  const lon2tile = (lon,z) => ((lon+180)/360)*Math.pow(2,z);
  const lat2tile = (lat,z) => (1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,z);
  const tile2lon = (x,z) => x/Math.pow(2,z)*360-180;
  const tile2lat = (y,z) => { const n=Math.PI-2*Math.PI*y/Math.pow(2,z); return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))); };

  const latlngToPixel = useCallback((lat,lng) => {
    if(!containerRef.current) return {x:0,y:0};
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width/2, cy = rect.height/2;
    const tileX = lon2tile(lng, curZoom);
    const tileY = lat2tile(lat, curZoom);
    const centerTileX = lon2tile(curCenter[1], curZoom);
    const centerTileY = lat2tile(curCenter[0], curZoom);
    return {
      x: cx + (tileX - centerTileX) * tileSize + offset.x,
      y: cy + (tileY - centerTileY) * tileSize + offset.y,
    };
  }, [curCenter, curZoom, offset]);

  const pixelToLatlng = useCallback((px, py) => {
    if(!containerRef.current) return [0,0];
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width/2, cy = rect.height/2;
    const centerTileX = lon2tile(curCenter[1], curZoom);
    const centerTileY = lat2tile(curCenter[0], curZoom);
    const tileX = centerTileX + (px - cx - offset.x) / tileSize;
    const tileY = centerTileY + (py - cy - offset.y) / tileSize;
    return [tile2lat(tileY, curZoom), tile2lon(tileX, curZoom)];
  }, [curCenter, curZoom, offset]);

  // Generate visible tiles
  const tiles = useMemo(() => {
    if(!containerRef.current) return [];
    const rect = containerRef.current.getBoundingClientRect();
    if(!rect.width) return [];
    const w = rect.width, h = rect.height;
    const centerTX = lon2tile(curCenter[1], curZoom);
    const centerTY = lat2tile(curCenter[0], curZoom);

    const tilesX = Math.ceil(w / tileSize) + 2;
    const tilesY = Math.ceil(h / tileSize) + 2;
    const startTX = Math.floor(centerTX - tilesX/2);
    const startTY = Math.floor(centerTY - tilesY/2);

    const result = [];
    for(let ty = startTY; ty < startTY + tilesY + 1; ty++) {
      for(let tx = startTX; tx < startTX + tilesX + 1; tx++) {
        const px = w/2 + (tx - centerTX) * tileSize + offset.x;
        const py = h/2 + (ty - centerTY) * tileSize + offset.y;
        const url = tileUrl.replace("{z}",curZoom).replace("{x}",((tx%Math.pow(2,curZoom))+Math.pow(2,curZoom))%Math.pow(2,curZoom)).replace("{y}",ty);
        result.push({ tx, ty, px, py, url });
      }
    }
    return result;
  }, [curCenter, curZoom, offset, tileUrl]);

  const handleWheel = (e) => {
    e.preventDefault();
    const newZoom = Math.max(5, Math.min(19, curZoom + (e.deltaY < 0 ? 1 : -1)));
    setCurZoom(newZoom);
  };

  const handleMouseDown = (e) => {
    if(e.button===0 && !e.altKey) setDrag({x:e.clientX-offset.x, y:e.clientY-offset.y});
  };
  const handleMouseMove = (e) => {
    if(drag) setOffset({x:e.clientX-drag.x, y:e.clientY-drag.y});
  };
  const handleMouseUp = (e) => {
    if(drag && Math.abs(e.clientX-drag.x-offset.x)<3 && Math.abs(e.clientY-drag.y-offset.y)<3) {
      // Click, not drag
      if(onMapClick) {
        const rect = containerRef.current.getBoundingClientRect();
        const [lat,lng] = pixelToLatlng(e.clientX-rect.left, e.clientY-rect.top);
        onMapClick(lat,lng);
      }
    }
    setDrag(null);
  };

  // Recenter when center prop changes
  useEffect(() => { if(center) setCurCenter(center); }, [center]);
  useEffect(() => { if(zoom) setCurZoom(zoom); }, [zoom]);

  // Overlay image position
  const overlayStyle = useMemo(() => {
    if(!overlayImage || !overlayBounds || !containerRef.current) return null;
    const tl = latlngToPixel(overlayBounds.north, overlayBounds.west);
    const br = latlngToPixel(overlayBounds.south, overlayBounds.east);
    return {
      position:"absolute", left:tl.x, top:tl.y,
      width:br.x-tl.x, height:br.y-tl.y,
      opacity: overlayOpacity ?? 0.7,
      transform: `rotate(${overlayRotation||0}deg)`,
      transformOrigin: "center center",
      pointerEvents:"none", zIndex:2,
    };
  }, [overlayImage, overlayBounds, overlayOpacity, overlayRotation, latlngToPixel]);

  // Force re-render on mount
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ setMounted(true); },[]);

  return (
    <div ref={containerRef}
      onWheel={handleWheel} onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={()=>setDrag(null)}
      style={{ position:"relative", overflow:"hidden", cursor:drag?"grabbing":"grab", ...style }}>

      {/* Tiles */}
      {mounted && tiles.map(t => (
        <img key={`${t.tx}-${t.ty}-${curZoom}`} src={t.url} alt=""
          style={{ position:"absolute", left:t.px, top:t.py, width:tileSize, height:tileSize, pointerEvents:"none", imageRendering:"auto" }}
          draggable={false} onError={e => e.target.style.display="none"} />
      ))}

      {/* Overlay image */}
      {overlayImage && overlayStyle && (
        <img src={overlayImage} alt="overlay" style={overlayStyle} draggable={false} />
      )}

      {/* Children (markers, contours, etc.) get latlngToPixel */}
      {typeof children === "function" ? children({ latlngToPixel, pixelToLatlng, zoom: curZoom }) : children}

      {/* Zoom controls */}
      <div style={{ position:"absolute", top:10, right:10, display:"flex", flexDirection:"column", gap:2, zIndex:30 }}>
        <button onClick={()=>setCurZoom(z=>Math.min(19,z+1))} style={{...btn("#fff",true),background:"rgba(0,0,0,0.7)",width:30,height:30,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        <button onClick={()=>setCurZoom(z=>Math.max(5,z-1))} style={{...btn("#fff",true),background:"rgba(0,0,0,0.7)",width:30,height:30,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
        <div style={{background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:9,fontFamily:T.mono,padding:"2px 6px",borderRadius:4,textAlign:"center"}}>z{curZoom}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAP TAB — Full implementation
// ═══════════════════════════════════════════════════════════════════════
function MapTab({ project, setProject, wells, setWells, selectedId, setSelectedId, viewMode, selectedDate }) {
  const [tileProvider, setTileProvider] = useState("ESRI Satellite");
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [geoStep, setGeoStep] = useState(null); // null, "pt1", "pt2"
  const [geoPoints, setGeoPoints] = useState({ px1:null, px2:null, ll1:null, ll2:null });
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const tileUrl = TILES[tileProvider]?.url || TILES["ESRI Satellite"].url;

  // Water level points for contours
  const wlPoints = useMemo(() => {
    return wells.filter(w => w.lat != null).map(w => {
      const m = selectedDate ? w.measurements?.find(mm=>mm.date===selectedDate) : w.measurements?.[w.measurements.length-1];
      if(!m?.waterLevel) return null;
      const elev = (w.groundElevation||0) - m.waterLevel;
      return { ...w, x: w.lng, y: w.lat, wl: elev, depth: m.waterLevel };
    }).filter(Boolean);
  }, [wells, selectedDate]);

  // Contour data
  const { contours: wlContours } = useMemo(() => {
    if(viewMode!=="contours" && viewMode!=="flow") return { contours:[] };
    return buildContours(wlPoints, "wl", 35);
  }, [wlPoints, viewMode]);

  // Flow direction
  const flow = useMemo(() => {
    if(viewMode!=="flow" && viewMode!=="contours") return null;
    return computeFlowDir(wlPoints, "wl");
  }, [wlPoints, viewMode]);

  // Plume
  const plumePoints = useMemo(() => {
    if(viewMode!=="plume") return [];
    return wells.filter(w=>w.lat!=null).map(w=>{
      const m = selectedDate ? w.measurements?.find(mm=>mm.date===selectedDate) : w.measurements?.[w.measurements.length-1];
      if(!m?.chemistry?.benzene || m.chemistry.benzene <= 0) return null;
      return { ...w, x:w.lng, y:w.lat, conc:m.chemistry.benzene };
    }).filter(Boolean);
  }, [wells, selectedDate, viewMode]);

  const { contours: plumeContours } = useMemo(() => {
    if(plumePoints.length < 3) return { contours:[] };
    return buildContours(plumePoints, "conc", 30);
  }, [plumePoints]);

  const handleMapClick = (lat, lng) => {
    if(geoStep === "pt1") {
      setGeoPoints(p => ({...p, ll1:{lat,lng}}));
      setGeoStep("pt2");
      return;
    }
    if(geoStep === "pt2") {
      setGeoPoints(p => ({...p, ll2:{lat,lng}}));
      // Complete georeferencing
      const g = {...geoPoints, ll2:{lat,lng}};
      if(g.ll1 && g.ll2) {
        setProject(p => ({...p, overlayBounds:{
          north: Math.max(g.ll1.lat, g.ll2.lat),
          south: Math.min(g.ll1.lat, g.ll2.lat),
          west: Math.min(g.ll1.lng, g.ll2.lng),
          east: Math.max(g.ll1.lng, g.ll2.lng),
        }}));
      }
      setGeoStep(null);
      return;
    }
    if(addMode && newName.trim()) {
      const nw = { id:genId(), name:newName.trim(), type:"piezometro", lat, lng, mapX:50, mapY:50, groundElevation:null, totalDepth:null, diameter:2, screenFrom:null, screenTo:null, lithology:[], measurements:[] };
      setWells(prev=>[...prev, nw]);
      setSelectedId(nw.id);
      setNewName(""); setAddMode(false);
    }
  };

  const getWellColor = (w) => {
    const last = w.measurements?.[w.measurements.length-1];
    if(!last) return T.muted;
    if(GW_CONTAMINANTS.some(c=>(last.chemistry?.[c.key]||0)>c.lim)) return T.danger;
    if(last.waterLevel != null) return T.water;
    return T.clean;
  };

  const mapCenter = useMemo(() => {
    const placed = wells.filter(w=>w.lat!=null);
    if(placed.length===0) return [45.41, 9.26]; // default Milan area
    return [placed.reduce((s,w)=>s+w.lat,0)/placed.length, placed.reduce((s,w)=>s+w.lng,0)/placed.length];
  }, [wells]);

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%"}}>
      {/* Toolbar */}
      <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        {/* Tile provider */}
        <select style={{...inp(150),fontSize:10,padding:"5px 8px"}} value={tileProvider} onChange={e=>setTileProvider(e.target.value)}>
          {Object.keys(TILES).map(k=><option key={k}>{k}</option>)}
        </select>

        {addMode ? (
          <>
            <input style={{...inp(140),fontSize:11}} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome PZ (es. PZ01)" autoFocus/>
            <span style={{fontSize:10,color:T.warn,fontFamily:T.mono}}>← clicca sulla mappa</span>
            <button onClick={()=>setAddMode(false)} style={btn("rgba(255,255,255,0.3)",true)}>Annulla</button>
          </>
        ) : (
          <button onClick={()=>setAddMode(true)} style={btn(T.clean,true)}>+ Piezometro</button>
        )}

        {/* Upload map overlay */}
        <label style={{...btn(T.water,true), cursor:"pointer"}}>
          🗺 {project.overlayImage ? "Cambia mappa" : "Carica planimetria"}
          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
            const f=e.target.files?.[0]; if(!f) return;
            const r=new FileReader(); r.onload=ev=>setProject(p=>({...p, overlayImage:ev.target.result, overlayFileName:f.name})); r.readAsDataURL(f);
          }}/>
        </label>

        {/* Georeference button */}
        {project.overlayImage && !project.overlayBounds && (
          <button onClick={()=>setGeoStep("pt1")} style={btn(T.warn,true)}>
            📐 Georeferenzia (2 punti)
          </button>
        )}
        {geoStep && (
          <span style={{fontSize:10,color:T.warn,fontFamily:T.mono, animation:"blink 1s infinite"}}>
            {geoStep==="pt1" ? "👆 Clicca ANGOLO TOP-LEFT sulla mappa satellite" : "👆 Clicca ANGOLO BOTTOM-RIGHT"}
          </span>
        )}
      </div>

      {/* Overlay controls */}
      {project.overlayImage && project.overlayBounds && (
        <div style={{display:"flex",gap:16,marginBottom:10,alignItems:"center",padding:"8px 12px",background:T.surface,borderRadius:8,border:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6, flex:1}}>
            <span style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>OPACITÀ</span>
            <input type="range" min="0" max="1" step="0.05" value={overlayOpacity}
              onChange={e=>setOverlayOpacity(parseFloat(e.target.value))}
              style={{flex:1, accentColor:T.water, height:4}} />
            <span style={{fontSize:10,color:T.water,fontFamily:T.mono,width:35}}>{(overlayOpacity*100).toFixed(0)}%</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6, flex:1}}>
            <span style={{fontSize:9,color:T.muted,fontFamily:T.mono}}>ROTAZIONE</span>
            <input type="range" min="-180" max="180" step="0.5" value={overlayRotation}
              onChange={e=>setOverlayRotation(parseFloat(e.target.value))}
              style={{flex:1, accentColor:T.warn, height:4}} />
            <span style={{fontSize:10,color:T.warn,fontFamily:T.mono,width:35}}>{overlayRotation.toFixed(1)}°</span>
          </div>
          <button onClick={()=>setProject(p=>({...p, overlayBounds:null}))} style={btn("rgba(255,255,255,0.3)",true)}>↻ Re-geo</button>
        </div>
      )}

      {/* Map */}
      <TileMap center={mapCenter} zoom={15} tileUrl={tileUrl}
        style={{flex:1, minHeight:450, borderRadius:12, border:`1px solid ${T.border}`}}
        onMapClick={handleMapClick}
        overlayImage={project.overlayImage}
        overlayOpacity={overlayOpacity}
        overlayRotation={overlayRotation}
        overlayBounds={project.overlayBounds}>
        {({ latlngToPixel, zoom }) => (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:5}}>
            {/* SVG overlay for contours */}
            <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
              <defs><marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={T.aquifer}/></marker></defs>
              {/* Isopiezometric lines */}
              {wlContours.map((c,ci) => c.segments.map((s,si) => {
                const a=latlngToPixel(s.a.y,s.a.x);
                const b=latlngToPixel(s.b.y,s.b.x);
                return <line key={`wc${ci}-${si}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={T.waterLight} strokeWidth={1.3} opacity={0.6}/>;
              }))}
              {/* Contour labels */}
              {wlContours.filter(c=>c.segments.length>0).map((c,ci)=>{
                const mid=c.segments[Math.floor(c.segments.length/2)];
                const p=latlngToPixel((mid.a.y+mid.b.y)/2,(mid.a.x+mid.b.x)/2);
                return <text key={`wcl${ci}`} x={p.x} y={p.y} fill={T.waterLight} fontSize={10}
                  fontFamily={T.mono} fontWeight="600" textAnchor="middle"
                  style={{textShadow:"0 0 6px rgba(0,0,0,0.9)", paintOrder:"stroke", stroke:"rgba(0,0,0,0.7)", strokeWidth:3}}>
                  {c.level.toFixed(1)}
                </text>;
              })}
              {/* Flow arrow */}
              {flow && wlPoints.length >= 3 && (()=>{
                const cLat=wlPoints.reduce((s,p)=>s+p.y,0)/wlPoints.length;
                const cLng=wlPoints.reduce((s,p)=>s+p.x,0)/wlPoints.length;
                const cp=latlngToPixel(cLat,cLng);
                const rad=flow.angle*Math.PI/180;
                const len=80;
                return <g>
                  <line x1={cp.x} y1={cp.y} x2={cp.x+len*Math.cos(rad)} y2={cp.y+len*Math.sin(rad)}
                    stroke={T.aquifer} strokeWidth={3.5} markerEnd="url(#ah)" opacity={0.85}/>
                  <text x={cp.x+len*Math.cos(rad)*1.2} y={cp.y+len*Math.sin(rad)*1.2-8}
                    fill={T.aquifer} fontSize={11} fontFamily={T.mono} fontWeight="700" textAnchor="middle"
                    style={{textShadow:"0 0 8px rgba(0,0,0,0.9)"}}>
                    {flow.deg.toFixed(0)}°N  i={flow.mag.toFixed(4)}
                  </text>
                </g>;
              })()}
              {/* Plume contours */}
              {plumeContours.map((c,ci) => c.segments.map((s,si) => {
                const a=latlngToPixel(s.a.y,s.a.x);
                const b=latlngToPixel(s.b.y,s.b.x);
                return <line key={`pl${ci}-${si}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={T.plume} strokeWidth={1+ci*0.5} opacity={0.3+ci*0.08}/>;
              }))}
            </svg>

            {/* Well markers */}
            {wells.filter(w=>w.lat!=null).map(w=>{
              const pos=latlngToPixel(w.lat,w.lng);
              const color=getWellColor(w);
              const sel=selectedId===w.id;
              const hov=hoveredId===w.id;
              const last=w.measurements?.[w.measurements.length-1];
              return (
                <div key={w.id}
                  onMouseEnter={()=>setHoveredId(w.id)} onMouseLeave={()=>setHoveredId(null)}
                  onClick={e=>{e.stopPropagation();setSelectedId(w.id);}}
                  style={{
                    position:"absolute",left:pos.x,top:pos.y,transform:"translate(-50%,-50%)",
                    pointerEvents:"auto",cursor:"pointer",zIndex:sel?20:10,
                  }}>
                  {color===T.danger&&<div style={{position:"absolute",inset:-7,borderRadius:"50%",border:`1.5px solid ${T.danger}40`,animation:"pulse 2s infinite"}}/>}
                  <div style={{
                    width:sel?20:13, height:sel?20:13, borderRadius:"50%",
                    background:`${color}35`, border:`2px solid ${color}`,
                    boxShadow:`0 0 ${sel?16:6}px ${color}50`,
                    transition:"all 0.15s",
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    <div style={{width:4,height:4,borderRadius:"50%",background:color}}/>
                  </div>
                  <div style={{
                    position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",marginTop:4,
                    fontSize:9,color:"#fff",fontFamily:T.mono,fontWeight:700,whiteSpace:"nowrap",
                    textShadow:"0 1px 4px rgba(0,0,0,.9),0 0 8px rgba(0,0,0,.7)",
                    opacity:sel||hov?1:0.6,
                  }}>
                    {w.name}
                    {last?.waterLevel!=null&&<span style={{color:T.waterLight,fontWeight:400}}> {last.waterLevel.toFixed(2)}m</span>}
                  </div>
                  {hov&&(
                    <div style={{
                      position:"absolute",bottom:"100%",left:"50%",transform:"translateX(-50%)",marginBottom:12,
                      background:"rgba(6,10,16,0.95)",border:`1px solid ${T.border}`,borderRadius:10,padding:12,
                      minWidth:210,zIndex:50,backdropFilter:"blur(8px)",pointerEvents:"none",
                    }}>
                      <div style={{fontFamily:T.mono,fontWeight:700,color,marginBottom:4,fontSize:11}}>{w.name}</div>
                      <div style={{color:T.muted,fontSize:9,fontFamily:T.mono}}>
                        {w.type} · {w.totalDepth||"?"}m · Ø{w.diameter||"?"}″ · {w.groundElevation?.toFixed(1)||"?"}m slm
                      </div>
                      {last&&<>
                        {last.waterLevel!=null&&<div style={{marginTop:5,color:T.waterLight,fontSize:10}}>💧 Livello: <strong>{last.waterLevel.toFixed(2)}m</strong> da p.c. ({last.date})</div>}
                        {last.chemistry&&Object.entries(last.chemistry).filter(([_,v])=>v>0).map(([k,v])=>{
                          const c=GW_CONTAMINANTS.find(cc=>cc.key===k);
                          return <span key={k} style={{...badge(c&&v>c.lim?T.danger:T.clean),marginRight:3,marginTop:3,fontSize:9}}>
                            {c?.label||k}:{v}{c&&v>c.lim&&" ⚠"}
                          </span>;
                        })}
                      </>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Legend */}
            <div style={{position:"absolute",bottom:10,left:10,background:"rgba(6,10,16,0.88)",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",zIndex:30,display:"flex",gap:12,fontSize:9,backdropFilter:"blur(4px)"}}>
              {[{c:T.water,l:"Piezometro"},{c:T.clean,l:"Conforme"},{c:T.danger,l:"Superamento"},{c:T.muted,l:"No dati"}].map(({c,l})=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:4,color:T.muted}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:c,border:`1.5px solid ${c}`}}/>{l}
                </span>
              ))}
              {(viewMode==="contours"||viewMode==="flow")&&<span style={{color:T.waterLight}}>— Isopiezo. ({wlPoints.length} punti)</span>}
              {viewMode==="flow"&&flow&&<span style={{color:T.aquifer}}>→ Flusso {flow.deg.toFixed(0)}°N</span>}
            </div>
          </div>
        )}
      </TileMap>

      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.7)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WELL DETAIL TAB
// ═══════════════════════════════════════════════════════════════════════
function WellTab({ well, updateWell }) {
  if(!well) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:450,color:T.muted}}>
    <div style={{fontSize:56,opacity:.1}}>💧</div><div style={{marginTop:12,fontSize:14}}>Seleziona un piezometro</div>
  </div>;

  const addMeas = () => updateWell({...well, measurements:[...(well.measurements||[]),{id:genId(),date:new Date().toISOString().split("T")[0],waterLevel:null,temperature:null,conductivity:null,pH:null,chemistry:{}}]});
  const updateMeas = (i,f,v) => { const m=[...well.measurements]; m[i]={...m[i],[f]:v===""?null:isNaN(v)?v:parseFloat(v)}; updateWell({...well,measurements:m}); };
  const updateChem = (i,k,v) => { const m=[...well.measurements]; m[i]={...m[i],chemistry:{...m[i].chemistry,[k]:v===""?null:parseFloat(v)||0}}; updateWell({...well,measurements:m}); };
  const addLith = () => { const ls=well.lithology||[]; const last=ls.length>0?ls[ls.length-1].to:0; updateWell({...well,lithology:[...ls,{from:last,to:last+1,litho:"sand",desc:""}]}); };
  const updateLith = (i,f,v) => { const ls=[...(well.lithology||[])]; ls[i]={...ls[i],[f]:f==="from"||f==="to"?parseFloat(v)||0:v}; updateWell({...well,lithology:ls}); };

  return <div>
    <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 16px",letterSpacing:-.5}}>💧 {well.name}</h2>

    {/* Properties */}
    <div style={card}>
      <span style={{...lbl,marginBottom:10,display:"block"}}>DATI COSTRUTTIVI</span>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",gap:8}}>
        <div><label style={lbl}>Tipo</label><select style={inp()} value={well.type} onChange={e=>updateWell({...well,type:e.target.value})}>
          {["piezometro","pozzo","sondaggio","pozzetto"].map(t=><option key={t}>{t}</option>)}
        </select></div>
        <div><label style={lbl}>Lat</label><input style={inp()} type="number" step="0.0001" value={well.lat??""} onChange={e=>updateWell({...well,lat:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
        <div><label style={lbl}>Lng</label><input style={inp()} type="number" step="0.0001" value={well.lng??""} onChange={e=>updateWell({...well,lng:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
        <div><label style={lbl}>Quota (m slm)</label><input style={inp()} type="number" step="0.01" value={well.groundElevation??""} onChange={e=>updateWell({...well,groundElevation:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
        <div><label style={lbl}>Prof. (m)</label><input style={inp()} type="number" step="0.5" value={well.totalDepth??""} onChange={e=>updateWell({...well,totalDepth:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
        <div><label style={lbl}>Ø (″)</label><input style={inp()} type="number" step="0.5" value={well.diameter??""} onChange={e=>updateWell({...well,diameter:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
        <div><label style={lbl}>Finestr. da (m)</label><input style={inp()} type="number" step="0.5" value={well.screenFrom??""} onChange={e=>updateWell({...well,screenFrom:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
        <div><label style={lbl}>Finestr. a (m)</label><input style={inp()} type="number" step="0.5" value={well.screenTo??""} onChange={e=>updateWell({...well,screenTo:e.target.value===""?null:parseFloat(e.target.value)})}/></div>
      </div>
    </div>

    {/* Measurements */}
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{...lbl,margin:0,fontSize:11}}>📊 CAMPAGNE ({well.measurements?.length||0})</span>
        <button onClick={addMeas} style={btn(T.water,true)}>+ Campagna</button>
      </div>
      {(well.measurements||[]).map((m,mi)=>(
        <div key={m.id||mi} style={{marginBottom:12,padding:12,background:"rgba(0,0,0,.25)",borderRadius:8,border:`1px solid ${T.border}`}}>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
            <input style={{...inp(120),fontSize:10}} type="date" value={m.date} onChange={e=>updateMeas(mi,"date",e.target.value)}/>
            <div style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:9,color:T.waterLight}}>💧</span>
              <input style={{...inp(75),fontSize:10}} type="number" step="0.01" value={m.waterLevel??""} onChange={e=>updateMeas(mi,"waterLevel",e.target.value)} placeholder="Liv. m"/>
            </div>
            <input style={{...inp(60),fontSize:10}} type="number" step="0.1" value={m.temperature??""} onChange={e=>updateMeas(mi,"temperature",e.target.value)} placeholder="T°C"/>
            <input style={{...inp(70),fontSize:10}} type="number" value={m.conductivity??""} onChange={e=>updateMeas(mi,"conductivity",e.target.value)} placeholder="EC µS/cm"/>
            <input style={{...inp(50),fontSize:10}} type="number" step="0.1" value={m.pH??""} onChange={e=>updateMeas(mi,"pH",e.target.value)} placeholder="pH"/>
            <button onClick={()=>updateWell({...well,measurements:well.measurements.filter((_,i)=>i!==mi)})} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",fontSize:14}}>×</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {GW_CONTAMINANTS.map(c=>{
              const v=m.chemistry?.[c.key]; const exc=v!=null&&v>c.lim;
              const ec=exc?T.danger:v>0?T.clean:null;
              return <div key={c.key} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 6px",borderRadius:5,background:ec?`${ec}10`:"transparent",border:`1px solid ${ec?`${ec}25`:T.border}`,fontSize:10,fontFamily:T.mono}}>
                <span style={{color:T.muted,fontSize:8}}>{c.label}:</span>
                <input type="number" step="0.1" value={v??""} placeholder="<LOQ" onChange={e=>updateChem(mi,c.key,e.target.value)}
                  style={{background:"transparent",border:"none",color:ec||T.muted,width:50,fontSize:10,fontFamily:T.mono,outline:"none",padding:0}}/>
                <span style={{fontSize:7,color:T.muted}}>{c.unit}</span>
              </div>;
            })}
          </div>
        </div>
      ))}
    </div>

    {/* Lithology */}
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{...lbl,margin:0,fontSize:11}}>🪨 STRATIGRAFIA</span>
        <button onClick={addLith} style={btn(T.warn,true)}>+ Strato</button>
      </div>
      {(well.lithology||[]).map((ly,i)=>(
        <div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
          <div style={{width:20,height:20,borderRadius:4,background:LITHOLOGIES.find(l=>l.id===ly.litho)?.color||"#808080",border:`1px solid ${T.border}`,flexShrink:0}}/>
          <input style={{...inp(50),fontSize:10,padding:"4px 6px"}} type="number" step="0.1" value={ly.from} onChange={e=>updateLith(i,"from",e.target.value)}/>
          <span style={{color:T.muted,fontSize:9}}>→</span>
          <input style={{...inp(50),fontSize:10,padding:"4px 6px"}} type="number" step="0.1" value={ly.to} onChange={e=>updateLith(i,"to",e.target.value)}/>
          <select style={{...inp(140),fontSize:10,padding:"4px 6px"}} value={ly.litho} onChange={e=>updateLith(i,"litho",e.target.value)}>
            {LITHOLOGIES.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input style={{...inp(),fontSize:10,padding:"4px 6px"}} value={ly.desc||""} onChange={e=>updateLith(i,"desc",e.target.value)} placeholder="descrizione..."/>
          <button onClick={()=>updateWell({...well,lithology:well.lithology.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:T.danger,cursor:"pointer",fontSize:14}}>×</button>
        </div>
      ))}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════
// BOREHOLE LOG (SVG export)
// ═══════════════════════════════════════════════════════════════════════
function LogTab({ well }) {
  if(!well?.lithology?.length) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:450,color:T.muted}}>
    <div style={{fontSize:48,opacity:.1}}>🪨</div><div style={{marginTop:12}}>Seleziona piezometro con stratigrafia</div>
  </div>;

  const maxD=Math.max(...well.lithology.map(l=>l.to),well.totalDepth||10);
  const svgH=Math.max(500,maxD*50+80);
  const toY=d=>50+d*((svgH-80)/maxD);
  const lastM=well.measurements?.[well.measurements.length-1];

  const exportSvg = () => {
    const el=document.getElementById("log-svg"); if(!el) return;
    const blob=new Blob([new XMLSerializer().serializeToString(el)],{type:"image/svg+xml"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`log_${well.name}.svg`; a.click();
  };

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <h3 style={{fontSize:16,fontWeight:700,margin:0}}>🪨 Log — {well.name}</h3>
      <button onClick={exportSvg} style={btn(T.water,true)}>📥 Esporta SVG</button>
    </div>
    <div style={{overflowY:"auto",maxHeight:600,background:"rgba(0,0,0,.3)",borderRadius:10,border:`1px solid ${T.border}`}}>
      <svg id="log-svg" viewBox={`0 0 400 ${svgH}`} style={{width:"100%",background:"#0a0e14"}}>
        <text x="200" y="20" fill={T.text} fontSize="12" fontFamily={T.font} fontWeight="700" textAnchor="middle">{well.name}</text>
        <text x="200" y="34" fill={T.muted} fontSize="8" fontFamily={T.mono} textAnchor="middle">Prof. {well.totalDepth||"?"}m | Ø{well.diameter}″ | {well.groundElevation?.toFixed(1)||"?"}m slm</text>
        {/* Depth scale */}
        {Array.from({length:Math.ceil(maxD)+1},(_,i)=>i).map(d=>(
          <g key={d}><line x1="15" y1={toY(d)} x2="35" y2={toY(d)} stroke={T.border} strokeWidth=".5"/>
            <text x="25" y={toY(d)+3} fill={T.muted} fontSize="8" fontFamily={T.mono} textAnchor="middle">{d}</text>
          </g>
        ))}
        {/* Litho */}
        {well.lithology.map((ly,i)=>{
          const litho=LITHOLOGIES.find(l=>l.id===ly.litho);
          const y1=toY(ly.from),y2=toY(ly.to);
          return <g key={i}>
            <rect x="40" y={y1} width="90" height={y2-y1} fill={litho?.color||"#808080"} opacity=".5" stroke="rgba(255,255,255,.08)" strokeWidth=".5"/>
            <text x="180" y={(y1+y2)/2+3} fill={T.text} fontSize="9" fontFamily={T.mono}>{litho?.name||""}{ly.desc?` — ${ly.desc}`:""}</text>
          </g>;
        })}
        {/* Casing */}
        <rect x="140" y={toY(0)} width="25" height={toY(well.totalDepth||maxD)-toY(0)} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        {well.screenFrom!=null&&well.screenTo!=null&&<rect x="140" y={toY(well.screenFrom)} width="25" height={toY(well.screenTo)-toY(well.screenFrom)} fill="none" stroke={T.water} strokeWidth="1.5" strokeDasharray="3,2"/>}
        {/* Water level */}
        {lastM?.waterLevel!=null&&<>
          <line x1="35" y1={toY(lastM.waterLevel)} x2="170" y2={toY(lastM.waterLevel)} stroke={T.waterLight} strokeWidth="1.5" strokeDasharray="6,3"/>
          <text x="175" y={toY(lastM.waterLevel)+3} fill={T.waterLight} fontSize="9" fontFamily={T.mono}>▼ {lastM.waterLevel.toFixed(2)}m</text>
          <rect x="141" y={toY(lastM.waterLevel)} width="23" height={toY(well.screenTo||well.totalDepth||maxD)-toY(lastM.waterLevel)} fill={`${T.water}15`}/>
        </>}
      </svg>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════
// GEOLOGICAL SECTION (FIXED)
// ═══════════════════════════════════════════════════════════════════════
function SectionTab({ wells, sectionIds }) {
  const sw = sectionIds.map(id=>wells.find(w=>w.id===id)).filter(w=>w&&w.lithology?.length>0);
  if(sw.length<2) return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:450,color:T.muted}}>
    <div style={{fontSize:48,opacity:.1}}>📐</div>
    <div style={{marginTop:12,fontSize:13}}>Seleziona ≥2 piezometri (con stratigrafia) usando i checkbox</div>
  </div>;

  // Compute real distances using lat/lng
  let cumDist = 0;
  const swDist = sw.map((w,i) => {
    if(i>0) {
      const prev=sw[i-1];
      const dLat=((w.lat||0)-(prev.lat||0))*111320;
      const dLng=((w.lng||0)-(prev.lng||0))*111320*Math.cos((w.lat||45)*Math.PI/180);
      cumDist += Math.sqrt(dLat*dLat+dLng*dLng);
    }
    return {...w, dist:cumDist};
  });

  const maxDist = Math.max(cumDist, 10);
  const allElevs = sw.map(w=>w.groundElevation||100);
  const allDepths = sw.map(w=>(w.groundElevation||100)-(w.totalDepth||10));
  const maxElev = Math.max(...allElevs)+1;
  const minElev = Math.min(...allDepths)-1;
  const elevRange = maxElev-minElev;

  const svgW=720, svgH=380;
  const m={t:45,r:35,b:45,l:55};
  const pW=svgW-m.l-m.r, pH=svgH-m.t-m.b;
  const toX=d=>m.l+(d/maxDist)*pW;
  const toYE=e=>m.t+((maxElev-e)/elevRange)*pH;

  // Interpolate lithology between wells
  const renderLithInterp = () => {
    const elements = [];
    for(let wi=0;wi<swDist.length-1;wi++){
      const wA=swDist[wi], wB=swDist[wi+1];
      const x1=toX(wA.dist), x2=toX(wB.dist);
      const eA=wA.groundElevation||100, eB=wB.groundElevation||100;

      (wA.lithology||[]).forEach((lyA,li)=>{
        const aTop=eA-lyA.from, aBot=eA-lyA.to;
        // Find matching layer in B
        const lyB = (wB.lithology||[]).find(l=>l.litho===lyA.litho) || (wB.lithology||[])[li];
        if(!lyB) return;
        const bTop=eB-lyB.from, bBot=eB-lyB.to;
        const litho=LITHOLOGIES.find(l=>l.id===lyA.litho);

        elements.push(
          <polygon key={`lith-${wi}-${li}`}
            points={`${x1},${toYE(aTop)} ${x2},${toYE(bTop)} ${x2},${toYE(bBot)} ${x1},${toYE(aBot)}`}
            fill={litho?.color||"#808080"} opacity={0.45} stroke="rgba(255,255,255,.06)" strokeWidth={0.5}/>
        );
      });
    }
    return elements;
  };

  // Water table line
  const wtPoints = swDist.filter(w=>{
    const last=w.measurements?.[w.measurements.length-1];
    return last?.waterLevel!=null;
  }).map(w=>{
    const last=w.measurements[w.measurements.length-1];
    const wtElev=(w.groundElevation||100)-last.waterLevel;
    return {x:toX(w.dist),y:toYE(wtElev)};
  });

  return <div>
    <h3 style={{fontSize:16,fontWeight:700,marginBottom:12}}>📐 Sezione: {sw.map(w=>w.name).join(" → ")}</h3>
    <div style={{overflowX:"auto",background:"rgba(0,0,0,.3)",borderRadius:10,border:`1px solid ${T.border}`,padding:8}}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{width:"100%",minWidth:600}}>
        <text x={svgW/2} y={20} fill={T.text} fontSize="11" fontFamily={T.font} fontWeight="700" textAnchor="middle">SEZIONE GEOLOGICA SCHEMATICA</text>
        <text x={svgW/2} y={32} fill={T.muted} fontSize="8" fontFamily={T.mono} textAnchor="middle">Distanza totale: {maxDist.toFixed(0)}m</text>

        {/* Elevation grid */}
        {Array.from({length:Math.ceil(elevRange)+2},(_,i)=>{
          const e=Math.floor(minElev)+i;
          return <g key={e}>
            <line x1={m.l} y1={toYE(e)} x2={svgW-m.r} y2={toYE(e)} stroke={T.border} strokeWidth=".3"/>
            <text x={m.l-5} y={toYE(e)+3} fill={T.muted} fontSize="7" fontFamily={T.mono} textAnchor="end">{e}</text>
          </g>;
        })}
        <text x={m.l-30} y={svgH/2} fill={T.muted} fontSize="8" fontFamily={T.mono} textAnchor="middle" transform={`rotate(-90,${m.l-30},${svgH/2})`}>m s.l.m.</text>

        {/* Ground surface */}
        <path d={`M ${swDist.map(w=>`${toX(w.dist)},${toYE(w.groundElevation||100)}`).join(" L ")}`}
          fill="none" stroke="rgba(100,180,80,.6)" strokeWidth={2.5}/>

        {/* Lithology fills */}
        {renderLithInterp()}

        {/* Water table */}
        {wtPoints.length>=2&&<>
          <path d={`M ${wtPoints.map(p=>`${p.x},${p.y}`).join(" L ")}`} fill="none" stroke={T.waterLight} strokeWidth={2} strokeDasharray="8,4"/>
          <path d={`M ${wtPoints[0].x},${wtPoints[0].y} ${wtPoints.map(p=>`L ${p.x},${p.y}`).join(" ")} L ${wtPoints[wtPoints.length-1].x},${toYE(minElev)} L ${wtPoints[0].x},${toYE(minElev)} Z`} fill={`${T.water}06`}/>
          <text x={wtPoints[wtPoints.length-1].x+5} y={wtPoints[wtPoints.length-1].y-4} fill={T.waterLight} fontSize="8" fontFamily={T.mono}>▼ falda</text>
        </>}

        {/* Well columns */}
        {swDist.map((w,i)=>{
          const x=toX(w.dist), topE=w.groundElevation||100, botE=topE-(w.totalDepth||10);
          return <g key={i}>
            <line x1={x} y1={toYE(topE)} x2={x} y2={toYE(botE)} stroke="rgba(255,255,255,.35)" strokeWidth={4}/>
            {w.screenFrom!=null&&w.screenTo!=null&&<line x1={x} y1={toYE(topE-w.screenFrom)} x2={x} y2={toYE(topE-w.screenTo)} stroke={T.water} strokeWidth={4} strokeDasharray="2,2"/>}
            <text x={x} y={toYE(topE)-10} fill="#fff" fontSize="10" fontFamily={T.mono} fontWeight="700" textAnchor="middle">{w.name}</text>
            <text x={x} y={toYE(topE)-2} fill={T.muted} fontSize="7" fontFamily={T.mono} textAnchor="middle">{topE.toFixed(1)}m</text>
            <text x={x} y={svgH-m.b+14} fill={T.muted} fontSize="7" fontFamily={T.mono} textAnchor="middle">d={w.dist.toFixed(0)}m</text>
          </g>;
        })}

        {/* Lithology legend */}
        {(()=>{
          const used=new Set(); sw.forEach(w=>(w.lithology||[]).forEach(l=>used.add(l.litho)));
          const arr=[...used]; const lx=m.l+10, ly=svgH-15;
          return arr.map((id,i)=>{
            const litho=LITHOLOGIES.find(l=>l.id===id);
            return <g key={id}>
              <rect x={lx+i*80} y={ly} width={12} height={8} fill={litho?.color||"#808080"} opacity={.6} rx={1}/>
              <text x={lx+i*80+16} y={ly+7} fill={T.muted} fontSize="7" fontFamily={T.mono}>{litho?.name||id}</text>
            </g>;
          });
        })()}
      </svg>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function HydroGeoPro() {
  const [project, setProject] = useState({ name:"", overlayImage:null, overlayFileName:"", overlayBounds:null });
  const [wells, setWells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("map");
  const [viewMode, setViewMode] = useState("points");
  const [sectionIds, setSectionIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newName, setNewName] = useState("");

  const selectedWell = wells.find(w=>w.id===selectedId);
  const allDates = useMemo(()=>{const d=new Set();wells.forEach(w=>w.measurements?.forEach(m=>{if(m.date)d.add(m.date)}));return[...d].sort();},[wells]);
  const updateWell=(uw)=>setWells(p=>p.map(w=>w.id===uw.id?uw:w));
  const addWell=()=>{if(!newName.trim())return;const nw={id:genId(),name:newName.trim(),type:"piezometro",lat:null,lng:null,groundElevation:null,totalDepth:null,diameter:2,screenFrom:null,screenTo:null,lithology:[],measurements:[]};setWells(p=>[...p,nw]);setSelectedId(nw.id);setNewName("");};

  const tabs=[{id:"map",icon:"🗺",label:"Mappa"},{id:"well",icon:"💧",label:"Piezometro"},{id:"log",icon:"🪨",label:"Log"},{id:"section",icon:"📐",label:"Sezione"}];
  const views=[{id:"points",label:"Punti"},{id:"contours",label:"Isopiezo."},{id:"flow",label:"Flusso"},{id:"plume",label:"Plume"}];

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,fontFamily:T.font}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Sidebar */}
      <div style={{width:210,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",background:"rgba(6,10,16,.8)"}}>
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${T.water},${T.aquifer})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:`0 0 12px ${T.water}30`}}>💧</div>
            <div><div style={{fontSize:15,fontWeight:800,letterSpacing:-.5}}>HydroGeo</div><div style={{fontSize:8,color:T.muted,fontFamily:T.mono}}>v2 — Real Maps</div></div>
          </div>
        </div>

        <div style={{padding:"8px 6px",display:"flex",flexDirection:"column",gap:2}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 11px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontFamily:T.font,background:activeTab===t.id?`${T.water}12`:"transparent",color:activeTab===t.id?T.water:T.muted,textAlign:"left",fontWeight:activeTab===t.id?600:400}}>{t.icon} {t.label}</button>)}
        </div>

        {activeTab==="map"&&<div style={{padding:"6px 10px",borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>
          <div style={{...lbl,marginBottom:6}}>VISUALIZZAZIONE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
            {views.map(v=><button key={v.id} onClick={()=>setViewMode(v.id)} style={{...btn(viewMode===v.id?T.water:"rgba(255,255,255,.2)",true),padding:"3px 8px",fontSize:9,background:viewMode===v.id?`${T.water}18`:"transparent"}}>{v.label}</button>)}
          </div>
          {allDates.length>0&&viewMode!=="points"&&<div style={{marginTop:6}}>
            <select style={{...inp(),fontSize:10,padding:"4px 8px"}} value={selectedDate||""} onChange={e=>setSelectedDate(e.target.value||null)}>
              <option value="">Ultima</option>{allDates.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>}
          <div style={{marginTop:6,fontSize:9,color:T.muted,fontFamily:T.mono}}>
            Min. 3 piezometri con livelli per isopiezo/flusso
          </div>
        </div>}

        <div style={{padding:"8px 10px"}}>
          <div style={{display:"flex",gap:4}}>
            <input style={{...inp(),fontSize:10,padding:"5px 8px"}} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addWell()} placeholder="Nuovo PZ..."/>
            <button onClick={addWell} style={{...btn(T.water,true),padding:"5px 8px"}}>+</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"4px 6px"}}>
          <div style={{...lbl,padding:"0 6px",marginBottom:4}}>PIEZOMETRI ({wells.length})</div>
          {wells.map(w=>{
            const last=w.measurements?.[w.measurements.length-1];
            const hasWL=last?.waterLevel!=null;
            return <div key={w.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:7,cursor:"pointer",marginBottom:1,background:selectedId===w.id?"rgba(14,165,233,.08)":"transparent"}}>
              {activeTab==="section"&&<input type="checkbox" checked={sectionIds.includes(w.id)} onChange={()=>setSectionIds(p=>p.includes(w.id)?p.filter(x=>x!==w.id):[...p,w.id])} style={{accentColor:T.water,width:12,height:12}}/>}
              <div onClick={()=>setSelectedId(w.id)} style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:hasWL?T.water:T.muted}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontFamily:T.mono,fontWeight:selectedId===w.id?700:400,color:selectedId===w.id?"#fff":T.muted}}>{w.name}</div>
                  {hasWL&&<div style={{fontSize:8,color:T.waterLight,fontFamily:T.mono}}>{last.waterLevel.toFixed(2)}m</div>}
                </div>
                {w.lat==null&&<span style={{fontSize:7,color:T.warn}}>⊘ no pos</span>}
              </div>
            </div>;
          })}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,padding:20,overflowY:"auto",maxHeight:"100vh"}}>
        {activeTab==="map"&&<MapTab project={project} setProject={setProject} wells={wells} setWells={setWells} selectedId={selectedId} setSelectedId={setSelectedId} viewMode={viewMode} selectedDate={selectedDate}/>}
        {activeTab==="well"&&<WellTab well={selectedWell} updateWell={updateWell}/>}
        {activeTab==="log"&&<LogTab well={selectedWell}/>}
        {activeTab==="section"&&<SectionTab wells={wells} sectionIds={sectionIds}/>}
      </div>
    </div>
  );
}