/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react';

  export interface ProjectionConfig {
    rotate?: [number, number, number];
    center?: [number, number];
    scale?: number;
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onMoveStart?: (event: any) => void;
    onMove?: (event: any) => void;
    onMoveEnd?: (event: any) => void;
    children?: ReactNode;
    [key: string]: any;
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (data: { geographies: any[] }) => ReactNode;
    [key: string]: any;
  }

  export interface GeographyProps {
    geography: any;
    onMouseEnter?: (event: any) => void;
    onMouseLeave?: (event: any) => void;
    onClick?: (event: any) => void;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    [key: string]: any;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<any>;
}
