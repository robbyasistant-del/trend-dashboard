'use client';

import { memo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/** ISO 3166-1 numeric → alpha-2 mapping for our tracked regions */
const ISO_NUM_TO_ALPHA2: Record<string, string> = {
  '840': 'US', '826': 'GB', '276': 'DE', '250': 'FR', '392': 'JP',
  '410': 'KR', '156': 'CN', '076': 'BR', '356': 'IN', '124': 'CA',
  '036': 'AU', '484': 'MX', '724': 'ES', '380': 'IT', '643': 'RU',
  '792': 'TR', '360': 'ID', '764': 'TH', '704': 'VN', '608': 'PH',
  '616': 'PL', '528': 'NL', '752': 'SE', '578': 'NO', '246': 'FI',
  '208': 'DK', '032': 'AR', '170': 'CO', '152': 'CL', '604': 'PE',
  '710': 'ZA', '566': 'NG', '818': 'EG', '682': 'SA', '784': 'AE',
  '702': 'SG', '458': 'MY', '158': 'TW', '344': 'HK', '376': 'IL',
  '620': 'PT', '040': 'AT', '756': 'CH', '056': 'BE', '372': 'IE',
  '554': 'NZ', '203': 'CZ', '642': 'RO', '804': 'UA', '586': 'PK',
};

export interface MapDataPoint {
  code: string;
  name: string;
  value: number;
  normalized: number;
  trend_count: number;
  avg_viral_score: number;
  app_count: number;
  forum_activity: number;
  word_velocity: number;
  total_mentions: number;
}

interface RegionMapProps {
  data: MapDataPoint[];
  selectedRegion: string | null;
  onRegionClick: (code: string, name: string) => void;
  onRegionHover: (code: string | null, name: string | null) => void;
}

function heatColor(normalized: number): string {
  if (normalized <= 0) return '#1e293b';
  if (normalized < 0.2) return '#0f3460';
  if (normalized < 0.4) return '#164e8a';
  if (normalized < 0.6) return '#0ea5e9';
  if (normalized < 0.8) return '#22d3ee';
  return '#06ffa5';
}

function RegionMap({ data, selectedRegion, onRegionClick, onRegionHover }: RegionMapProps) {
  const dataMap = new Map<string, MapDataPoint>();
  for (const d of data) {
    dataMap.set(d.code, d);
  }

  return (
    <ComposableMap
      projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
      width={800}
      height={400}
      style={{ width: '100%', height: 'auto' }}
    >
      <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={8}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const alpha2 = ISO_NUM_TO_ALPHA2[geo.id] || '';
              const d = dataMap.get(alpha2);
              const isSelected = selectedRegion === alpha2;
              const fill = d ? heatColor(d.normalized) : '#0f172a';

              return (
                <Geography
                  key={geo.rpianoKey || geo.id}
                  geography={geo}
                  onClick={() => {
                    if (alpha2) onRegionClick(alpha2, d?.name || geo.properties.name);
                  }}
                  onMouseEnter={() => {
                    if (alpha2) onRegionHover(alpha2, d?.name || geo.properties.name);
                  }}
                  onMouseLeave={() => onRegionHover(null, null)}
                  style={{
                    default: {
                      fill: isSelected ? '#f472b6' : fill,
                      stroke: isSelected ? '#f472b6' : '#334155',
                      strokeWidth: isSelected ? 1.5 : 0.5,
                      outline: 'none',
                      transition: 'fill 0.2s',
                    },
                    hover: {
                      fill: '#a78bfa',
                      stroke: '#a78bfa',
                      strokeWidth: 1,
                      outline: 'none',
                      cursor: alpha2 ? 'pointer' : 'default',
                    },
                    pressed: {
                      fill: '#c084fc',
                      outline: 'none',
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  );
}

export default memo(RegionMap);
