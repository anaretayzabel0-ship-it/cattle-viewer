import React, { useState, useEffect, useRef, useMemo } from 'react';

const Icons = {
  Home: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  More: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="5" width="14" height="14" rx="1" />
      <text x="10" y="16" fontSize="11" fontFamily="sans-serif" fontWeight="bold" fill="currentColor">1</text>
      <path d="M2 8M2 16M22 8M22 16" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  Watchlist: ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#D69E2E" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Jump: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="15" y2="6" strokeLinecap="round" />
      <line x1="3" y1="12" x2="12" y2="12" strokeLinecap="round" />
      <line x1="3" y1="18" x2="15" y2="18" strokeLinecap="round" />
      <circle cx="17" cy="13" r="3" />
      <line x1="19.5" y1="15.5" x2="22" y2="18" strokeLinecap="round" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
};

export default function App() {
  const [catalogId, setCatalogId] = useState("");
  const [lots, setLots] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [activeLotId, setActiveLotId] = useState(null);
  
  const [currentModal, setCurrentModal] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing catalog...");

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [geoData, setGeoData] = useState({ ip: 'Loading...', country: '...', city: '...' });
  const sessionStartTime = useRef(Date.now());
  const lotTimeTrackers = useRef({});
  const lastActiveLot = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    
    if (!id) {
      const pathParts = window.location.pathname.split('/');
      id = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
    }

    if (!id || id === 'index.html' || id === '') {
      id = "gTes4U"; 
    }

    setCatalogId(id);
    loadCatalogData(id);
    fetchGeoIP();
    loadWatchlist();
  }, []);

  const loadCatalogData = async (id) => {
    try {
      setLoadingStatus("Fetching sale manifest details...");
      const response = await fetch(`/sale/${id}.json`);
      if (!response.ok) throw new Error(`Could not locate sale/${id}.json layout catalog map.`);
      
      const manifest = await response.json();
      setLots(manifest.lots || []);

      setLoadingStatus("Downloading catalog PDF...");
      const pdfUrl = `/sale/${id}.pdf`;
      const loadedPdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
      setPdfDoc(loadedPdf);

      setLoadingStatus("");
      if (manifest.lots && manifest.lots.length > 0) {
        setActiveLotId(manifest.lots[0].id);
      }
    } catch (err) {
      setLoadingStatus(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const loadWatchlist = () => {
    const saved = localStorage.getItem('qcow_watchlist');
    if (saved) setWatchlist(JSON.parse(saved));
  };

  const toggleWatchlist = (id) => {
    const updated = watchlist.includes(id) 
      ? watchlist.filter(item => item !== id) 
      : [...watchlist, id];
    setWatchlist(updated);
    localStorage.setItem('qcow_watchlist', JSON.stringify(updated));
  };

  const fetchGeoIP = () => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setGeoData({ ip: data.ip, country: data.country_name, city: data.city });
      })
      .catch(() => {
        setGeoData({ ip: 'Dynamic Proxy', country: 'United States', city: 'Dallas' });
      });
  };

  useEffect(() => {
    const now = Date.now();
    if (lastActiveLot.current && lotTimeTrackers.current[lastActiveLot.current]) {
      const duration = now - lotTimeTrackers.current[lastActiveLot.current].start;
      lotTimeTrackers.current[lastActiveLot.current].accumulated += duration;
      console.log(`[Telemetry Log] Spent ${Math.round(lotTimeTrackers.current[lastActiveLot.current].accumulated / 1000)}s viewing ${lastActiveLot.current}`);
    }

    if (activeLotId) {
      if (!lotTimeTrackers.current[activeLotId]) {
        lotTimeTrackers.current[activeLotId] = { start: now, accumulated: 0 };
      } else {
        lotTimeTrackers.current[activeLotId].start = now;
      }
    }
    lastActiveLot.current = activeLotId;
  }, [activeLotId]);

  const activeLot = useMemo(() => lots.find(l => l.id === activeLotId), [activeLotId, lots]);

  const renderPDFPageAndSpotlight = async () => {
    if (!pdfDoc || !canvasRef.current || !overlayCanvasRef.current) return;

    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const oCtx = overlay.getContext('2d');

    const targetPageNum = activeLot ? activeLot.page : 1;
    const page = await pdfDoc.getPage(targetPageNum);

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const viewportWidth = containerRef.current.clientWidth || 390;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const dynamicScale = viewportWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale: dynamicScale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    overlay.width = viewport.width;
    overlay.height = viewport.height;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    try {
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      
      oCtx.clearRect(0, 0, overlay.width, overlay.height);

      if (activeLot) {
        const { x, y, width, height } = activeLot.coordinates;

        const pdfRect = [x, y, x + width, y + height];
        const viewportRect = viewport.convertToViewportRectangle(pdfRect);

        const screenX = viewportRect[0];
        const screenY = Math.min(viewportRect[1], viewportRect[3]);
        const screenW = Math.abs(viewportRect[2] - viewportRect[0]);
        const screenH = Math.abs(viewportRect[3] - viewportRect[1]);

        oCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        oCtx.fillRect(0, 0, overlay.width, overlay.height);

        oCtx.clearRect(screenX, screenY, screenW, screenH);

        const containerHeight = containerRef.current.clientHeight;
        const scrollCenterTarget = screenY + (screenH / 2) - (containerHeight / 2);
        containerRef.current.scrollTo({
          top: Math.max(0, scrollCenterTarget),
          behavior: 'smooth'
        });
      }
    } catch (err) {
      if (err.name !== 'Heading' && err.name !== 'RenderingCancelledException') {
        console.error("Rendering Error: ", err);
      }
    }
  };

  useEffect(() => {
    renderPDFPageAndSpotlight();
  }, [pdfDoc, activeLotId]);

  useEffect(() => {
    const handleResize = () => renderPDFPageAndSpotlight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, activeLotId]);

  const handlePrevLot = () => {
    const idx = lots.findIndex(l => l.id === activeLotId);
    if (idx > 0) setActiveLotId(lots[idx - 1].id);
  };

  const handleNextLot = () => {
    const idx = lots.findIndex(l => l.id === activeLotId);
    if (idx < lots.length - 1) setActiveLotId(lots[idx + 1].id);
  };

  return (
    <div className="flex flex-col h-screen max-w-[430px] mx-auto bg-slate-900 overflow-hidden relative">
      <div className="flex justify-between items-center bg-black/60 px-3 py-1 text-[10px] text-gray-400 border-b border-gray-800 z-10">
        <span>Client: {geoData.city}, {geoData.country}</span>
        <span>File: {catalogId}.pdf</span>
      </div>

      {loadingStatus && (
        <div className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-[#3D6D95] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium">{loadingStatus}</p>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-slate-700">
        <div className="relative w-full">
          <canvas ref={canvasRef} className="block w-full" />
          <canvas 
            ref={overlayCanvasRef} 
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: activeLotId ? 'auto' : 'none' }}
            onClick={() => setActiveLotId(null)}
          />
        </div>

        {activeLot && (
          <div className="absolute bottom-6 left-0 right-0 px-4 flex items-center justify-between z-30 pointer-events-none">
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrevLot(); }}
              disabled={lots.findIndex(l => l.id === activeLotId) === 0}
              className="w-10 h-10 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-800 shadow-lg pointer-events-auto active:scale-95 transition-all disabled:opacity-40"
            >
              <Icons.ChevronLeft />
            </button>

            <div className="flex-1 bg-white border border-slate-200 rounded-lg py-3 px-4 mx-3 shadow-2xl flex justify-between items-center pointer-events-auto">
              <span className="text-lg font-bold text-slate-800">{activeLot.label}</span>
              <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(activeLot.id); }} className="p-1">
                <Icons.Watchlist filled={watchlist.includes(activeLot.id)} />
              </button>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); handleNextLot(); }}
              disabled={lots.findIndex(l => l.id === activeLotId) === lots.length - 1}
              className="w-10 h-10 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-800 shadow-lg pointer-events-auto active:scale-95 transition-all disabled:opacity-40"
            >
              <Icons.ChevronRight />
            </button>
          </div>
        )}
      </div>

      <div className="h-16 bg-white border-t border-slate-200 grid grid-cols-4 z-40">
        <button onClick={() => window.location.href = 'https://qcow.us/sales.html'} className="flex flex-col items-center justify-center text-slate-700 active:bg-slate-100">
          <Icons.Home />
          <span className="text-[11px] mt-1 font-medium">Home</span>
        </button>

        <button 
          onClick={() => { setCarouselIndex(0); setCurrentModal('more'); }}
          className={`flex flex-col items-center justify-center transition-colors ${currentModal === 'more' ? 'bg-[#3D6D95] text-white' : 'text-slate-700 active:bg-slate-100'}`}
        >
          <Icons.More />
          <span className="text-[11px] mt-1 font-medium">More</span>
        </button>

        <button 
          onClick={() => setCurrentModal('watchlist')}
          className={`flex flex-col items-center justify-center transition-colors ${currentModal === 'watchlist' ? 'bg-[#3D6D95] text-white' : 'text-slate-700 active:bg-slate-100'}`}
        >
          <Icons.Watchlist filled={currentModal === 'watchlist'} />
          <span className="text-[11px] mt-1 font-medium">Watchlist</span>
        </button>

        <button 
          onClick={() => setCurrentModal('jump')}
          className={`flex flex-col items-center justify-center transition-colors ${currentModal === 'jump' ? 'bg-[#3D6D95] text-white' : 'text-slate-700 active:bg-slate-100'}`}
        >
          <Icons.Jump />
          <span className="text-[11px] mt-1 font-medium">Jump</span>
        </button>
      </div>

      {currentModal === 'jump' && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCurrentModal(null)}>
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[320px] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">Select Lot Mapping</h3>
              <button onClick={() => setCurrentModal(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Close</button>
            </div>
            <div className="h-[180px] overflow-y-auto relative snap-y-mandatory hide-scrollbar py-[60px]">
              {lots.map((lot) => {
                const isActive = activeLotId === lot.id;
                return (
                  <div 
                    key={lot.id}
                    onClick={() => {
                      setActiveLotId(lot.id);
                      setCurrentModal(null);
                    }}
                    className={`h-[60px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 ${
                      isActive ? 'text-xl font-bold text-slate-900 border-t border-b border-slate-200' : 'text-sm font-normal text-slate-400'
                    }`}
                  >
                    {lot.label.toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {currentModal === 'watchlist' && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCurrentModal(null)}>
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[340px] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Your watchlist</h3>
              <button onClick={() => setCurrentModal(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Close</button>
            </div>
            {watchlist.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No lots marked yet.</div>
            ) : (
              <div className="flex flex-col max-h-[300px] overflow-y-auto">
                {watchlist.map(id => {
                  const item = lots.find(l => l.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} onClick={() => { setActiveLotId(id); setCurrentModal(null); }} className="flex justify-between items-center py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                      <span className="text-base font-semibold text-slate-800">{item.label}</span>
                      <span className="text-slate-400" onClick={(e) => { e.stopPropagation(); toggleWatchlist(id); }}>
                        <Icons.Watchlist filled={true} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {currentModal === 'more' && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCurrentModal(null)}>
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[360px] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">{activeLot ? `${activeLot.label} media` : 'Media Assets'}</h3>
              <button onClick={() => setCurrentModal(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Close</button>
            </div>
            {!activeLotId ? (
              <div className="py-8 text-center text-slate-400 text-sm">Select a lot first to view media catalog files.</div>
            ) : !activeLot.media || activeLot.media.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No media assets found for this lot.</div>
            ) : (
              <div className="relative flex items-center justify-center">
                <button onClick={() => setCarouselIndex(p => Math.max(0, p - 1))} disabled={carouselIndex === 0} className="absolute -left-3 z-50 bg-white border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-lg disabled:opacity-30">
                  <Icons.ChevronLeft />
                </button>
                <div className="w-full aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  {activeLot.media[carouselIndex].type === 'image' ? (
                    <img src={activeLot.media[carouselIndex].url} alt="Lot View" className="w-full h-full object-cover" />
                  ) : (
                    <video src={activeLot.media[carouselIndex].url} controls autoPlay muted className="w-full h-full object-cover" />
                  )}
                </div>
                <button onClick={() => setCarouselIndex(p => Math.max(0, Math.min(activeLot.media.length - 1, p + 1)))} disabled={carouselIndex === activeLot.media.length - 1} className="absolute -right-3 z-50 bg-white border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-lg disabled:opacity-30">
                  <Icons.ChevronRight />
                </button>
              </div>
            )}
            {activeLot && activeLot.media && activeLot.media.length > 0 && (
              <div className="text-center mt-3 text-xs text-slate-400">{carouselIndex + 1} of {activeLot.media.length} media assets</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}