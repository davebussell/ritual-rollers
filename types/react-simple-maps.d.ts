declare module 'react-simple-maps' {
  import { ReactNode, CSSProperties } from 'react'

  interface GeographyStyle {
    fill?: string
    stroke?: string
    strokeWidth?: number
    outline?: string
    cursor?: string
    opacity?: number
    transition?: string
    filter?: string
  }

  export function ComposableMap(props: {
    projection?: string
    projectionConfig?: Record<string, unknown>
    style?: CSSProperties
    children?: ReactNode
  }): JSX.Element

  export function ZoomableGroup(props: {
    center?: [number, number]
    zoom?: number
    onMoveEnd?: (pos: { zoom: number; coordinates: [number, number] }) => void
    filterZoomEvent?: (event: Event) => boolean
    children?: ReactNode
  }): JSX.Element

  export function Geographies(props: {
    geography: string
    children: (props: { geographies: GeoFeature[] }) => ReactNode
  }): JSX.Element

  export interface GeoFeature {
    rsmKey: string
    id: string | number
    properties: Record<string, unknown>
  }

  export function Marker(props: {
    coordinates: [number, number]
    children?: ReactNode
    className?: string
    style?: { default?: CSSProperties; hover?: CSSProperties; pressed?: CSSProperties }
    onClick?: (event: React.MouseEvent) => void
    onMouseEnter?: (event: React.MouseEvent) => void
    onMouseLeave?: (event: React.MouseEvent) => void
  }): JSX.Element

  export function Line(props: {
    from: [number, number]
    to: [number, number]
    stroke?: string
    strokeWidth?: number
    strokeOpacity?: number
    strokeDasharray?: string
    strokeLinecap?: string
    fill?: string
    className?: string
    style?: CSSProperties
  }): JSX.Element

  export function Geography(props: {
    geography: GeoFeature
    onClick?: (event: React.MouseEvent) => void
    onMouseEnter?: (event: React.MouseEvent) => void
    onMouseLeave?: (event: React.MouseEvent) => void
    style?: {
      default?: GeographyStyle & { transform?: string; transformOrigin?: string; transition?: string }
      hover?: GeographyStyle
      pressed?: GeographyStyle
    }
  }): JSX.Element
}
