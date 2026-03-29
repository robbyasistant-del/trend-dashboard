'use client';

import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

// ── Types ──────────────────────────────────────────────────────

interface MapDataPoint {
  code: string;
  name: string;
  value: number;
  normalized: number;
}

interface MetricInfo {
  key: string;
  label: string;
  icon: string;
  color: string;
}

interface RegionMapProps {
  mapData: MapDataPoint[];
  selectedRegion: string | null;
  currentMetricInfo: MetricInfo;
  onRegionClick: (code: string) => void;
}

// ── Constants ──────────────────────────────────────────────────

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const ALPHA2_TO_NUMERIC: Record<string, string> = {
  AF:'004',AL:'008',DZ:'012',AS:'016',AD:'020',AO:'024',AG:'028',AR:'032',AM:'051',AU:'036',
  AT:'040',AZ:'031',BS:'044',BH:'048',BD:'050',BB:'052',BY:'112',BE:'056',BZ:'084',BJ:'204',
  BT:'064',BO:'068',BA:'070',BW:'072',BR:'076',BN:'096',BG:'100',BF:'854',BI:'108',KH:'116',
  CM:'120',CA:'124',CV:'132',CF:'140',TD:'148',CL:'152',CN:'156',CO:'170',KM:'174',CD:'180',
  CG:'178',CR:'188',CI:'384',HR:'191',CU:'192',CY:'196',CZ:'203',DK:'208',DJ:'262',DM:'212',
  DO:'214',EC:'218',EG:'818',SV:'222',GQ:'226',ER:'232',EE:'233',ET:'231',FJ:'242',FI:'246',
  FR:'250',GA:'266',GM:'270',GE:'268',DE:'276',GH:'288',GR:'300',GD:'308',GT:'320',GN:'324',
  GW:'624',GY:'328',HT:'332',HN:'340',HU:'348',IS:'352',IN:'356',ID:'360',IR:'364',IQ:'368',
  IE:'372',IL:'376',IT:'380',JM:'388',JP:'392',JO:'400',KZ:'398',KE:'404',KI:'296',KP:'408',
  KR:'410',KW:'414',KG:'417',LA:'418',LV:'428',LB:'422',LS:'426',LR:'430',LY:'434',LI:'438',
  LT:'440',LU:'442',MK:'807',MG:'450',MW:'454',MY:'458',MV:'462',ML:'466',MT:'470',MH:'584',
  MR:'478',MU:'480',MX:'484',FM:'583',MD:'498',MC:'492',MN:'496',ME:'499',MA:'504',MZ:'508',
  MM:'104',NA:'516',NR:'520',NP:'524',NL:'528',NZ:'554',NI:'558',NE:'562',NG:'566',NO:'578',
  OM:'512',PK:'586',PW:'585',PA:'591',PG:'598',PY:'600',PE:'604',PH:'608',PL:'616',PT:'620',
  QA:'634',RO:'642',RU:'643',RW:'646',KN:'659',LC:'662',VC:'670',WS:'882',SM:'674',ST:'678',
  SA:'682',SN:'686',RS:'688',SC:'690',SL:'694',SG:'702',SK:'703',SI:'705',SB:'090',SO:'706',
  ZA:'710',SS:'728',ES:'724',LK:'144',SD:'729',SR:'740',SZ:'748',SE:'752',CH:'756',SY:'760',
  TW:'158',TJ:'762',TZ:'834',TH:'764',TL:'626',TG:'768',TO:'776',TT:'780',TN:'788',TR:'792',
  TM:'795',TV:'798',UG:'800',UA:'804',AE:'784',GB:'826',US:'840',UY:'858',UZ:'860',VU:'548',
  VE:'862',VN:'704',YE:'887',ZM:'894',ZW:'716',XK:'412',HK:'344',
};

const NUMERIC_TO_ALPHA2: Record<string, string> = {};
for (const [alpha2, numeric] of Object.entries(ALPHA2_TO_NUMERIC)) {
  NUMERIC_TO_ALPHA2[numeric] = alpha2;
}

// ── Helpers ────────────────────────────────────────────────────

