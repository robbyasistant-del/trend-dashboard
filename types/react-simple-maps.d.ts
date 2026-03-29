declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGAttributes } from 'react';

  export interface ProjectionConfig {
    rotate?: [number, number, number];
    center?: [number, number];
    scale?: number;
  }

  export interface ComposableMapProps extends SVGAttributes<SVGSVGElement> {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    children?: ReactNode;
  }

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onMoveStart?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (event: { coordinates: [number, number]; zoom: number; dragging: boolean }) => void;
    onMoveEnd?: (event: { coordinates: [number, number]; zoom: number }) => void;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (data: { geographies: GeographyType[] }) => ReactNode;
  }

  export interface GeographyType {
    type: string;
    id: string;
    properties: { name: string; [key: string]: unknown };
    geometry: unknown;
    rpianoKey: string;
    svgPath: string;
  }

  export interface GeographyProps extends SVGAttributes<SVGPathElement> {
    geography: GeographyType;
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
}