function getHeatColor(normalized: number): string {
  if (normalized <= 0) return '#1e1e48';
  if (normalized < 0.2) return '#1a3a5c';
  if (normalized < 0.4) return '#0e7490';
  if (normalized < 0.6) return '#10b981';
  if (normalized < 0.8) return '#f59e0b';
  return '#ef4444';
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : String(n);
}

// ── Component ──────────────────────────────────────────────────

export default function RegionMap({ mapData, selectedRegion, currentMetricInfo, onRegionClick }: RegionMapProps) {
  const [hoveredGeo, setHoveredGeo] = useState<{ name: string; value: number; x: number; y: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);

  const mapLookup = useMemo(() => {
    const m = new Map<string, MapDataPoint>();
    for (const d of mapData) m.set(d.code, d);
    return m;
  }, [mapData]);

  return (
    <div className="card relative" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ height: 480 }}>
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            center={mapCenter}
            zoom={mapZoom}
            minZoom={1}
            maxZoom={8}
            onMoveEnd={(position: { coordinates: [number, number]; zoom: number }) => {
              setMapCenter(position.coordinates);
              setMapZoom(position.zoom);
            }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const numericId = geo.id;
                  const alpha2 = NUMERIC_TO_ALPHA2[numericId];
                  const dataPoint = alpha2 ? mapLookup.get(alpha2) : undefined;
                  const isSelected = alpha2 === selectedRegion;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt: React.MouseEvent) => {
                        if (dataPoint) {
                          setHoveredGeo({
                            name: dataPoint.name,
                            value: dataPoint.value,
                            x: evt.clientX,
                            y: evt.clientY,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredGeo(null)}
                      onClick={() => { if (alpha2) onRegionClick(alpha2); }}
                      style={{
                        default: {
                          fill: isSelected
                            ? '#22d3ee'
                            : dataPoint
                              ? getHeatColor(dataPoint.normalized)
                              : '#1e1e48',
                          stroke: '#2a2a5a',
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                        hover: {
                          fill: isSelected ? '#22d3ee' : dataPoint ? '#a855f7' : '#2a2a5a',
                          stroke: '#94a3b8',
                          strokeWidth: 1,
                          outline: 'none',
                          cursor: alpha2 ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-dark-800/90 backdrop-blur px-3 py-2 rounded-lg border border-dark-500">
        <span className="text-[10px] text-slate-400">Low</span>
        <div className="flex gap-0.5">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(v => (
            <div
              key={v}
              className="w-5 h-3 rounded-sm"
              style={{ background: getHeatColor(v) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-400">High</span>
        <span className="text-[10px] text-slate-500 ml-1">
          {currentMetricInfo.icon} {currentMetricInfo.label}
        </span>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => setMapZoom(z => Math.min(z * 1.5, 8))}
          className="w-8 h-8 bg-dark-800/90 backdrop-blur border border-dark-500 rounded-lg text-white hover:bg-dark-700 text-sm font-bold transition-all"
        >+</button>
        <button
          onClick={() => setMapZoom(z => Math.max(z / 1.5, 1))}
          className="w-8 h-8 bg-dark-800/90 backdrop-blur border border-dark-500 rounded-lg text-white hover:bg-dark-700 text-sm font-bold transition-all"
        >−</button>
        <button
          onClick={() => { setMapZoom(1); setMapCenter([0, 0]); }}
          className="w-8 h-8 bg-dark-800/90 backdrop-blur border border-dark-500 rounded-lg text-white hover:bg-dark-700 text-[10px] transition-all"
          title="Reset zoom"
        >⟲</button>
      </div>

      {/* Hover Tooltip */}
      {hoveredGeo && (
        <div
          className="fixed z-50 bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 shadow-xl pointer-events-none"
          style={{ left: hoveredGeo.x + 12, top: hoveredGeo.y - 40 }}
        >
          <p className="text-xs font-medium text-white">{hoveredGeo.name}</p>
          <p className="text-xs text-slate-400">
            {currentMetricInfo.label}: <span className="text-white font-mono">{formatNum(hoveredGeo.value)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
